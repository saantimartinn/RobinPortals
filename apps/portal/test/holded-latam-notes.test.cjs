const test = require('node:test');
const assert = require('node:assert/strict');

const portals = [
  ['Alumno', require('../lib/holded')],
  ['Robin Jr', require('../../robinjr/lib/holded')],
  ['Admin', require('../../admin/lib/holded')],
];
const legalNote = 'Operación no sujeta al IVA español por aplicación de las reglas de localización del artículo 69.Dos.d) de la Ley 37/1992 del IVA.';
const user = { id: 'user-1', lead_id: '1842', tipo: 'general', origin: 'otros', pais: 'Colombia', holded_contact_id: 'contact-1' };

function mockHolded(t) {
  const invoices = [];
  const originalPat = process.env.HOLDED_API_PAT;
  const originalExempt = process.env.HOLDED_TAX_EXEMPT;
  process.env.HOLDED_API_PAT = 'pat_test';
  process.env.HOLDED_TAX_EXEMPT = 's_iva_exempt';
  t.after(() => {
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT; else process.env.HOLDED_API_PAT = originalPat;
    if (originalExempt === undefined) delete process.env.HOLDED_TAX_EXEMPT; else process.env.HOLDED_TAX_EXEMPT = originalExempt;
  });
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://api.holded.com');
    if (options.method === 'POST') {
      assert.equal(url.pathname, '/api/v2/invoices');
      invoices.push(JSON.parse(options.body));
      return Response.json({ id: 'new-invoice' });
    }
    assert.equal(url.pathname, '/api/v2/invoices/new-invoice');
    return Response.json({ document_number: 'F-TEST' });
  });
  return invoices;
}

for (const [name, holded] of portals) {
  test(`${name}: la observación LATAM conserva la referencia en todos los servicios`, async (t) => {
    const invoices = mockHolded(t);
    const cases = [
      ['general', { installment: 1 }],
      ['delft', { installment: 2 }],
      ['llegada', { installment: 1 }],
      ['mentoria', { installment: 1 }],
      ['general', { installment: 4, concept: 'Extra personalizado' }],
      ['general', { installment: 4, payment_data: { ielts_preset: 'evaluation', vat_treatment: 'exempt', exemption_note: 'Sin impuestos' } }],
      ['general', { installment: 5, payment_data: { ielts_preset: 'class', ielts_hours: 3, vat_treatment: 'exempt' } }],
    ];
    for (const [tipo, payment] of cases) {
      await holded.createInvoiceForPayment(null, { ...user, tipo }, { amount: 121, currency: 'EUR', ...payment });
      const invoice = invoices.at(-1);
      assert.equal(invoice.notes, `Cliente Robin 1842\n${legalNote}`);
      assert.equal(invoice.body, `Cliente Robin 1842\n${legalNote}`);
      assert.doesNotMatch(invoice.body, /sin impuestos|artículo 20\.Uno\.9/i);
    }
    assert.equal(invoices.length, cases.length);
  });

  test(`${name}: no añade la observación LATAM a España, UE ni otros países extracomunitarios`, async (t) => {
    const invoices = mockHolded(t);
    for (const pais of ['España', 'Portugal', 'Francia', 'Estados Unidos', 'China', '']) {
      await holded.createInvoiceForPayment(null, { ...user, pais }, { amount: 121, installment: 1 });
      assert.equal(invoices.at(-1).notes, 'Cliente Robin 1842');
      assert.equal(invoices.at(-1).body, undefined);
    }
  });

  test(`${name}: reconoce el país LATAM o su etiqueta explícita y conserva el ID de referencia`, async (t) => {
    const invoices = mockHolded(t);
    for (const region of [{ pais: 'México' }, { pais: 'Perú' }, { pais: '', origin: 'LATAM' }]) {
      await holded.createInvoiceForPayment(null, { ...user, lead_id: null, ...region }, { amount: 121, installment: 1 });
      assert.equal(invoices.at(-1).notes, `Cliente Robin user-1\n${legalNote}`);
      assert.equal(invoices.at(-1).body, invoices.at(-1).notes);
    }
  });

  test(`${name}: una factura ya emitida se conserva sin contactar Holded`, async (t) => {
    mockHolded(t);
    t.mock.method(globalThis, 'fetch', () => assert.fail('Una factura emitida no debe recrearse ni modificarse'));
    const payment = Object.freeze({ id: 'payment-1', user_id: user.id, amount: 121, status: 'paid', payment_data: Object.freeze({ holded_invoice_id: 'historical-invoice', notes: 'Observación histórica' }) });
    const sb = { from(table) {
      assert.equal(table, 'payments');
      return { select() { return this; }, eq() { return this; }, single: async () => ({ data: payment }) };
    } };
    const result = await holded.generateInvoiceForPaymentRow(sb, payment.id);
    assert.equal(result.already, true);
    assert.equal(result.invoice_id, 'historical-invoice');
    assert.equal(payment.payment_data.notes, 'Observación histórica');
  });
}
