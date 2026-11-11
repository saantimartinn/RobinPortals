// Server-side invoices helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const { amount } = require("./utils");

function isCancelled(invoice) {
  const text = [invoice.statusName, invoice.statusText, invoice.state, invoice.docStatus].filter(Boolean).join(' ').toLowerCase();
  return Boolean(Number(invoice.status) === 3 || invoice.cancelled || invoice.canceled || invoice.isCancelled || invoice.isCanceled || invoice.voided || /anulad|cancel|void/.test(text));
}
function validInvoice(invoice) {
  return !invoice.draft && !isCancelled(invoice);
}
function invoiceStatus(invoice, nowSec = Math.floor(Date.now() / 1000)) {
  if (invoice.documentType === 'entry') return 'adjustment';
  if (invoice.draft) return 'draft';
  if (Math.abs(amount(invoice.paymentsPending)) <= 0 || Number(invoice.status) === 1) return 'paid';
  if (Number(invoice.status) === 2 || (amount(invoice.paymentsTotal) > 0 && amount(invoice.paymentsPending) > 0)) return 'partial';
  if (invoice.dueDate && Number(invoice.dueDate) < nowSec) return 'overdue';
  return 'pending';
}
function invoiceAmounts(invoice) {
  const total = amount(invoice.total);
  if (invoice.documentType === 'entry') return { total, collected: 0, pending: 0, tax: amount(invoice.tax), subtotal: amount(invoice.subtotal) };
  const sign = total < 0 ? -1 : 1;
  const collected = sign * Math.min(Math.abs(total), Math.abs(amount(invoice.paymentsTotal)));
  return { total, collected, pending: total - collected, tax: amount(invoice.tax), subtotal: amount(invoice.subtotal) };
}

module.exports = { isCancelled, validInvoice, invoiceStatus, invoiceAmounts };
