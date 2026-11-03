const API_VERSION = '2026-08-17';

function configured() {
  const base = String(process.env.REVOLUT_API_BASE || '');
  return Boolean(process.env.REVOLUT_MERCHANT_SECRET_KEY && base &&
    !(process.env.CONTEXT === 'production' && base.includes('sandbox-merchant.revolut.com')));
}

async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  if (!configured()) throw new Error('revolut_not_configured');
  const res = await fetch(String(process.env.REVOLUT_API_BASE).replace(/\/$/, '') + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.REVOLUT_MERCHANT_SECRET_KEY}`,
      'Revolut-Api-Version': API_VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`revolut_http_${res.status}`);
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

function planSpec(planKey, amountMinor, discount = {}) {
  const interval = planKey === 'annual' ? 'P1Y' : 'P1M';
  const rawPercent = Number(discount.percent);
  const percent = Number.isFinite(rawPercent) && rawPercent >= 0 && rawPercent <= 100 ? rawPercent : 0;
  const introMinor = discount.oneEuro ? 100 : Math.max(0, Math.round(amountMinor * (1 - percent / 100)));
  const cycles = discount.oneEuro ? 1 : discount.cycles;
  const phases = [];
  if (introMinor !== amountMinor) {
    phases.push({ ordinal: 1, cycle_duration: interval, amount: introMinor, currency: 'EUR', ...(cycles ? { cycle_count: cycles } : {}) });
  }
  if (!phases.length || cycles) phases.push({ ordinal: phases.length + 1, cycle_duration: interval, amount: amountMinor, currency: 'EUR' });
  const name = `The Robin Plan v1 · ${planKey} · ${amountMinor} · ${introMinor} · ${cycles || 'forever'}`;
  return { name, variations: [{ phases }] };
}

async function variationFor(spec) {
  let pageToken = null;
  let existing = null;
  do {
    const params = new URLSearchParams({ limit: '100' });
    if (pageToken) params.set('page_token', pageToken);
    const list = await request(`/api/subscription-plans?${params}`);
    existing = (list.subscription_plans || []).find((plan) => plan.name === spec.name);
    pageToken = list.next_page_token;
  } while (!existing && pageToken);
  const plan = existing ? await request(`/api/subscription-plans/${existing.id}`)
    : await request('/api/subscription-plans', { method: 'POST', body: spec });
  const variationId = plan.variations && plan.variations[0] && plan.variations[0].id;
  if (!variationId) throw new Error('revolut_plan_variation_missing');
  return variationId;
}

async function createCustomer(subscriber) {
  return request('/api/customers', { method: 'POST', body: {
    email: subscriber.email,
    full_name: [subscriber.nombre, subscriber.apellidos].filter(Boolean).join(' ') || subscriber.email,
  } });
}

function createSubscription({ variationId, customerId, subscriberId, redirectUrl, idempotencyKey }) {
  return request('/api/subscriptions', { method: 'POST', idempotencyKey: idempotencyKey || subscriberId, body: {
    plan_variation_id: variationId,
    customer_id: customerId,
    external_reference: subscriberId,
    setup_order_redirect_url: redirectUrl,
  } });
}

function retrieveSubscription(id) { return request(`/api/subscriptions/${encodeURIComponent(id)}`); }
function retrieveOrder(id) { return request(`/api/orders/${encodeURIComponent(id)}`); }
function listCycles(id) { return request(`/api/subscriptions/${encodeURIComponent(id)}/cycles`); }
function cancelSubscription(id) { return request(`/api/subscriptions/${encodeURIComponent(id)}/cancel`, { method: 'POST' }); }

module.exports = { configured, request, planSpec, variationFor, createCustomer, createSubscription, retrieveSubscription, retrieveOrder, listCycles, cancelSubscription };
