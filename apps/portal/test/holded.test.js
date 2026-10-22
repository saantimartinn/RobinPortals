// Automated checks for holded test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const holded = require('../lib/holded');

const user = { lead_id: '1842', nombre: 'María', apellidos: 'García', tipo: 'general', contract_data: { cliente: { nombre: 'María García' } } };

test('construye conceptos principales y sufijo del titular', () => {
  assert.equal(holded.invoiceConcept(user, { installment: 1 }), 'Servicio de acompañamiento universitario – Cuota 1/3 – Asesoramiento inicial');
  assert.equal(holded.billingHolderName(user), 'María García');
  assert.equal(holded.shortLeadId(user), '1842');
});

test('construye Pack Llegada, personalizado e IELTS sin duplicar sufijo', () => {
  assert.match(holded.invoiceConcept({ ...user, tipo: 'llegada' }, { installment: 2 }), /Pack Llegada – Cuota 2\/2 – Alojamiento reservado/);
  assert.equal(holded.invoiceConcept(user, { concept: 'Revisión – María García – ID 1842' }), 'Revisión');
  assert.equal(holded.invoiceConcept(user, { payment_data: { ielts_preset: 'class', ielts_mode: 'individual', ielts_hours: 4 } }), 'Clase de preparación de inglés/IELTS – Individual – 4 horas');
});

test('calcula el importe final personalizado como base más IVA', () => {
  const { invoiceBreakdown } = require('../shared/financial-config.cjs');
  assert.deepEqual(invoiceBreakdown(121, user, 21), { gross: 121, base: 100, tax: 21, taxRate: 21 });
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
