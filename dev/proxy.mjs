import http from 'node:http';
import net from 'node:net';

const publicPorts = [8888, 8889, 8890, 8891, 8892];
const stripHeaders = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
]);

for (const port of publicPorts) {
  const upstreamPort = port + 1000;
  const server = http.createServer((request, response) => {
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: upstreamPort,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host: `localhost:${upstreamPort}` },
    }, (result) => {
      const headers = { ...result.headers };
      for (const name of stripHeaders) delete headers[name];
      response.writeHead(result.statusCode || 502, headers);
      result.pipe(response);
    });
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain' });
      response.end(`Local app on port ${upstreamPort} is starting.`);
    });
    request.pipe(upstream);
  });

  server.on('upgrade', (request, client, head) => {
    const upstream = net.connect(upstreamPort, '127.0.0.1', () => {
      const headers = { ...request.headers, host: `localhost:${upstreamPort}` };
      const lines = [`${request.method} ${request.url} HTTP/${request.httpVersion}`];
      for (const [name, value] of Object.entries(headers)) {
        lines.push(`${name}: ${Array.isArray(value) ? value.join(', ') : value}`);
      }
      upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on('error', () => client.destroy());
    client.on('error', () => upstream.destroy());
  });

  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`[local proxy] http://127.0.0.1:${port} -> ${upstreamPort} (CSP removed for dev)\n`);
  });
}
