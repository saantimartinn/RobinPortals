// Server-side payment attempts helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const crypto = require('crypto');

const VALID_KINDS = new Set(['onboarding', 'installment']);
const VALID_PROVIDERS = new Set(['revolut']);

async function createAttempt(sb, { userId, paymentId = null, kind, provider, amountMinor, currency }) {
  if (!userId || !VALID_KINDS.has(kind) || !VALID_PROVIDERS.has(provider)) {
    throw new Error('invalid_payment_attempt');
  }
  const id = crypto.randomUUID();
  const row = {
    id,
    user_id: String(userId),
    payment_id: paymentId ? String(paymentId) : null,
    kind,
    provider,
    amount_minor: Number(amountMinor),
    currency: String(currency || 'EUR').toUpperCase(),
    status: 'created',
  };
  const { data, error } = await sb.from('payment_attempts').insert(row).select().single();
  if (error) throw error;
  return data || row;
}

async function attachProviderOrder(sb, attemptId, order) {
  const patch = {
    provider_order_id: String(order.id),
    checkout_url: order.checkout_url || null,
    status: String(order.state || 'pending'),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from('payment_attempts')
    .update(patch).eq('id', attemptId).select().single();
  if (error) throw error;
  return data;
}

async function getAttemptForUser(sb, attemptId, userId) {
  const { data, error } = await sb.from('payment_attempts').select('*')
    .eq('id', attemptId).eq('user_id', String(userId)).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getAttemptByProviderOrder(sb, provider, orderId) {
  const { data, error } = await sb.from('payment_attempts').select('*')
    .eq('provider', provider).eq('provider_order_id', String(orderId)).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function markAttempt(sb, attemptId, status, extra = {}) {
  const patch = { status, updated_at: new Date().toISOString(), ...extra };
  if (status === 'completed' && !patch.completed_at) patch.completed_at = new Date().toISOString();
  const { error } = await sb.from('payment_attempts').update(patch).eq('id', attemptId);
  if (error) throw error;
  return { ok: true };
}

module.exports = {
  createAttempt,
  attachProviderOrder,
  getAttemptForUser,
  getAttemptByProviderOrder,
  markAttempt,
};
