// Local front door for the shared apps site: forwards everything to
// `netlify dev` and adapts its production headers to plain-http localhost.
import http from 'node:http';
import net from 'node:net';

const PORT = Number(process.env.ROBIN_PROXY_PORT || 8888);
const APPS_PORT = Number(process.env.ROBIN_APPS_PORT || 8889);

// The CSP asks browsers to upgrade to https, which a plain-http local server cannot serve.
function localHeaders(headers) {
  const out = { ...headers };
  for (const name of ['content-security-policy', 'content-security-policy-report-only']) {
    if (out[name]) out[name] = String(out[name]).replace(/;?\s*upgrade-insecure-requests/g, '');
  }
  delete out['strict-transport-security'];
  return out;
}

const server = http.createServer((request, response) => {
  const port = APPS_PORT;
  const upstream = http.request({
    hostname: '127.0.0.1',
    port,
    path: request.url,
    method: request.method,
    headers: request.headers,
  }, (result) => {
    response.writeHead(result.statusCode || 502, localHeaders(result.headers));
    result.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`El servidor local del puerto ${port} todavía está arrancando.`);
  });
  request.pipe(upstream);
});

// Websockets (hot reload) go to the apps site too.
server.on('upgrade', (request, client, head) => {
  const upstream = net.connect(APPS_PORT, '127.0.0.1', () => {
    const lines = [`${request.method} ${request.url} HTTP/${request.httpVersion}`];
    for (let i = 0; i < request.rawHeaders.length; i += 2) lines.push(`${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}`);
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  upstream.on('error', () => client.destroy());
  client.on('error', () => upstream.destroy());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] http://localhost:${PORT} -> apps :${APPS_PORT}`);
});
