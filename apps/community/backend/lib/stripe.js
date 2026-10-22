/**
 * Helper compartido de Stripe (pasarela de pago real, modo Checkout hosted).
 * Env vars (todas opcionales — si faltan el código degrada con gracia):
 *   - STRIPE_SECRET_KEY      (sk_test_... / sk_live_...)
 *   - STRIPE_WEBHOOK_SECRET  (whsec_... · sólo para stripe-webhook)
 * Sin STRIPE_SECRET_KEY, isConfigured()=false y los endpoints devuelven
 * `stripe_not_configured` (el frontend puede seguir mostrando el mock).
 */
let _stripe = null;

function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('stripe_not_configured');
  if (!_stripe) {
    const Stripe = require('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

// URL base del despliegue (para success_url / cancel_url).
function getBaseUrl(event) {
  const forwardedHost = event && event.headers && (event.headers['x-forwarded-host'] || event.headers['X-Forwarded-Host']);
  if (forwardedHost) return `https://${forwardedHost}`;
  const envUrl = process.env.PUBLIC_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, '');
  const h = (event && event.headers) || {};
  const proto = h['x-forwarded-proto'] || 'https';
  const host = h['host'] || h['Host'];
  return host ? `${proto}://${host}` : '';
}

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

async function fulfillCheckout(sb, session) {
  if (session.metadata?.kind !== 'subscription' || session.mode !== 'subscription') {
    return { ok: false, reason: 'unsupported_checkout' };
  }
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
    return { ok: false, reason: 'not_paid' };
  }
  const { fulfillSubscriptionCheckout } = require('./subscription');
  return fulfillSubscriptionCheckout(sb, session);
}

module.exports = { isConfigured, getStripe, getBaseUrl, toCents, fulfillCheckout };
