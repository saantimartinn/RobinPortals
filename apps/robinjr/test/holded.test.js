// Automated checks for holded test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const holded = require('../lib/holded');
const { ROBIN_JR_PRICE_VERSION } = require('../shared/financial-config.cjs');

const user = { lead_id: '1842', nombre: 'María', apellidos: 'García', tipo: 'general', contract_data: { pricing_version: ROBIN_JR_PRICE_VERSION, cliente: { nombre: 'María García' } } };

test('construye conceptos principales y sufijo del titular', () => {
  assert.equal(holded.invoiceConcept(user, { installment: 1 }), 'Robin Junior — 1.ª cuota del programa');
  assert.equal(holded.invoiceConcept(user, { installment: 2 }), 'Robin Junior — 2.ª cuota del programa');
  assert.equal(holded.invoiceConcept(user, { installment: 3 }), 'Robin Junior — 3.ª y última cuota del programa');
  assert.equal(holded.billingHolderName(user), 'María García');
  assert.equal(holded.shortLeadId(user), '1842');
  assert.equal(holded.invoiceConcept({ ...user, contract_data: { pricing_version: 'robin-jr-499-3x-v1' } }, { installment: 1 }), 'Servicio de acompañamiento universitario – Cuota 1/3 – Asesoramiento inicial');
});

test('mantiene conceptos personalizados e IELTS fuera de las tres cuotas', () => {
  assert.equal(holded.invoiceConcept({ ...user, tipo: 'llegada' }, { installment: 2 }), 'Robin Junior — 2.ª cuota del programa');
  assert.equal(holded.invoiceConcept(user, { concept: 'Revisión – María García – ID 1842' }), 'Revisión');
  assert.equal(holded.invoiceConcept(user, { payment_data: { ielts_preset: 'class', ielts_mode: 'individual', ielts_hours: 4 } }), 'Clase de preparación de inglés/IELTS – Individual – 4 horas');
});

test('calcula el importe final personalizado como base más IVA', () => {
  const { invoiceBreakdown } = require('../shared/financial-config.cjs');
  assert.deepEqual(invoiceBreakdown(121, user, 21), { gross: 121, base: 100, tax: 21, taxRate: 21 });
});

test('Holded recibe el concepto exacto de cada cuota Robin Junior', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  const originalPat = process.env.HOLDED_API_PAT;
  global.fetch = async (url, options) => {
    if (url.endsWith('/invoices')) calls.push(JSON.parse(options.body));
    return { ok: true, text: async () => JSON.stringify({ id: 'inv-1' }) };
  };
  const holder = { ...user, holded_contact_id: 'contact-1' };
  try {
    process.env.HOLDED_API_PAT = 'test';
    for (const [installment, amount, concept] of [
      [1, 500, 'Robin Junior — 1.ª cuota del programa'],
      [2, 500, 'Robin Junior — 2.ª cuota del programa'],
      [3, 499, 'Robin Junior — 3.ª y última cuota del programa'],
    ]) {
      await holded.createInvoiceForPayment(null, holder, { installment, amount, currency: 'EUR', due_date: '2027-06-30' });
      const invoice = calls.at(-1);
      assert.equal(invoice.items[0].name, concept);
      assert.equal(invoice.due_date, '2027-06-30');
      assert.equal(invoice.items[0].units, 1);
      assert.equal(invoice.items[0].price + Math.round(invoice.items[0].price * 0.21 * 100) / 100, amount);
    }
  } finally {
    global.fetch = originalFetch;
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT;
    else process.env.HOLDED_API_PAT = originalPat;
  }
});

test('la tercera factura nueva exige la fecha individual antes de llamar a Holded', async () => {
  const originalPat = process.env.HOLDED_API_PAT;
  try {
    process.env.HOLDED_API_PAT = 'test';
    await assert.rejects(
      holded.createInvoiceForPayment(null, { ...user, holded_contact_id: 'contact-1' }, { installment: 3, amount: 499, currency: 'EUR' }),
      /robin_jr_third_due_date_missing/
    );
  } finally {
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT;
    else process.env.HOLDED_API_PAT = originalPat;
  }
});

test('IELTS queda exento y sin retención en el payload de Holded', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, text: async () => JSON.stringify({ id: 'inv-1', document_number: 'F-1' }) };
  };
  const sb = { from() { return { update() { return { eq: async () => ({}) }; } }; } };
  try {
    process.env.HOLDED_API_PAT = 'test';
    await holded.createInvoiceForPayment(sb, user, { amount: 33, currency: 'EUR', installment: 4, payment_data: { ielts_preset: 'evaluation' } });
    const payload = calls.find((call) => call.url.endsWith('/invoices')).body;
    assert.equal(payload.items[0].price, 33);
    assert.deepEqual(payload.items[0].taxes, []);
    assert.equal(payload.retention, 0);
    assert.equal(payload.notes, holded.IELTS_NOTE);
  } finally {
    global.fetch = originalFetch;
    delete process.env.HOLDED_API_PAT;
  }
});
