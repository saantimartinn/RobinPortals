/** Hosted Revolut checkout for a new recurring Robin Community subscription. */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { getBaseUrl } = require('../lib/stripe');
const subLib = require('../lib/subscription');
const revolut = require('../lib/revolut-subscriptions');
const { syncOne } = require('../lib/revolut-subscription-sync');
const { hasOneEuroFirstPayment } = require('../../../../packages/payments/first-payment-promo.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!revolut.configured()) return json({ error: 'revolut_not_configured' }, { statusCode: 503 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const planKey = body.plan === 'annual' ? 'annual' : 'monthly';
  const billing = {
    name: String(body.billing?.name || '').trim(),
    taxId: String(body.billing?.taxId || '').trim().toUpperCase(),
    country: String(body.billing?.country || '').trim(),
    address: String(body.billing?.address || '').trim(),
  };
  if (!billing.name || !billing.taxId || !billing.country || !billing.address) {
    return json({ error: 'billing_details_required' }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    const { data: u, error: userError } = await sb.from('subscribers')
      .select('id,email,nombre,apellidos,stripe_subscription_id,subscription_status,discount_percent,discount_duration_months')
      .eq('id', session.uid).single();
    if (userError || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (['active', 'trialing'].includes(u.subscription_status)) return json({ error: 'already_subscribed' }, { statusCode: 409 });
    if (u.stripe_subscription_id && !['canceled', 'none'].includes(u.subscription_status)) {
      return json({ error: 'existing_stripe_subscription' }, { statusCode: 409 });
    }

    const { data: old, error: oldError } = await sb.from('revolut_subscriptions').select('*').eq('subscriber_id', u.id).maybeSingle();
    if (oldError) throw oldError;
    if (old && old.state === 'active') {
      await syncOne(sb, old);
      return json({ already_subscribed: true });
    }
    if (old && old.state === 'pending' && old.setup_order_id) {
      const order = await revolut.retrieveOrder(old.setup_order_id);
      if (order.state === 'completed') {
        await syncOne(sb, old);
        return json({ already_subscribed: true });
      }
      if (order.checkout_url && !['failed', 'cancelled', 'completed'].includes(order.state)) {
        return json({ url: order.checkout_url, id: old.subscription_id });
      }
    }

    const oneEuro = hasOneEuroFirstPayment(u.email) && !old?.promo_used && !u.stripe_subscription_id;
    const percent = oneEuro ? 0 : Number(u.discount_percent) || 0;
    const months = Number(u.discount_duration_months);
    const cycles = percent > 0 && Number.isFinite(months) && months > 0
      ? (planKey === 'annual' ? Math.ceil(months / 12) : Math.round(months)) : null;
    const amountMinor = Math.round(subLib.planAmount(planKey) * 100);
    const spec = revolut.planSpec(planKey, amountMinor, { oneEuro, percent, cycles });
    const variationId = await revolut.variationFor(spec);
    const customerId = old?.customer_id || (await revolut.createCustomer(u)).id;
    if (!customerId) throw new Error('revolut_customer_id_missing');

    const base = getBaseUrl(event);
    const subscription = await revolut.createSubscription({
      variationId, customerId, subscriberId: u.id,
      idempotencyKey: `${u.id}-${old?.subscription_id || 'initial'}`,
      redirectUrl: `${base}/therobinplan/?revolut_subscription=return`,
    });
    if (!subscription.id || !subscription.setup_order_id) throw new Error('revolut_subscription_response_invalid');
    const { error: saveError } = await sb.from('revolut_subscriptions').upsert({
      subscriber_id: u.id, customer_id: customerId, subscription_id: subscription.id,
      setup_order_id: subscription.setup_order_id, plan_key: planKey,
      billing_info: billing,
      promo_used: Boolean(old?.promo_used), state: subscription.state || 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subscriber_id' });
    if (saveError) throw saveError;
    const order = await revolut.retrieveOrder(subscription.setup_order_id);
    if (!order.checkout_url) throw new Error('revolut_checkout_url_missing');
    return json({ url: order.checkout_url, id: subscription.id, provider: 'revolut' });
  } catch (error) {
    console.error('subscription-checkout error', error);
    return serverError(error);
  }
};
