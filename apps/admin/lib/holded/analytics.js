// Server-side analytics helpers used by request handlers; provider calls and domain rules stay behind this boundary.
function analyticsKey() {
  return String(process.env.HOLDED_API_KEY || '').trim();
}

function isAnalyticsConfigured() {
  return !!analyticsKey();
}

async function listDocuments(docType, { start, end, signal } = {}) {
  if (!isAnalyticsConfigured()) throw new Error('holded_analytics_not_configured');
  const url = new URL(`https://api.holded.com/api/invoicing/v1/documents/${encodeURIComponent(docType)}`);
  if (start) url.searchParams.set('starttmp', String(start));
  if (end) url.searchParams.set('endtmp', String(end));
  url.searchParams.set('sort', 'created-desc');
  const res = await fetch(url, { headers: { key: analyticsKey(), Accept: 'application/json' }, signal });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error('holded_analytics_http_' + res.status);
    err.detail = data;
    throw err;
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  throw new Error('holded_invalid_document_response');
}

async function listSalesInvoices(options = {}) {
  return listDocuments('invoice', options);
}

async function listSalesDocuments(options = {}) {
  const types = ['invoice', 'salesreceipt', 'creditnote'];
  const groups = await Promise.all(types.map((type) => listDocuments(type, options)));
  return groups.flatMap((documents, index) => documents.map((document) => {
    const documentType = types[index];
    if (documentType !== 'creditnote') return { ...document, documentType };
    const signed = { ...document, documentType };
    for (const field of ['subtotal', 'tax', 'total', 'paymentsTotal', 'paymentsPending', 'paymentsRefunds']) {
      signed[field] = -Math.abs(Number(document[field] || 0));
    }
    return signed;
  }));
}

async function listPurchaseDocuments(options = {}) {
  // Las compras son la fuente principal. Una incidencia aislada al consultar
  // rectificativas no debe descartar todas las facturas de compra válidas.
  const purchases = await listDocuments('purchase', options);
  let refunds = [];
  try {
    refunds = await listDocuments('purchaserefund', options);
  } catch (error) {
    console.warn('holded purchase refunds warning', error?.message || error);
  }
  return [
    ...purchases.map((document) => ({ ...document, documentType: 'purchase' })),
    ...refunds.map((document) => ({ ...document, documentType: 'purchaserefund' })),
  ];
}

async function listExpenseAccounts() {
  if (!isAnalyticsConfigured()) throw new Error('holded_analytics_not_configured');
  const url = 'https://api.holded.com/api/invoicing/v1/expensesaccounts';
  const res = await fetch(url, { headers: { key: analyticsKey(), Accept: 'application/json' } });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error('holded_expense_accounts_http_' + res.status);
    err.detail = data;
    throw err;
  }
  return Array.isArray(data) ? data : (Array.isArray(data && data.data) ? data.data : []);
}

module.exports = {
  isAnalyticsConfigured,
  listDocuments,
  listExpenseAccounts,
  listPurchaseDocuments,
  listSalesInvoices,
  listSalesDocuments,
};
