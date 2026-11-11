// Netlify handler for /api/admin/holded/snapshot; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const holded = require('../../lib/holded');
const { loadRevenueAdjustments } = require('../../lib/finance/revenue');
const { dateKey, dayStart, addCalendarDays } = require('../../../../packages/time/madrid.cjs');

const amount = (value) => Number(value || 0);
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const isoDate = (unix) => unix ? dateKey(new Date(Number(unix) * 1000)) : null;

function statusFor(invoice, nowSec) {
  if (invoice.documentType === 'entry') return 'adjustment';
  if (invoice.draft) return 'draft';
  if (Number(invoice.status) === 1 || Math.abs(amount(invoice.paymentsPending)) <= 0) return 'paid';
  if (Number(invoice.status) === 2) return 'partial';
  if (Number(invoice.status) === 3 || (invoice.dueDate && Number(invoice.dueDate) < nowSec)) return 'overdue';
  return 'pending';
}

function isCancelled(invoice) {
  const text = [invoice.statusName, invoice.statusText, invoice.state, invoice.docStatus].filter(Boolean).join(' ').toLowerCase();
  return Boolean(Number(invoice.status) === 3 || invoice.cancelled || invoice.canceled || invoice.isCancelled || invoice.isCanceled || invoice.voided || /anulad|cancel|void/.test(text));
}

function toInvoiceRow(invoice, nowSec) {
  return {
    id: invoice.id,
    documentType: invoice.documentType || 'invoice',
    number: invoice.docNumber || 'Borrador',
    customer: invoice.contactName || 'Sin contacto',
    date: isoDate(invoice.date),
    dueDate: isoDate(invoice.dueDate),
    subtotal: round(amount(invoice.subtotal)),
    tax: round(amount(invoice.tax)),
    total: round(amount(invoice.total)),
    paid: round(amount(invoice.paymentsTotal)),
    pending: round(amount(invoice.paymentsPending)),
    status: statusFor(invoice, nowSec),
    currency: String(invoice.currency || 'EUR').toUpperCase(),
  };
}

function totals(invoices, nowSec) {
  const valid = invoices.filter((invoice) => !invoice.draft && !isCancelled(invoice));
  const documents = valid.filter((invoice) => invoice.documentType !== 'entry');
  const adjustments = valid.filter((invoice) => invoice.documentType === 'entry');
  const billed = valid.reduce((sum, invoice) => sum + amount(invoice.total), 0);
  const base = valid.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0);
  const collected = documents.reduce((sum, invoice) => {
    const gross = Math.abs(amount(invoice.total));
    const paidRatio = gross > 0 ? Math.min(1, Math.abs(amount(invoice.paymentsTotal)) / gross) : 0;
    return sum + amount(invoice.subtotal) * paidRatio;
  }, 0);
  const tax = valid.reduce((sum, invoice) => sum + amount(invoice.tax), 0);
  const statuses = documents.map((invoice) => statusFor(invoice, nowSec));
  const pendingBase = (invoice) => {
    const gross = Math.abs(amount(invoice.total));
    const pendingRatio = gross > 0 ? Math.min(1, Math.abs(amount(invoice.paymentsPending)) / gross) : 0;
    return amount(invoice.subtotal) * pendingRatio;
  };
  const pending = documents.reduce((sum, invoice) => sum + pendingBase(invoice), 0);
  const overdue = documents.reduce((sum, invoice, index) => {
    if (statuses[index] !== 'overdue') return sum;
    return sum + pendingBase(invoice);
  }, 0);
  const documentSales = documents.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0);
  return {
    sales: round(base), billed: round(billed), base: round(base), tax: round(tax), collected: round(collected), pending: round(pending),
    documentSales: round(documentSales),
    accountingAdjustments: round(adjustments.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0)),
    adjustments: adjustments.length,
    overdue: round(overdue),
    invoices: documents.length,
    paidInvoices: statuses.filter((status) => status === 'paid').length,
    pendingInvoices: statuses.filter((status) => status !== 'paid').length,
    partialInvoices: statuses.filter((status) => status === 'partial').length,
    overdueInvoices: statuses.filter((status) => status === 'overdue').length,
    drafts: invoices.filter((invoice) => invoice.draft).length,
    averageTicket: documents.length ? round(documents.reduce((sum, invoice) => sum + amount(invoice.total), 0) / documents.length) : 0,
    collectionRate: documentSales ? round(collected / documentSales * 100) : 0,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: admin, error } = await sb.from('users').select('id,email,username,role').eq('id', session.uid).single();
    if (error || !admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });

    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const today = dateKey(now);
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7)) - 1;
    const monthStart = new Date(Date.UTC(year, month, 1));
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const previousYearStart = new Date(Date.UTC(year - 1, 0, 1));
    const previousYearEnd = yearStart;
    const trendStart = new Date(Date.UTC(year, month - 11, 1));
    const queryStart = new Date(Math.min(previousYearStart.getTime(), trendStart.getTime()));
    const [documents, adjustments] = await Promise.all([
      holded.listSalesDocuments({ start: dayStart(queryStart.toISOString().slice(0, 10)).getTime() / 1000, end: nowSec }),
      loadRevenueAdjustments(queryStart, new Date(`${addCalendarDays(today, 1)}T00:00:00Z`)),
    ]);
    const invoices = [...documents, ...adjustments];
    const inRange = (invoice, start, end = null) => {
      const key = isoDate(invoice.date);
      return key && key >= start.toISOString().slice(0, 10) && (!end || key < end.toISOString().slice(0, 10));
    };
    const monthInvoices = invoices.filter((invoice) => inRange(invoice, monthStart));
    const yearInvoices = invoices.filter((invoice) => inRange(invoice, yearStart));
    const previousYearInvoices = invoices.filter((invoice) => inRange(invoice, previousYearStart, previousYearEnd));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(Date.UTC(year, month - 11 + index, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      const rows = invoices.filter((invoice) => inRange(invoice, start, end));
      const previousStart = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), 1));
      const previousEnd = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth() + 1, 1));
      const previousRows = invoices.filter((invoice) => inRange(invoice, previousStart, previousEnd));
      const summary = totals(rows, nowSec);
      return { month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(start), sales: summary.sales, previousYearSales: totals(previousRows, nowSec).sales, billed: summary.billed, collected: summary.collected, pending: summary.pending, invoices: summary.invoices };
    });

    return json({
      syncedAt: new Date().toISOString(),
      timeZone: 'Europe/Madrid',
      currency: String(invoices.find((invoice) => invoice.currency)?.currency || 'EUR').toUpperCase(),
      currentMonth: totals(monthInvoices, nowSec),
      currentYear: totals(yearInvoices, nowSec),
      currentYearInvoices: yearInvoices
        .filter((invoice) => !invoice.draft && !isCancelled(invoice))
        .sort((a, b) => Number(b.date || 0) - Number(a.date || 0))
        .map((invoice) => toInvoiceRow(invoice, nowSec)),
      previousYear: totals(previousYearInvoices, nowSec),
      last12Months: monthly,
      recentInvoices: invoices.filter((invoice) => !isCancelled(invoice)).slice(0, 50).map((invoice) => toInvoiceRow(invoice, nowSec)),
    });
  } catch (error) {
    return serverError(error, 'admin.holded_snapshot');
  }
};
