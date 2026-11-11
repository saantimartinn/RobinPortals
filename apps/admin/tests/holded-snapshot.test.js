const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function snapshotHandler(invoices, adjustments = []) {
  const filename = require.resolve('../netlify/functions/admin-holded-snapshot');
  const originalLoad = Module._load;
  const modules = {
    '../../lib/supabase': { getSupabase: () => ({ from: () => ({
      select() { return this; },
      eq() { return this; },
      async single() { return { data: { id: 'admin-1', role: 'admin' }, error: null }; },
    }) }) },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin-1' }) },
    '../../lib/holded': { listSalesInvoices: async () => invoices, listSalesDocuments: async () => invoices },
    '../../lib/finance/revenue': { loadRevenueAdjustments: async () => adjustments },
  };
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename === filename && modules[request]) return modules[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[filename];
    return require(filename).handler;
  } finally {
    Module._load = originalLoad;
    delete require.cache[filename];
  }
}

test('annual sales includes every contributing invoice beyond the recent 50 and reconciles to its rows', async () => {
  const year = new Date().getUTCFullYear();
  const invoice = (id, overrides = {}) => ({
    id, docNumber: id, contactName: 'Cliente de prueba',
    date: Date.UTC(year, 0, 1) / 1000,
    subtotal: 100.01, tax: 21, total: 121.01,
    paymentsTotal: 121.01, paymentsPending: 0,
    status: 1, draft: false, currency: 'eur', ...overrides,
  });
  const invoices = [
    ...Array.from({ length: 55 }, (_, i) => invoice(`F-${i}`)),
    invoice('RECT-1', { subtotal: -10.01, tax: -2.10, total: -12.11, paymentsTotal: -12.11 }),
    invoice('DRAFT', { draft: true }),
    invoice('CANCELLED', { status: 3 }),
    invoice('OLD', { date: Date.UTC(year - 1, 0, 1) / 1000 }),
  ];
  const response = await snapshotHandler(invoices)({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.currentYear.invoices, 56);
  assert.equal(result.currentYear.sales, 5490.54);
  assert.equal(result.currentYearInvoices?.length, 56);
  assert.equal(result.currentYearInvoices.reduce((sum, row) => sum + Math.round(row.subtotal * 100), 0), 549054);
  assert.deepEqual(result.currentYearInvoices.map((row) => row.id).sort(), [
    ...Array.from({ length: 55 }, (_, i) => `F-${i}`), 'RECT-1',
  ].sort());
  assert.equal(result.recentInvoices.length, 50);
});

test('annual snapshot reconciles signed documents and manual entries using Spanish calendar dates', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-11T12:00:00Z') });
  const day = (value) => Date.parse(value) / 1000;
  const document = (id, subtotal, tax, total, documentType = 'invoice', date = '2026-06-01T00:00:00Z') => ({
    id, docNumber: id, documentType, subtotal, tax, total, date: day(date), status: 1, paymentsTotal: total, paymentsPending: 0,
  });
  const invoices = [
    document('existing', 99141.23, 19832.62, 118973.85),
    document('F260077', 289.26, 60.74, 350, 'invoice', '2025-12-31T23:00:00Z'),
    document('T260005', 289.26, 60.74, 350, 'salesreceipt'),
    document('T260006', 123.97, 26.03, 150, 'salesreceipt'),
    { ...document('T260007', 4870.83, 1022.88, 5893.71, 'salesreceipt'), paymentsTotal: 0, paymentsPending: 5893.71, status: 0 },
    document('CN260003', -665.29, -139.71, -805, 'creditnote'),
    document('CN260004', -289.26, -60.74, -350, 'creditnote'),
  ];
  const adjustments = [{ ...document('manual', -4025.49, -845.34, -4870.83, 'entry'), paymentsTotal: 0, paymentsPending: 0 }];
  const response = await snapshotHandler(invoices, adjustments)({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.currentYear.sales, 99734.51);
  assert.equal(result.currentYear.tax, 19957.22);
  assert.equal(result.currentYear.billed, 119691.73);
  assert.equal(result.currentYear.documentSales, 103760);
  assert.equal(result.currentYear.accountingAdjustments, -4025.49);
  assert.equal(result.currentYear.invoices, 7);
  assert.equal(result.currentYear.adjustments, 1);
  assert.equal(result.currentYear.pending, 4870.83);
  assert.equal(result.currentYear.collected, 98889.17);
  assert.equal(result.currentYearInvoices.length, 8);
  assert.equal(result.currentYearInvoices.find((row) => row.number === 'F260077').date, '2026-01-01');
});

test('Spanish November includes the invoice stored on October 31 at 23 UTC', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-11T12:00:00Z') });
  const response = await snapshotHandler([{
    id: 'F260290', docNumber: 'F260290', date: Date.parse('2026-10-31T23:00:00Z') / 1000,
    subtotal: 550.69, tax: 115.64, total: 666.33, paymentsTotal: 666.33, paymentsPending: 0, status: 1,
  }])({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(result.currentMonth.sales, 550.69);
  assert.equal(result.last12Months.find((row) => row.month === '2026-10').sales, 0);
  assert.equal(result.last12Months.find((row) => row.month === '2026-11').sales, 550.69);
  assert.equal(result.currentYearInvoices[0].date, '2026-11-01');
});

test('annual sales breakdown stays empty when all documents are drafts or from another year', async () => {
  const year = new Date().getUTCFullYear();
  const response = await snapshotHandler([
    { id: 'old', date: Date.UTC(year - 1, 0, 1) / 1000, subtotal: 100, total: 121, status: 1 },
    { id: 'draft', date: Date.UTC(year, 0, 1) / 1000, subtotal: 100, total: 121, draft: true },
  ])({ httpMethod: 'GET' });
  const result = JSON.parse(response.body);
  assert.equal(result.currentYear.sales, 0);
  assert.equal(result.currentYear.invoices, 0);
  assert.deepEqual(result.currentYearInvoices, []);
});
