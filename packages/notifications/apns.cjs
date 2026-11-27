const { createPrivateKey, sign } = require('node:crypto');
const http2 = require('node:http2');

const PRODUCTS = new Set(['portal', 'robinjr', 'community']);
const base64url = value => Buffer.from(value).toString('base64url');

function buildApnsRequest(message, config = {}) {
  const { token, title, body, product, notificationId } = message;
  if (!/^[a-f0-9]{32,512}$/i.test(String(token || '')) || String(token).length % 2 || !PRODUCTS.has(product) || !notificationId) throw new Error('invalid_push_target');
  const { teamId, keyId, privateKey, bundleId, environment = 'production', now = Math.floor(Date.now() / 1000) } = config;
  if (!teamId || !keyId || !privateKey || !bundleId) throw new Error('apns_not_configured');
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const input = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(input), { key: createPrivateKey(privateKey), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return {
    host: environment === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com',
    path: `/3/device/${token}`,
    headers: { authorization: `bearer ${input}.${signature}`, 'apns-topic': bundleId, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' },
    body: JSON.stringify({ aps: { alert: { title: String(title || '').slice(0, 100), body: String(body || '').slice(0, 180) }, sound: 'default' }, product, notificationId: String(notificationId) }),
  };
}

async function sendPush(message, config = {}) {
  const request = buildApnsRequest(message, {
    teamId: process.env.APNS_TEAM_ID,
    keyId: process.env.APNS_KEY_ID,
    privateKey: process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    bundleId: process.env.APNS_BUNDLE_ID || 'com.projectrobin.ios',
    environment: process.env.APNS_ENVIRONMENT || 'production',
    ...config,
  });
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${request.host}`);
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      client.close();
      if (error) reject(error); else resolve(result);
    };
    client.on('error', finish);
    const stream = client.request({ ':method': 'POST', ':path': request.path, ...request.headers });
    let status = 0;
    let response = '';
    stream.setEncoding('utf8');
    stream.on('response', headers => { status = Number(headers[':status'] || 0); });
    stream.on('data', chunk => { response += chunk; });
    stream.on('error', finish);
    stream.on('end', () => finish(null, { accepted: status === 200, status, reason: (() => { try { return JSON.parse(response).reason || null; } catch (_) { return null; } })() }));
    stream.end(request.body);
    setTimeout(() => finish(new Error('apns_timeout')), 15000).unref();
  });
}

module.exports = { buildApnsRequest, sendPush };
