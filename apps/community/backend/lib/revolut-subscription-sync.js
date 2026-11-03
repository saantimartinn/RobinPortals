const revolut = require('./revolut-subscriptions');
const billing = require('./subscription-billing');

function localStatus(state) {
  return ({ active: 'active', pending: 'none', overdue: 'past_due', cancelled: 'canceled', finished: 'canceled' })[state] || 'none';
}

async function syncOne(sb, record) {
  if (!record.subscription_id) return { ok: false, reason: 'subscription_missing' };
  const sub = await revolut.retrieveSubscription(record.subscription_id);
  const cycleList = await revolut.listCycles(record.subscription_id);
  const cycles = cycleList.cycles || [];
  const current = cycles.find((cycle) => cycle.id === sub.current_cycle_id) || cycles[0];
  let paid = Boolean(record.promo_used);
  const invoices = [];
  const orderIds = cycles.map((cycle) => cycle.order_id).filter(Boolean);
  let invoiced = new Set();
  if (orderIds.length) {
    const { data: rows, error } = await sb.from('revolut_subscription_invoices')
      .select('order_id,billing_status').in('order_id', orderIds);
    if (error) throw error;
    invoiced = new Set((rows || []).filter((row) => row.billing_status === 'invoiced').map((row) => row.order_id));
  }
  for (const cycle of cycles) {
    if (!cycle.order_id) continue;
    if (invoiced.has(cycle.order_id)) { paid = true; continue; }
    const order = await revolut.retrieveOrder(cycle.order_id);
    if (order.state !== 'completed') continue;
    paid = true;
    invoices.push(await billing.processRevolutOrder(sb, record, cycle, order));
  }
  const paidThrough = current?.end_date && new Date(current.end_date).getTime() > Date.now();
  const status = sub.state === 'cancelled' && paidThrough ? 'active' : localStatus(sub.state);
  const { error: updateError } = await sb.from('revolut_subscriptions').update({
    state: sub.state, promo_used: Boolean(record.promo_used || paid),
    updated_at: new Date().toISOString(),
  }).eq('subscriber_id', record.subscriber_id).eq('subscription_id', record.subscription_id);
  if (updateError) throw updateError;
  const { error: userError } = await sb.from('subscribers').update({
    is_subscriber: status === 'active', subscription_status: status,
    subscription_plan: record.plan_key,
    subscription_started_at: sub.start_date || null,
    current_period_end: current?.end_date || null,
    cancel_at_period_end: sub.state === 'cancelled' && Boolean(paidThrough),
  }).eq('id', record.subscriber_id);
  if (userError) throw userError;
  return { ok: true, status, invoices };
}

module.exports = { syncOne, localStatus };
