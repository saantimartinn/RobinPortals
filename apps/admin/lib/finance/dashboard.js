// Server-side dashboard helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const { addDays, fromUnix, round, ymd, amount } = require("./utils");
const { periodBounds, makeBuckets, bucketMap, inBounds, bucketKey } = require("./periods");
const { validInvoice, invoiceAmounts, invoiceStatus } = require("./invoices");
const { CONTRACTED_EXCLUDED_CLIENT_IDS, isContractedUserIncluded, contractedAmountForUser } = require("./contracted");
const { categorizeExpenses } = require("./expenses");
const { applicationPlanForUser } = require("../../shared/financial-config.cjs");
const { calendarDate } = require('../../../../packages/time/madrid.cjs');

function formatRange(bounds) {
  const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${fmt.format(bounds.start).replace('.', '')} – ${fmt.format(addDays(bounds.end, -1)).replace('.', '')}`;
}
async function buildFinanceDashboard({ period, bounds: suppliedBounds, invoices, users, payments, ledgerEntries, treasuryHistory }) {
  const bounds = suppliedBounds || periodBounds(period);
  const buckets = makeBuckets(bounds);
  const byBucket = bucketMap(buckets);
  const periodInvoices = invoices.filter(validInvoice).filter((invoice) => inBounds(fromUnix(invoice.date), bounds));
  // Nota: desplazamos el periodo comparable un año para que cada cubo enfrente la misma fecha del ejercicio anterior.
  const previousInvoices = invoices.filter(validInvoice).filter((invoice) => {
    const date = fromUnix(invoice.date);
    return date && bounds.previousStart && bounds.previousEnd && inBounds(date, { start: bounds.previousStart, end: bounds.previousEnd });
  });

  periodInvoices.forEach((invoice) => {
    const date = fromUnix(invoice.date);
    const bucket = byBucket.get(bucketKey(date, bounds.granularity));
    if (!bucket) return;
    const values = invoiceAmounts(invoice);
    bucket.sales += values.subtotal;
    bucket.collected += values.collected;
    bucket.pending += values.pending;
  });
  previousInvoices.forEach((invoice) => {
    const local = calendarDate(fromUnix(invoice.date));
    const shifted = new Date(Date.UTC(local.getUTCFullYear() + 1, local.getUTCMonth(), local.getUTCDate()));
    const bucket = byBucket.get(bucketKey(shifted, bounds.granularity));
    if (bucket) bucket.previousSales += invoiceAmounts(invoice).subtotal;
  });

  const paymentsByUser = new Map();
  payments.forEach((payment) => {
    if (!paymentsByUser.has(payment.user_id)) paymentsByUser.set(payment.user_id, []);
    paymentsByUser.get(payment.user_id).push(payment);
  });
  const contractedClients = users.filter((user) => (
    !CONTRACTED_EXCLUDED_CLIENT_IDS.has(String(user.id))
    && user.pago_completed_at
    && inBounds(new Date(user.pago_completed_at), bounds)
  ));
  const signedClients = users.filter((user) => isContractedUserIncluded(user) && user.contract_signed_at && inBounds(new Date(user.contract_signed_at), bounds));
  let contracted = 0;
  contractedClients.forEach((user) => {
    const value = contractedAmountForUser(user, paymentsByUser.get(user.id) || []);
    contracted += value;
    const bucket = byBucket.get(bucketKey(new Date(user.pago_completed_at), bounds.granularity));
    if (bucket) bucket.contracted += value;
  });
  signedClients.forEach((user) => {
    const bucket = byBucket.get(bucketKey(new Date(user.contract_signed_at), bounds.granularity));
    if (bucket) bucket.newClients += 1;
  });

  const paymentByHoldedId = new Map();
  const paymentByNumber = new Map();
  payments.forEach((payment) => {
    const data = payment.payment_data || {};
    if (data.holded_invoice_id) paymentByHoldedId.set(String(data.holded_invoice_id), payment);
    if (data.holded_invoice_num) paymentByNumber.set(String(data.holded_invoice_num), payment);
    if (payment.invoice_number) paymentByNumber.set(String(payment.invoice_number), payment);
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const paymentForInvoice = (invoice) => paymentByHoldedId.get(String(invoice.id)) || paymentByNumber.get(String(invoice.docNumber || ''));

  const expenses = categorizeExpenses(ledgerEntries, buckets, bounds);
  expenses.purchaseTax = round(expenses.taxes);
  expenses.salesTax = round(periodInvoices.reduce((total, invoice) => total + invoiceAmounts(invoice).tax, 0));
  expenses.netTax = round(expenses.salesTax - expenses.purchaseTax);

  let cumulativeContracted = 0;
  let cumulativeCollected = 0;
  buckets.forEach((bucket, index) => {
    cumulativeContracted += bucket.contracted;
    cumulativeCollected += bucket.collected;
    Object.keys(bucket).forEach((key) => { if (typeof bucket[key] === 'number') bucket[key] = round(bucket[key]); });
    bucket.cumulativeContracted = round(cumulativeContracted);
    bucket.cumulativeCollected = round(cumulativeCollected);
    bucket.tick = (buckets.length <= 13 || index % 5 === 0 || index === buckets.length - 1) ? bucket.label : '';
  });

  const documents = periodInvoices.filter((invoice) => invoice.documentType !== 'entry');
  const adjustments = periodInvoices.filter((invoice) => invoice.documentType === 'entry');
  const sales = round(periodInvoices.reduce((total, invoice) => total + invoiceAmounts(invoice).subtotal, 0));
  const emitted = round(periodInvoices.reduce((total, invoice) => total + invoiceAmounts(invoice).total, 0));
  const collected = round(periodInvoices.reduce((total, invoice) => total + invoiceAmounts(invoice).collected, 0));
  const pending = round(documents.reduce((total, invoice) => total + invoiceAmounts(invoice).pending, 0));
  const invoiceRows = periodInvoices.sort((a, b) => Number(b.date || 0) - Number(a.date || 0)).map((invoice) => {
    const payment = paymentForInvoice(invoice);
    const user = payment ? usersById.get(payment.user_id) : null;
    const count = user ? applicationPlanForUser(user).length : null;
    const values = invoiceAmounts(invoice);
    return { id: invoice.id, documentType: invoice.documentType || 'invoice', number: invoice.docNumber || '—', customer: invoice.contactName || '—', clientType: user?.tipo || null, installment: payment && count ? `Pago ${payment.installment} de ${count}` : null, date: fromUnix(invoice.date) ? ymd(fromUnix(invoice.date)) : null, base: round(values.subtotal), tax: round(values.tax), total: round(values.total), status: invoiceStatus(invoice), currency: String(invoice.currency || 'EUR').toUpperCase() };
  });
  const anomaly = contracted < emitted;

  return {
    period: bounds.id,
    rangeLabel: formatRange(bounds),
    granularity: bounds.granularity,
    syncedAt: new Date().toISOString(),
    available: true,
    kpis: { sales, invoices: documents.length, contracted: round(contracted), students: signedClients.length, cac: signedClients.length ? round(expenses.marketing / signedClients.length) : null, anomaly },
    buckets,
    collections: { sales, collected, emitted, contracted: round(contracted), invoices: documents.length, adjustments: round(adjustments.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0)), documentsBase: round(documents.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0)), pending, averageInvoice: documents.length ? round(documents.reduce((sum, invoice) => sum + amount(invoice.total), 0) / documents.length) : null, averageTicket: signedClients.length ? round(contracted / signedClients.length) : null },
    expenses,
    invoices: invoiceRows,
    cash: { available: Array.isArray(treasuryHistory), points: (treasuryHistory || []).map((row) => ({ date: row.snapshot_date, balance: amount(row.total_eur), source: row.source })), accounts: treasuryHistory?.at(-1)?.accounts || [] },
    reports: { profitAndLoss: 'wip', balance: 'wip' },
  };
}

module.exports = { formatRange, buildFinanceDashboard };
