/**
 * lib/subscription.js — The Robin Plan (portal de suscriptores)
 * Config de planes + helpers de cumplimiento (fulfillment) para Stripe Billing.
 *
 * Precio fijo: 49,99 €/mes o 299,99 €/año. Por defecto se cobra con
 * price_data ad-hoc en el propio Checkout (no requiere crear nada en Stripe
 * Dashboard primero). Si más adelante se quiere permitir cambiar de plan
 * (mensual ⇄ anual) desde el Stripe Customer Portal, hay que crear ahí 2
 * Price reales con estos mismos importes y configurar:
 *   - STRIPE_PRICE_MONTHLY  (price_... de un Price recurrente mensual)
 *   - STRIPE_PRICE_ANNUAL   (price_... de un Price recurrente anual)
 * Con esas env vars puestas, el checkout usa el Price real de Stripe en vez
 * del price_data ad-hoc (necesario para que el Customer Portal permita
 * cambiar de plan). Sin ellas, el checkout sigue funcionando igual con el
 * importe fijo de abajo.
 */

const CURRENCY = 'EUR';

const PLANS = {
  monthly: { key: 'monthly', label: 'Plan Mensual', interval: 'mes', stripeInterval: 'month', envVar: 'STRIPE_PRICE_MONTHLY', amount: 49.99 },
  annual: { key: 'annual', label: 'Plan Anual', interval: 'año', stripeInterval: 'year', envVar: 'STRIPE_PRICE_ANNUAL', amount: 299.99 },
};

function planPriceId(planKey) {
  const p = PLANS[planKey];
  if (!p) return null;
  return process.env[p.envVar] || null;
}

function planAmount(planKey) {
  const p = PLANS[planKey];
  return p ? p.amount : null;
}

function planInterval(planKey) {
  const p = PLANS[planKey];
  return p ? p.stripeInterval : null;
}

// Siempre "configurado": si hay Price ID real lo usamos, si no, price_data
// ad-hoc con el importe fijo. planKey es opcional (compat).
function isConfigured() {
  return true;
}

function listAvailablePlans() {
  return Object.values(PLANS)
    .map((p) => ({ key: p.key, label: p.label, interval: p.interval, amount: p.amount, currency: CURRENCY, available: true }));
}

/**
 * Marca al usuario como suscriptor activo tras un checkout.session.completed
 * de tipo 'subscription'. Idempotente (comprueba subscription_id).
 */
async function fulfillSubscriptionCheckout(sb, session) {
  const md = session.metadata || {};
  const userId = md.user_id;
  if (!userId) return { ok: false, reason: 'no_user_id' };
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  const { data: u, error: e1 } = await sb.from('subscribers').select('id, stripe_subscription_id').eq('id', userId).single();
  if (e1) throw e1;
  if (!u) return { ok: false, reason: 'user_not_found' };
  if (u.stripe_subscription_id === subscriptionId) return { ok: true, already: true };

  const update = {
    is_subscriber: true,
    subscription_plan: md.plan || null,
    subscription_status: 'active',
    subscription_started_at: new Date().toISOString(),
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    cancel_at_period_end: false,
  };
  const { error: e2 } = await sb.from('subscribers').update(update).eq('id', userId);
  if (e2) throw e2;
  return { ok: true, user_id: userId };
}

// Mapea el status de un objeto Subscription de Stripe a nuestro vocabulario.
function mapStripeStatus(stripeStatus) {
  const map = {
    active: 'active', trialing: 'trialing', past_due: 'past_due',
    canceled: 'canceled', unpaid: 'past_due', paused: 'paused', incomplete: 'past_due',
    incomplete_expired: 'canceled',
  };
  return map[stripeStatus] || stripeStatus || 'none';
}

/**
 * Sincroniza el estado local a partir de un objeto Subscription de Stripe
 * (usado por el webhook en customer.subscription.updated / .deleted).
 */
async function syncSubscriptionFromStripeObject(sb, subscription) {
  const subId = subscription.id;
  const { data: rows, error } = await sb.from('subscribers').select('id').eq('stripe_subscription_id', subId).limit(1);
  if (error) throw error;
  if (!rows || !rows[0]) return { ok: false, reason: 'user_not_found' };
  const userId = rows[0].id;
  const status = mapStripeStatus(subscription.status);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  const { error: e2 } = await sb.from('subscribers').update({
    subscription_status: status,
    current_period_end: periodEnd,
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  }).eq('id', userId);
  if (e2) throw e2;
  return { ok: true, user_id: userId, status };
}

module.exports = {
  PLANS, CURRENCY, planPriceId, planAmount, planInterval, isConfigured, listAvailablePlans,
  fulfillSubscriptionCheckout, syncSubscriptionFromStripeObject, mapStripeStatus,
};
