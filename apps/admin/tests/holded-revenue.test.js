const test = require('node:test');
const assert = require('node:assert/strict');

test('sales documents always include tickets and subtract credit notes exactly once', async (t) => {
  const { listSalesDocuments } = require('../lib/holded/analytics');
  const oldKey = process.env.HOLDED_API_KEY;
  process.env.HOLDED_API_KEY = 'test';
  t.after(() => { if (oldKey === undefined) delete process.env.HOLDED_API_KEY; else process.env.HOLDED_API_KEY = oldKey; });
  t.mock.method(global, 'fetch', async (address) => {
    const type = new URL(address).pathname.split('/').pop();
    const rows = {
      invoice: [{ id: 'invoice', docNumber: 'F260077', subtotal: 289.26, tax: 60.74, total: 350, paymentsTotal: 350, paymentsPending: 0 }],
      salesreceipt: [{ id: 'receipt', docNumber: 'T260007', subtotal: 4870.83, tax: 1022.88, total: 5893.71, paymentsTotal: 0, paymentsPending: 5893.71 }],
      creditnote: [{ id: 'credit', docNumber: 'CN260003', subtotal: 665.29, tax: 139.71, total: 805, paymentsTotal: 805, paymentsPending: 0 },
        { id: 'negative-credit', subtotal: -289.26, tax: -60.74, total: -350, paymentsTotal: -350, paymentsPending: 0 }],
    };
    return new Response(JSON.stringify(rows[type]), { status: 200 });
  });
  const rows = await listSalesDocuments({ start: 1, end: 2 });
  assert.deepEqual(rows.map((row) => [row.id, row.documentType, row.subtotal, row.total, row.paymentsTotal]), [
    ['invoice', 'invoice', 289.26, 350, 350],
    ['receipt', 'salesreceipt', 4870.83, 5893.71, 0],
    ['credit', 'creditnote', -665.29, -805, -805],
    ['negative-credit', 'creditnote', -289.26, -350, -350],
  ]);
});

test('an unavailable credit-note source cannot silently disappear from sales totals', async (t) => {
  const { listSalesDocuments } = require('../lib/holded/analytics');
  const oldKey = process.env.HOLDED_API_KEY;
  process.env.HOLDED_API_KEY = 'test';
  t.after(() => { if (oldKey === undefined) delete process.env.HOLDED_API_KEY; else process.env.HOLDED_API_KEY = oldKey; });
  t.mock.method(global, 'fetch', async (address) => new Response(JSON.stringify(
    new URL(address).pathname.endsWith('/creditnote') ? { status: 0, message: 'provider failure' } : [{ id: 'sale', subtotal: 100, total: 121 }]
  ), { status: 200 }));
  await assert.rejects(listSalesDocuments(), /holded_invalid_document_response/);
});

test('manual revenue reconciles the imported entries without duplicating linked document postings', () => {
  const { accountingAdjustments } = require('../lib/finance/revenue');
  const rows = [
    { id: 'entry-927', entry_number: 927, date: '31/01/2026', type: 'entry', account: 70500000, debit: '0.00', credit: '-838.84' },
    { id: 'entry-927', entry_number: 927, date: '31/01/2026', type: 'entry', account: 47700000, debit: '0.00', credit: '-176.16' },
    { id: 'entry-927', entry_number: 927, date: '31/01/2026', type: 'entry', account: 43000001, debit: '-1015.00', credit: '0.00' },
    { id: 'entry-926', entry_number: 926, date: '31/01/2026', type: 'entry', account: 70000000, debit: '0,00', credit: '665,29' },
    { id: 'entry-926', entry_number: 926, date: '31/01/2026', type: 'entry', account: 47700000, debit: '0,00', credit: '139,71' },
    { id: 'ticket', entry_number: 939, date: '01/10/2026', type: 'salesreceipt', account: 70500000, debit: '0', credit: '4870.83' },
    { id: 'invoice', date: '01/01/2026', type: 'invoice', account: 70500000, debit: '0', credit: '289.26' },
    { id: 'refund', date: '18/09/2026', type: 'creditnote', account: 70000000, debit: '289.26', credit: '0' },
  ];
  const result = accountingAdjustments(rows);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((row) => [row.docNumber, row.subtotal, row.tax, row.total, row.paymentsPending, row.documentType]), [
    ['Asiento 927', -838.84, -176.16, -1015, 0, 'entry'],
    ['Asiento 926', 665.29, 139.71, 805, 0, 'entry'],
  ]);
  assert.equal(new Date(result[0].date * 1000).toISOString(), '2026-01-30T23:00:00.000Z');
});

test('financial period membership and labels use Spanish dates across month and year boundaries', () => {
  const { inBounds, bucketKey } = require('../lib/finance/periods');
  const { ymd } = require('../lib/finance/utils');
  const november = { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z') };
  assert.equal(inBounds(new Date('2026-10-31T23:00:00Z'), november), true);
  assert.equal(inBounds(new Date('2026-11-30T23:00:00Z'), november), false);
  assert.equal(bucketKey(new Date('2026-10-31T23:00:00Z'), 'month'), '2026-11-01');
  assert.equal(ymd(new Date('2025-12-31T23:00:00Z')), '2026-01-01');
});

test('incomplete ledger pagination fails instead of returning a partial financial total', async (t) => {
  const oldPat = process.env.HOLDED_API_PAT;
  process.env.HOLDED_API_PAT = 'test';
  t.after(() => { if (oldPat === undefined) delete process.env.HOLDED_API_PAT; else process.env.HOLDED_API_PAT = oldPat; });
  const { v2List } = require('../lib/finance/holded');
  t.mock.method(global, 'fetch', async () => new Response(JSON.stringify({ items: [{ id: 'first' }], has_more: true, cursor: 'next' }), { status: 200 }));
  await assert.rejects(v2List('/ledger-entries', {}, 1), /holded_pagination_incomplete/);
  await assert.rejects(v2List('/ledger-entries', {}, 3), /holded_pagination_incomplete/);
  t.mock.method(global, 'fetch', async () => new Response(JSON.stringify({ message: 'unexpected provider response' }), { status: 200 }));
  await assert.rejects(v2List('/ledger-entries'), /holded_invalid_list_response/);
});

test('finance dashboard reports net revenue and keeps manual adjustments out of customer collections', async () => {
  const { buildFinanceDashboard } = require('../lib/finance/dashboard');
  const invoice = (id, documentType, subtotal, tax, total, date, paid) => ({
    id, docNumber: id, documentType, subtotal, tax, total, date: Date.parse(date) / 1000,
    paymentsTotal: paid, paymentsPending: 0, status: 1,
  });
  const result = await buildFinanceDashboard({
    period: 'custom',
    bounds: { id: 'custom', start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z'), granularity: 'month' },
    invoices: [
      invoice('sale', 'invoice', 1000, 210, 1210, '2026-10-31T23:00:00Z', 1210),
      invoice('refund', 'creditnote', -100, -21, -121, '2026-11-02T00:00:00Z', -121),
      invoice('manual', 'entry', -200, -42, -242, '2026-11-02T00:00:00Z', 0),
    ],
    users: [], payments: [], ledgerEntries: [], treasuryHistory: [],
  });
  assert.equal(result.kpis.sales, 700);
  assert.equal(result.kpis.invoices, 2);
  assert.equal(result.collections.emitted, 847);
  assert.equal(result.collections.documentsBase, 900);
  assert.equal(result.collections.adjustments, -200);
  assert.equal(result.collections.collected, 1089);
  assert.equal(result.collections.pending, 0);
  assert.equal(result.buckets[0].sales, 700);
  assert.equal(result.expenses.salesTax, 147);
  assert.equal(result.invoices.find((row) => row.id === 'sale').date, '2026-11-01');
});

test('year-on-year comparison includes Spanish midnight in the previous period', async () => {
  const { buildFinanceDashboard } = require('../lib/finance/dashboard');
  const result = await buildFinanceDashboard({
    period: 'custom', bounds: {
      id: 'custom', start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z'),
      previousStart: new Date('2025-11-01T00:00:00Z'), previousEnd: new Date('2025-12-01T00:00:00Z'), granularity: 'month',
    },
    invoices: [{ id: 'previous', date: Date.parse('2025-10-31T23:00:00Z') / 1000, subtotal: 100, tax: 21, total: 121, status: 1 }],
    users: [], payments: [], ledgerEntries: [], treasuryHistory: [],
  });
  assert.equal(result.buckets[0].previousSales, 100);
});

test('treasury month-end excludes movements on the next Spanish day', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-11T12:00:00Z') });
  const oldPat = process.env.HOLDED_API_PAT;
  process.env.HOLDED_API_PAT = 'test';
  t.after(() => { if (oldPat === undefined) delete process.env.HOLDED_API_PAT; else process.env.HOLDED_API_PAT = oldPat; });
  t.mock.method(global, 'fetch', async (address) => {
    const url = new URL(address);
    if (url.hostname === 'www.ecb.europa.eu') return new Response('Date,USD\n2026-11-11,1.1');
    if (url.pathname.endsWith('/bank-movements')) return Response.json({ items: [{ date: '2026-10-31T23:00:00Z', amount: 100, sign: 'in' }] });
    return Response.json({ items: [{ id: 'account', type: 'bank', currency: 'EUR', balance: 1000 }] });
  });
  const { computeTreasurySnapshots } = require('../lib/finance/treasury');
  const rows = await computeTreasurySnapshots({ includeBackfill: true });
  assert.equal(rows.find((row) => row.snapshot_date === '2026-10-31').total_eur, 900);
  assert.equal(rows.find((row) => row.snapshot_date === '2026-11-11').total_eur, 1000);
});
