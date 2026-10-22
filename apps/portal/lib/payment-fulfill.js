// Server-side payment fulfill helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const { invoiceNumber } = require('./payments');

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function assertFulfilled(result) {
  if (result && result.ok) return result;
  const reason = (result && result.reason) || 'unknown';
  const error = new Error(`payment_fulfillment_failed:${reason}`);
  error.code = 'payment_fulfillment_failed';
  error.reason = reason;
  throw error;
}

async function fulfillInstallment(sb, input) {
  const { paymentId, userId, amountMinor, currency, paymentData } = input;
  if (!paymentId) return { ok: false, reason: 'no_payment_id' };
  const { data: payment, error } = await sb.from('payments').select('*').eq('id', paymentId).single();
  if (error || !payment) return { ok: false, reason: 'payment_not_found' };
  if (String(payment.user_id) !== String(userId)) return { ok: false, reason: 'payment_owner_mismatch' };
  if (toMinorUnits(payment.amount) !== Number(amountMinor)) return { ok: false, reason: 'amount_mismatch' };
  if (String(payment.currency || 'EUR').toUpperCase() !== String(currency || 'EUR').toUpperCase()) {
    return { ok: false, reason: 'currency_mismatch' };
  }
  if (payment.status === 'paid') return { ok: true, already: true, installment: payment.installment };

  const nowIso = new Date().toISOString();
  let user = { id: payment.user_id };
  try {
    const { data } = await sb.from('users').select('id, lead_id').eq('id', payment.user_id).single();
    if (data) user = data;
  } catch (error) { console.warn('[optional_operation_failed]', error && error.message); }

  const { data: flipped, error: updateError } = await sb.from('payments').update({
    status: 'paid',
    paid_at: nowIso,
    invoice_number: payment.invoice_number || invoiceNumber(user, payment),
    payment_data: { ...(payment.payment_data || {}), ...(paymentData || {}), at: nowIso },
  }).eq('id', payment.id).neq('status', 'paid').select('id');
  if (updateError) throw updateError;
  if (!flipped || !flipped.length) return { ok: true, already: true, installment: payment.installment };

  await require('./integration-sync').syncHoldedInvoice(sb, payment.id);
  await require('./integration-sync').syncGoogleSheets(sb, payment.user_id);
  return { ok: true, installment: payment.installment };
}

async function fulfillPayment(sb, input) {
  if (input.kind === 'installment') return fulfillInstallment(sb, input);
  if (input.kind !== 'onboarding') return { ok: false, reason: 'unknown_kind' };
  return require('./onboarding-fulfill').markOnboardingPaid(sb, input.userId, {
    ...(input.paymentData || {}),
    amount: Number(input.amountMinor) / 100,
    currency: String(input.currency || 'EUR').toUpperCase(),
    at: new Date().toISOString(),
  });
}

module.exports = { assertFulfilled, fulfillInstallment, fulfillPayment, toMinorUnits };
