/**
 * POST /api/stripe/webhook  (público · sin auth ni verifyOrigin)
 * Verifica la firma con STRIPE_WEBHOOK_SECRET y cumple el pago de forma
 * autoritativa al recibir checkout.session.completed.
 *
 * Requiere el body crudo (Stripe firma el payload exacto). Netlify entrega
 * event.body como string; lo usamos tal cual (o lo decodificamos si viene b64).
 */
const { getSupabase } = require('../lib/supabase');
const stripeLib = require('../lib/stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!stripeLib.isConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 503, body: 'stripe_not_configured' };
  }

  const stripe = stripeLib.getStripe();
  const h = event.headers || {};
  const sig = h['stripe-signature'] || h['Stripe-Signature'];
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : (event.body || '');

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('stripe-webhook signature error:', e && e.message);
    return { statusCode: 400, body: `Webhook Error: ${e && e.message}` };
  }

  try {
    const sb = getSupabase();

    if (evt.type === 'checkout.session.completed' ||
        evt.type === 'checkout.session.async_payment_succeeded') {
      const cs = evt.data.object;
      const result = await stripeLib.fulfillCheckout(sb, cs);
      try {
        await sb.from('webhook_log').insert({
          source: 'stripe',
          payload: { type: evt.type, session_id: cs.id, metadata: cs.metadata || {} },
          result: result && result.ok ? 'ok' : 'skipped',
          message: 'stripe checkout fulfillment',
        });
      } catch (_) {}
    }

    // The Robin Plan (suscripciones): mantiene subscribers.subscription_status /
    // current_period_end / cancel_at_period_end sincronizados con Stripe.
    if (evt.type === 'customer.subscription.updated' ||
        evt.type === 'customer.subscription.deleted') {
      const { syncSubscriptionFromStripeObject } = require('../lib/subscription');
      const sub = evt.data.object;
      const result = await syncSubscriptionFromStripeObject(sb, sub);
      try {
        await sb.from('webhook_log').insert({
          source: 'stripe',
          payload: { type: evt.type, subscription_id: sub.id, status: sub.status },
          result: result && result.ok ? 'ok' : 'skipped',
          message: 'subscription sync',
        });
      } catch (_) {}
    }

    if (evt.type === 'invoice.payment_failed') {
      const inv = evt.data.object;
      if (inv.subscription) {
        const { error } = await sb.from('subscribers').update({ subscription_status: 'past_due' }).eq('stripe_subscription_id', inv.subscription);
        if (error) throw error;
        try {
          await sb.from('webhook_log').insert({
            source: 'stripe',
            payload: { type: evt.type, subscription_id: inv.subscription },
            result: 'ok',
            message: 'invoice payment failed → past_due',
          });
        } catch (_) {}
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    // Stripe debe reintentar los fallos transitorios de persistencia.
    console.error('stripe-webhook handler error:', e && e.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'webhook_failed' }) };
  }
};
