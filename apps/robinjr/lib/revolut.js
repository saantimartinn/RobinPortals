/** Revolut Merchant API adapter for the hosted checkout flow. */
const crypto = require('crypto');
const { fulfillPayment } = require('./payment-fulfill');

const DEFAULT_API_VERSION = '2026-03-12';

function secretKey() {
  return String(process.env.REVOLUT_MERCHANT_SECRET_KEY || '').trim();
}

function apiBase() {
  return String(process.env.REVOLUT_API_BASE || '').trim().replace(/\/$/, '');
}

function apiVersion() {
  return String(process.env.REVOLUT_API_VERSION || DEFAULT_API_VERSION).trim();
}

function isSandbox() {
  return apiBase() === 'https://sandbox-merchant.revolut.com';
}

function isAllowedEnvironment() {
  return !(isSandbox() && String(process.env.CONTEXT || '').toLowerCase() === 'production');
}

function isConfigured() {
  return !!(secretKey() && apiBase() && isAllowedEnvironment());
}

function getBaseUrl(event) {
  const headers = (event && event.headers) || {};
  const forwardedHost = headers['x-forwarded-host'] || headers['X-Forwarded-Host'];
  if (forwardedHost) return `https://${forwardedHost}`;
  const envUrl = process.env.PUBLIC_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, '');
  const proto = headers['x-forwarded-proto'] || 'https';
  const host = headers.host || headers.Host;
  return host ? `${proto}://${host}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  if (!isConfigured()) throw new Error('revolut_not_configured');
  const response = await fetch(apiBase() + path, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Revolut-Api-Version': apiVersion(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`revolut_http_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function createOrder(input) {
  const body = {
    amount: Number(input.amountMinor),
    currency: String(input.currency || 'EUR').toUpperCase(),
    capture_mode: 'automatic',
    description: String(input.description || 'Project Robin').slice(0, 240),
    redirect_url: input.redirectUrl,
    merchant_order_data: { reference: String(input.attemptId) },
    metadata: { robin_attempt_id: String(input.attemptId), kind: String(input.kind) },
  };
  if (input.email) body.customer = { email: String(input.email) };
  const order = await request('/api/orders', { method: 'POST', body });
  if (!order || !order.id || !order.checkout_url) throw new Error('revolut_invalid_order_response');
  return order;
}

function retrieveOrder(orderId) {
  return request('/api/orders/' + encodeURIComponent(orderId));
}

function timestampMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return n > 1e12 ? n : n * 1000;
}

function verifyWebhookSignature(rawBody, timestamp, signatureHeader, signingSecret) {
  const secret = String(signingSecret || process.env.REVOLUT_WEBHOOK_SIGNING_SECRET || '').trim();
  if (!secret || !timestamp || !signatureHeader) return false;
  if (Math.abs(Date.now() - timestampMs(timestamp)) > 5 * 60 * 1000) return false;
  const payload = `v1.${timestamp}.${rawBody}`;
  const expected = 'v1=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return String(signatureHeader).split(',').some((candidate) => {
    const actual = candidate.trim();
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  });
}

async function fulfillOrder(sb, order, attempt) {
  if (!order || order.state !== 'completed') return { ok: false, reason: 'not_completed' };
  if (!attempt || String(attempt.provider_order_id) !== String(order.id)) {
    return { ok: false, reason: 'order_mismatch' };
  }
  if (Number(order.amount) !== Number(attempt.amount_minor)) return { ok: false, reason: 'amount_mismatch' };
  if (String(order.currency).toUpperCase() !== String(attempt.currency).toUpperCase()) {
    return { ok: false, reason: 'currency_mismatch' };
  }
  const payment = Array.isArray(order.payments)
    ? order.payments.find((item) => item.state === 'completed' || item.state === 'captured')
    : null;
  return fulfillPayment(sb, {
    kind: attempt.kind,
    userId: attempt.user_id,
    paymentId: attempt.payment_id,
    amountMinor: attempt.amount_minor,
    currency: attempt.currency,
    paymentData: {
      method: 'card',
      processor: 'revolut',
      simulated: isSandbox(),
      revolut_order_id: order.id,
      revolut_payment_id: payment && payment.id || null,
    },
  });
}

module.exports = {
  DEFAULT_API_VERSION,
  isConfigured,
  isSandbox,
  isAllowedEnvironment,
  getBaseUrl,
  createOrder,
  retrieveOrder,
  verifyWebhookSignature,
  fulfillOrder,
};
