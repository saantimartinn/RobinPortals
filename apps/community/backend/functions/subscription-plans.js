/**
 * GET /api/subscription/plans
 * Devuelve los importes de las nuevas suscripciones Revolut. El primer ciclo
 * de la cuenta promocional se muestra a 1 €; después rige el precio normal.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed } = require('../lib/http');
const subLib = require('../lib/subscription');
const { hasOneEuroFirstPayment } = require('../../../../packages/payments/first-payment-promo.cjs');

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
  let oneEuro = false;
  try {
    const sb = getSupabase();
    const { data: u } = await sb.from('subscribers').select('email, stripe_subscription_id, discount_code, discount_percent').eq('id', session.uid).single();
    if (u && Number(u.discount_percent) > 0) discount = { code: u.discount_code || null, percent_off: Number(u.discount_percent) };
    if (u && !u.stripe_subscription_id && hasOneEuroFirstPayment(u.email)) {
      const { data: previous } = await sb.from('revolut_subscriptions').select('promo_used').eq('subscriber_id', session.uid).maybeSingle();
      oneEuro = !previous?.promo_used;
    }
  } catch (_) {}

  const base = subLib.listAvailablePlans(); // importes base centralizados en subscription.js
  const decorate = (plans) => (oneEuro ? plans.map((p) => ({ ...p, first_payment_amount: 1 })) : withDiscount(plans, discount));
  return json({ plans: decorate(base), discount });
};
