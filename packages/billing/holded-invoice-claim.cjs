// A unique database row reserves each payment before any Holded POST.
async function claimInvoice(sb, paymentId) {
  const { error } = await sb.from('holded_invoice_claims').insert({ payment_id: paymentId });
  if (!error) return { claimed: true };
  if (error.code !== '23505') throw error;

  const { data, error: readError } = await sb.from('holded_invoice_claims')
    .select('invoice_data').eq('payment_id', paymentId).single();
  if (readError) throw readError;
  return { claimed: false, invoiceData: data.invoice_data };
}

async function recordInvoice(sb, paymentId, invoiceData) {
  const { data, error } = await sb.from('holded_invoice_claims')
    .update({ invoice_data: invoiceData, completed_at: new Date().toISOString() })
    .eq('payment_id', paymentId).is('invoice_data', null).select('payment_id');
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error('holded_invoice_claim_not_found');
}

async function applyInvoice(sb, paymentId, invoiceData) {
  const { data, error } = await sb.rpc('apply_holded_invoice_data', {
    p_payment_id: paymentId,
    p_invoice_data: invoiceData,
  });
  if (error) throw error;
  if (data !== true) throw new Error('holded_invoice_payment_not_found');
}

module.exports = { claimInvoice, recordInvoice, applyInvoice };
