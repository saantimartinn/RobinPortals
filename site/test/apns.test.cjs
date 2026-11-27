const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const TEST_KEY = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const { buildApnsRequest } = require('../../packages/notifications/apns.cjs');

test('APNs alert contains safe routing data and signed headers', () => {
  const request = buildApnsRequest({ token: 'a'.repeat(64), title: 'Aviso', body: 'Abre Robin', product: 'portal', notificationId: '123' }, {
    teamId: 'TEAM123', keyId: 'KEY123', privateKey: TEST_KEY,
    bundleId: 'com.projectrobin.ios', environment: 'sandbox', now: 1700000000,
  });
  assert.equal(request.host, 'api.sandbox.push.apple.com');
  assert.equal(request.path, '/3/device/' + 'a'.repeat(64));
  assert.equal(request.headers['apns-topic'], 'com.projectrobin.ios');
  assert.equal(request.headers['apns-push-type'], 'alert');
  assert.match(request.headers.authorization, /^bearer /);
  assert.deepEqual(JSON.parse(request.body), { aps: { alert: { title: 'Aviso', body: 'Abre Robin' }, sound: 'default' }, product: 'portal', notificationId: '123' });
});

test('APNs rejects invalid tokens and product routes', () => {
  assert.throws(() => buildApnsRequest({ token: 'bad', title: 'x', body: 'y', product: 'portal', notificationId: '1' }, {}));
  assert.throws(() => buildApnsRequest({ token: 'a'.repeat(64), title: 'x', body: 'y', product: '../admin', notificationId: '1' }, {}));
});
