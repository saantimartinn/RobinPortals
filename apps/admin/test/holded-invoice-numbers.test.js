const test = require('node:test');
const assert = require('node:assert/strict');
const { syncIssuedInvoiceNumbers } = require('../lib/google-sheets');
const { findInvoiceByEvidence, invoiceEntries } = require('../netlify/functions/holded-invoice-numbers');

test('incluye facturas vinculadas después de las primeras 1.000 filas', async () => {
  const users = Array.from({ length: 1001 }, (_, i) => ({ id: `user-${i}`, lead_id: `lead-${i}` }));
  const payments = Array.from({ length: 1001 }, (_, i) => ({
    user_id: `user-${i}`, installment: 1, amount: 500,
    payment_data: { holded_invoice_id: `invoice-${i}` },
  }));
  const sb = { from(table) { return {
    select() { return this; },
    order(column) { assert.equal(column, 'id'); return this; },
    async range(start, end) { return { data: (table === 'users' ? users : payments).slice(start, end + 1), error: null }; },
  }; } };
  const entries = await invoiceEntries(sb);
  assert.equal(entries.length, 1001);
  assert.equal(entries.at(-1).invoiceId, 'invoice-1000');
});

test('incorpora el número al emitirse, reintenta borradores y respeta celdas manuales', async () => {
  const originalFetch = global.fetch;
  const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SHEETS_SPREADSHEET_ID'];
  const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REFRESH_TOKEN: 'test',
    GOOGLE_SHEETS_SPREADSHEET_ID: 'test-sheet',
  });
  const writes = [];
  const response = (value) => new Response(JSON.stringify(value), { status: 200 });
  global.fetch = async (url, options = {}) => {
    const address = decodeURIComponent(String(url));
    if (address.includes('oauth2.googleapis.com')) return response({ access_token: 'test', expires_in: 3600 });
    if (address.includes('?fields=sheets')) return response({ sheets: [
      { properties: { sheetId: 288896043, title: 'Cambios para Manu' } },
    ] });
    if (address.includes('A1:O')) {
      const header = Array(15).fill('');
      header[6] = 'Nº factura 1'; header[10] = 'Nº factura 2'; header[14] = 'Nº factura 3';
      const existing = Array(15).fill(''); existing[1] = 'lead-1'; existing[10] = 'MANUAL-2';
      return response({ values: [header, existing] });
    }
    if (address.includes('values:batchUpdate')) {
      writes.push(...JSON.parse(options.body).data);
      return response({ totalUpdatedCells: 1 });
    }
    throw new Error(`Unexpected request ${address}`);
  };
  try {
    const lookedUp = [];
    const result = await syncIssuedInvoiceNumbers([
      { leadId: 'lead-1', installment: 1, invoiceId: 'issued' },
      { leadId: 'lead-1', installment: 2, invoiceId: 'manual' },
      { leadId: 'lead-1', installment: 3, invoiceId: 'draft' },
      { leadId: 'missing', installment: 1, invoiceId: 'missing' },
    ], async (entry) => {
      lookedUp.push(entry.invoiceId);
      return entry.invoiceId === 'issued' ? { document_number: 'F-2026-42' } : {};
    });
    assert.deepEqual(result, { checked: 4, updated: 1, pending: 1, missingRows: 1, failed: 0 });
    assert.deepEqual(lookedUp.sort(), ['draft', 'issued']);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].range, "'Cambios para Manu'!G2:G2");
    assert.equal(writes[0].values[0][0], 'F-2026-42');
  } finally {
    global.fetch = originalFetch;
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});

test('busca por fecha e importe y exige referencia PR o NIF fiscal único', async () => {
  const oldFetch = global.fetch;
  const oldKey = process.env.HOLDED_API_KEY;
  process.env.HOLDED_API_KEY = 'test';
  const docs = [
    { id: 'other', date: 1788374400, total: 566.67, notes: '', contact: 'other-contact', docNumber: 'F1' },
    { id: 'matching-fiscal', date: 1788374400, total: 566.67, notes: '', contact: 'fiscal-contact', docNumber: 'F2' },
    { id: 'matching-pr', date: 1788374400, total: 666.33, notes: 'Cliente Robin lead-2', contact: 'another', docNumber: null },
  ];
  global.fetch = async (url) => {
    const address = String(url);
    if (address.includes('/documents/invoice')) return new Response(JSON.stringify(docs), { status: 200 });
    if (address.endsWith('/fiscal-contact')) return new Response(JSON.stringify({ code: '46237324X' }), { status: 200 });
    return new Response(JSON.stringify({ code: '00000000X' }), { status: 200 });
  };
  try {
    const fiscal = await findInvoiceByEvidence({ leadId: 'lead-1', amount: 566.67,
      date: '2026-09-03T10:55:38Z', fiscalCode: '46237324X' });
    assert.equal(fiscal.id, 'matching-fiscal');
    const reference = await findInvoiceByEvidence({ leadId: 'lead-2', amount: 666.33,
      date: '2026-09-03T10:55:38Z', fiscalCode: '' });
    assert.equal(reference.id, 'matching-pr');
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.HOLDED_API_KEY;
    else process.env.HOLDED_API_KEY = oldKey;
  }
});
