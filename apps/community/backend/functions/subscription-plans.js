/**
 * GET /api/subscription/plans
 * Devuelve los planes de The Robin Plan con precio fijo: 49,99 €/mes o
 * 299,99 €/año (lib/subscription.js#PLANS). Si hay un Price ID real de
 * Stripe configurado (STRIPE_PRICE_MONTHLY/ANNUAL), se usa el importe real
 * leído de ahí en su lugar (por si se ha cambiado desde el Dashboard).
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError } = require('../lib/http');
const stripeLib = require('../lib/stripe');
const subLib = require('../lib/subscription');

function withDiscount(plans, discount) {
  if (!discount || !(discount.percent_off > 0)) return plans;
  const f = 1 - discount.percent_off / 100;
  return plans.map((p) => ({ ...p, discount_percent: discount.percent_off, discounted_amount: Math.round(p.amount * f * 100) / 100 }));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  // Descuento aplicado a este suscriptor (codigo usado al alta)
  let discount = null;
  try {
    const sb = getSupabase();
    const { data: u } = await sb.from('subscribers').select('discount_code, discount_percent').eq('id', session.uid).single();
    if (u && Number(u.discount_percent) > 0) discount = { code: u.discount_code || null, percent_off: Number(u.discount_percent) };
  } catch (_) {}

  const base = subLib.listAvailablePlans(); // importes base centralizados en subscription.js
  if (!stripeLib.isConfigured()) return json({ plans: withDiscount(base, discount), discount });

  try {
    const stripe = stripeLib.getStripe();
    const plans = await Promise.all(base.map(async (p) => {
      const priceId = subLib.planPriceId(p.key);
      if (!priceId) return p; // sin Price ID real → mantiene el importe fijo
      try {
        const price = await stripe.prices.retrieve(priceId);
        return {
          ...p,
          amount: price.unit_amount != null ? price.unit_amount / 100 : p.amount,
          currency: (price.currency || 'eur').toUpperCase(),
        };
      } catch (_) {
        return p;
      }
    }));
    return json({ plans: withDiscount(plans, discount), discount });
  } catch (e) {
    console.error('subscription-plans error', e);
    return serverError(e);
  }
};
