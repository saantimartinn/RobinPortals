// Automated checks for revolut test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const revolut = require('../lib/revolut');

function signature(raw, timestamp, secret) {
  const digest = crypto.createHmac('sha256', secret)
    .update(`v1.${timestamp}.${raw}`)
    .digest('hex');
  return `v1=${digest}`;
}

test('verifica una firma Revolut válida sobre el body crudo', () => {
  const raw = '{"event":"ORDER_COMPLETED","order_id":"order-1"}';
  const timestamp = String(Date.now());
  const secret = 'wsk_test_secret';
  assert.equal(revolut.verifyWebhookSignature(raw, timestamp, signature(raw, timestamp, secret), secret), true);
});

test('acepta cualquiera de las firmas durante una rotación de secreto', () => {
  const raw = '{"event":"ORDER_COMPLETED"}';
  const timestamp = String(Date.now());
  const secret = 'wsk_current';
  const header = `v1=${'0'.repeat(64)},${signature(raw, timestamp, secret)}`;
  assert.equal(revolut.verifyWebhookSignature(raw, timestamp, header, secret), true);
});

test('rechaza firmas con más de cinco minutos o con body alterado', () => {
  const raw = '{"event":"ORDER_COMPLETED"}';
  const timestamp = String(Date.now() - 6 * 60 * 1000);
  const secret = 'wsk_test_secret';
  assert.equal(revolut.verifyWebhookSignature(raw, timestamp, signature(raw, timestamp, secret), secret), false);

  const current = String(Date.now());
  assert.equal(revolut.verifyWebhookSignature(raw + ' ', current, signature(raw, current, secret), secret), false);
});

test('crea una orden alojada sin exponer la clave al frontend', async () => {
  const previous = {
    key: process.env.REVOLUT_MERCHANT_SECRET_KEY,
    base: process.env.REVOLUT_API_BASE,
    version: process.env.REVOLUT_API_VERSION,
    fetch: global.fetch,
  };
  process.env.REVOLUT_MERCHANT_SECRET_KEY = 'sk_sandbox';
  process.env.REVOLUT_API_BASE = 'https://sandbox-merchant.revolut.com';
  process.env.REVOLUT_API_VERSION = '2026-03-12';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ id: 'order-1', state: 'pending', checkout_url: 'https://checkout.example/1' }) };
  };

  try {
    const order = await revolut.createOrder({
      amountMinor: 66633,
      currency: 'EUR',
      description: 'Primera cuota',
      email: 'cliente@example.com',
      attemptId: 'attempt-1',
      kind: 'onboarding',
      redirectUrl: 'https://portal.example/portal/?payment_attempt=attempt-1',
    });
    assert.equal(order.id, 'order-1');
    assert.equal(request.url, 'https://sandbox-merchant.revolut.com/api/orders');
    assert.equal(request.options.headers.Authorization, 'Bearer sk_sandbox');
    assert.equal(request.options.headers['Revolut-Api-Version'], '2026-03-12');
    const body = JSON.parse(request.options.body);
    assert.equal(body.amount, 66633);
    assert.equal(body.merchant_order_data.reference, 'attempt-1');
  } finally {
    global.fetch = previous.fetch;
    restoreEnv('REVOLUT_MERCHANT_SECRET_KEY', previous.key);
    restoreEnv('REVOLUT_API_BASE', previous.base);
    restoreEnv('REVOLUT_API_VERSION', previous.version);
  }
});

test('impide usar Sandbox dentro del contexto Production de Netlify', () => {
  const previous = {
    key: process.env.REVOLUT_MERCHANT_SECRET_KEY,
    base: process.env.REVOLUT_API_BASE,
    context: process.env.CONTEXT,
  };
  process.env.REVOLUT_MERCHANT_SECRET_KEY = 'sk_sandbox';
  process.env.REVOLUT_API_BASE = 'https://sandbox-merchant.revolut.com';
  process.env.CONTEXT = 'production';
  try {
    assert.equal(revolut.isSandbox(), true);
    assert.equal(revolut.isAllowedEnvironment(), false);
    assert.equal(revolut.isConfigured(), false);
  } finally {
    restoreEnv('REVOLUT_MERCHANT_SECRET_KEY', previous.key);
    restoreEnv('REVOLUT_API_BASE', previous.base);
    restoreEnv('CONTEXT', previous.context);
  }
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
