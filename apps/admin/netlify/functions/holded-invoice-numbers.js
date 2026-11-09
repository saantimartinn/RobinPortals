// Revisa los borradores de Holded y refleja su número cuando se emite la factura.
const { runInApp } = require('../../../../site/app-env.cjs');
const { holdedFetch } = require('../../lib/holded/client');
const { listSalesInvoices } = require('../../lib/holded/analytics');
const { syncIssuedInvoiceNumbers } = require('../../lib/google-sheets');
const { json } = require('../../lib/http');

async function allRows(sb, table, columns) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await sb.from(table).select(columns)
      .order('id', { ascending: true }).range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

async function invoiceEntries(sb) {
  const [users, payments] = await Promise.all([
    allRows(sb, 'users', 'id,lead_id,contract_data,dni_numero'),
    allRows(sb, 'payments', 'user_id,installment,amount,paid_at,created_at,payment_data'),
  ]);
  const leads = new Map((users || []).map((user) => [user.id, user]));
  return (payments || []).flatMap((payment) => {
    const invoiceId = payment.payment_data?.holded_invoice_id;
    const user = leads.get(payment.user_id);
    const leadId = user?.lead_id;
    if (!invoiceId || !leadId || payment.payment_data?.annulled_at) return [];
    return [{ leadId, installment: payment.installment, invoiceId,
      amount: payment.amount, date: payment.paid_at || payment.created_at,
      fiscalCode: user.contract_data?.cliente?.dni || user.dni_numero || '',
    }];
  });
}

async function contactCode(contactId) {
  const key = String(process.env.HOLDED_API_KEY || '').trim();
  if (!key || !contactId) return '';
  const response = await fetch('https://api.holded.com/api/invoicing/v1/contacts/' + encodeURIComponent(contactId),
    { headers: { key, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return '';
  const contact = await response.json();
  return String(contact.code || contact.vatnumber || '').replace(/\W/g, '').toUpperCase();
}

async function findInvoiceByEvidence(entry) {
  const center = Date.parse(entry.date || '');
  if (!Number.isFinite(center) || !Number.isFinite(Number(entry.amount))) throw new Error('holded_invoice_missing_evidence');
  const day = 86400000;
  const invoices = await listSalesInvoices({
    start: Math.floor((center - 3 * day) / 1000),
    end: Math.ceil((center + 3 * day) / 1000),
    signal: AbortSignal.timeout(8000),
  });
  const sameAmount = invoices.filter((invoice) =>
    Math.abs(Number(invoice.total) - Number(entry.amount)) < 0.01);
  const referenced = sameAmount.filter((invoice) =>
    String(invoice.notes || '').includes('Cliente Robin ' + entry.leadId));
  if (referenced.length === 1) return referenced[0];
  if (referenced.length > 1) throw new Error('holded_invoice_ambiguous_reference');
  const code = String(entry.fiscalCode || '').replace(/\W/g, '').toUpperCase();
  if (!code) throw new Error('holded_invoice_no_fiscal_match');
  const matched = [];
  for (const invoice of sameAmount) {
    if (await contactCode(invoice.contact) === code) matched.push(invoice);
  }
  if (matched.length !== 1) throw new Error(matched.length ? 'holded_invoice_ambiguous_fiscal_match' : 'holded_invoice_not_found_by_date');
  return matched[0];
}

async function readInvoice(entry) {
  try {
    return await holdedFetch('/invoices/' + encodeURIComponent(entry.invoiceId),
      { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    if (error?.message !== 'holded_http_404') throw error;
    return findInvoiceByEvidence(entry);
  }
}

exports.handler = async (event) => {
  let scheduled = false;
  try { scheduled = Boolean(event?.body && JSON.parse(event.body).next_run); } catch (_) {}
  if (!scheduled) return json({ error: 'not_found' }, { statusCode: 404 });
  try {
    const { getSupabase } = require('../../lib/supabase');
    const [portal, junior] = await Promise.all([
      invoiceEntries(getSupabase()),
      invoiceEntries(runInApp('robinjr', () => require('../../../robinjr/lib/supabase').getSupabase())),
    ]);
    const result = await syncIssuedInvoiceNumbers([...portal, ...junior], readInvoice);
    if (result.failed) console.warn('[sheets] Holded invoice sync partial failure', result);
    return json({ ok: result.failed === 0, ...result });
  } catch (error) {
    console.error('[sheets] Holded invoice sync failed:', error?.message || error);
    return json({ ok: false, error: 'holded_invoice_sync_failed' }, { statusCode: 500 });
  }
};

module.exports.invoiceEntries = invoiceEntries;
module.exports.findInvoiceByEvidence = findInvoiceByEvidence;
// Es la única tarea nueva del sitio unificado: no duplica una tarea antigua.
module.exports.alwaysRun = true;
