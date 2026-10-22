/**
 * POST /api/subscription/portal
 * Crea una sesión del Stripe Billing Portal (hosted) para que el suscriptor
 * gestione: método de pago, facturas/recibos, upgrade/downgrade de plan,
 * pausar o cancelar la suscripción. Requiere haber configurado el "Customer
 * portal" en Stripe Dashboard (Settings → Billing → Customer portal) con los
 * Products/Prices de STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL habilitados
 * para actualización de plan.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../lib/http');
const stripeLib = require('../lib/stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!stripeLib.isConfigured()) return json({ error: 'stripe_not_configured' }, { statusCode: 503 });

  try {
    const sb = getSupabase();
    const { data: u, error: e1 } = await sb.from('subscribers').select('id, stripe_customer_id').eq('id', session.uid).single();
    if (e1 || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!u.stripe_customer_id) return json({ error: 'no_stripe_customer' }, { statusCode: 409 });

    const stripe = stripeLib.getStripe();
    const base = stripeLib.getBaseUrl(event);
    const ps = await stripe.billingPortal.sessions.create({
      customer: u.stripe_customer_id,
      return_url: `${base}/portal/?active=suscripcion`,
    });

    return json({ url: ps.url });
  } catch (e) {
    console.error('subscription-portal error', e);
    return serverError(e);
  }
};
