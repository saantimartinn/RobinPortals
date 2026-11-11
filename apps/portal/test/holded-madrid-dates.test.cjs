const test = require('node:test');
const assert = require('node:assert/strict');

const modules = {
  portal: require('../lib/holded'),
  robinjr: require('../../robinjr/lib/holded'),
  admin: require('../../admin/lib/holded/invoices'),
};
const holder = { id: 'student', nombre: 'Ana', tipo: 'general', origin: 'es', holded_contact_id: 'contact-existing' };

async function captureInvoice(holded, now, user = holder, payment = {}) {
  const originalDate = global.Date;
  const originalFetch = global.fetch;
  const originalPat = process.env.HOLDED_API_PAT;
  let payload;
  global.Date = class extends originalDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return originalDate.parse(now); }
  };
  process.env.HOLDED_API_PAT = 'test';
  global.fetch = async (url, options = {}) => {
    if (url.endsWith('/invoices') && options.method === 'POST') {
      payload = JSON.parse(options.body);
      return { ok: true, text: async () => JSON.stringify({ id: 'invoice-test' }) };
    }
    assert.ok(url.endsWith('/invoices/invoice-test'), `unexpected request: ${url}`);
    return { ok: true, text: async () => JSON.stringify({ document_number: 'TEST' }) };
  };
  try {
    const result = await holded.createInvoiceForPayment(null, user, { amount: 121, currency: 'EUR', installment: 1, ...payment });
    assert.equal(result.invoiceId, 'invoice-test');
    assert.equal(result.docNumber, 'TEST');
    return payload;
  } finally {
    global.Date = originalDate;
    global.fetch = originalFetch;
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT;
    else process.env.HOLDED_API_PAT = originalPat;
  }
}

for (const [app, holded] of Object.entries(modules)) {
  for (const [now, date, dueDate] of [
    ['2025-12-31T23:30:00Z', '2026-01-01', '2026-01-08'],
    ['2026-08-31T22:30:00Z', '2026-09-01', '2026-09-08'],
    ['2026-10-24T22:30:00Z', '2026-10-25', '2026-11-01'],
    ['2026-03-22T22:30:00Z', '2026-03-22', '2026-03-29'],
  ]) {
    test(`${app}: new invoice dates follow Madrid at ${now}`, async () => {
      const payload = await captureInvoice(holded, now);
      assert.equal(payload.date, date);
      assert.equal(payload.due_date, dueDate);
    });
  }
}

test('Junior: paid_at fallback becomes a Spanish due date while a supplied calendar date stays literal', async () => {
  const { ROBIN_JR_PRICE_VERSION } = require('../../robinjr/shared/financial-config.cjs');
  const user = { ...holder, contract_data: { pricing_version: ROBIN_JR_PRICE_VERSION } };
  const payment = { paid_at: '2025-12-31T23:30:00Z' };
  const fallback = await captureInvoice(modules.robinjr, '2026-01-10T10:00:00Z', user, payment);
  assert.equal(fallback.due_date, '2026-01-01');
  const explicit = await captureInvoice(modules.robinjr, '2026-01-10T10:00:00Z', user, { ...payment, due_date: '2026-02-03' });
  assert.equal(explicit.due_date, '2026-02-03');
});
