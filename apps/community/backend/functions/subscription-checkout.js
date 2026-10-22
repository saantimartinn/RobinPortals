/**
 * POST /api/subscription/checkout  Body: { plan: 'monthly' | 'annual' }
 * Crea una Stripe Checkout Session en modo 'subscription' para The Robin Plan.
 * El cobro es RECURRENTE automático (mode:'subscription' + price recurring):
 * Stripe cobra cada periodo por su cuenta y el stripe-webhook sincroniza estado.
 *
 * Descuento: el cupón se crea con la duración fijada por el admin en el código:
 *   discount_duration_months = 1..12 -> 'repeating' esos meses
 *   discount_duration_months = null   -> 'forever' (ilimitado)
 * Confirmación autoritativa vía stripe-webhook (checkout.session.completed).
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const stripeLib = require('../lib/stripe');
const subLib = require('../lib/subscription');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!stripeLib.isConfigured()) return json({ error: 'stripe_not_configured' }, { statusCode: 503 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const planKey = body.plan === 'annual' ? 'annual' : 'monthly';
  const priceId = subLib.planPriceId(planKey);
  const amount = subLib.planAmount(planKey);

  try {
    const sb = getSupabase();
    const { data: u, error: e1 } = await sb
      .from('subscribers')
      .select('id, email, nombre, apellidos, stripe_customer_id, subscription_status, discount_code, discount_percent, discount_duration_months')
      .eq('id', session.uid)
      .single();
    if (e1 || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (u.subscription_status === 'active' || u.subscription_status === 'trialing') {
      return json({ error: 'already_subscribed' }, { statusCode: 409 });
    }

    const stripe = stripeLib.getStripe();
    const base = stripeLib.getBaseUrl(event);
    const nombre = [u.nombre, u.apellidos].filter(Boolean).join(' ') || (u.email || '');

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: subLib.CURRENCY.toLowerCase(),
            unit_amount: stripeLib.toCents(amount),
            recurring: { interval: subLib.planInterval(planKey) },
            product_data: { name: `The Robin Plan · ${planKey === 'annual' ? 'Anual' : 'Mensual'}` },
          },
        };

    // Descuento por codigo (porcentaje) aplicado al alta -> cupon Stripe.
    // La duración la decide el admin en el código (discount_duration_months).
    let discounts;
    const pct = Number(u.discount_percent);
    if (pct > 0 && pct <= 100) {
      try {
        const dur = Number(u.discount_duration_months);
        const durationCfg = (Number.isFinite(dur) && dur >= 1 && dur <= 12)
          ? { duration: 'repeating', duration_in_months: Math.round(dur) }
          : { duration: 'forever' };
        const durLabel = durationCfg.duration === 'repeating' ? ` · ${durationCfg.duration_in_months}m` : '';
        const coupon = await stripe.coupons.create({
          percent_off: pct,
          ...durationCfg,
          name: `The Robin Plan${u.discount_code ? ' · ' + u.discount_code : ''} (-${pct}%${durLabel})`,
        });
        discounts = [{ coupon: coupon.id }];
      } catch (err) { console.error('discount coupon error', err); }
    }

    const cs = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [lineItem],
      discounts,
      customer: u.stripe_customer_id || undefined,
      customer_email: u.stripe_customer_id ? undefined : (u.email || undefined),
      client_reference_id: String(u.id),
      success_url: `${base}/therobinplan/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/therobinplan/?sub=cancel`,
      metadata: { kind: 'subscription', user_id: String(u.id), plan: planKey, nombre },
      subscription_data: { metadata: { user_id: String(u.id), plan: planKey } },
    });

    return json({ url: cs.url, id: cs.id });
  } catch (e) {
    console.error('subscription-checkout error', e);
    return serverError(e);
  }
};
