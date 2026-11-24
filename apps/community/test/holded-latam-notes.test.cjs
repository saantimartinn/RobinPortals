const test = require('node:test');
const assert = require('node:assert/strict');
const billing = require('../backend/lib/subscription-billing');

const legalNote = 'Operación no sujeta al IVA español por aplicación de las reglas de localización del artículo 69.Dos.d) de la Ley 37/1992 del IVA.';

function subscriptionDb(provider, already = false) {
  const invoice = { id: 'invoice-row', ...(provider === 'Revolut' ? { order_id: 'order-test' } : { stripe_invoice_id: 'in-test' }), amount: 49.99, currency: 'EUR', holded_invoice_id: already ? 'issued-invoice' : null };
  const subscriber = { id: 'subscriber-1', portal_user_id: 'portal-1', email: 'test@example.test', holded_contact_id: 'contact-1' };
  const writes = [];
  return { writes, from(table) {
    return {
      select() { return this; }, eq() { return this; }, in() { return this; }, upsert() { return this; },
      update(value) { this.value = value; writes.push({ table, value }); return this; },
      single: async () => ({ data: table === 'subscribers' ? subscriber : invoice }),
      maybeSingle: async () => ({ data: invoice }),
      limit: async () => ({ data: [subscriber] }),
      then(resolve) { resolve({ data: this.value?.billing_status === 'processing' ? [invoice] : null }); },
    };
  } };
}

function mockBilling(t, pais) {
  const keys = ['HOLDED_API_PAT', 'PORTAL_SUPABASE_URL', 'PORTAL_SUPABASE_SERVICE_ROLE_KEY'];
  const original = keys.map((key) => process.env[key]);
  process.env.HOLDED_API_PAT = 'pat_test';
  process.env.PORTAL_SUPABASE_URL = 'https://portal.example.test';
  process.env.PORTAL_SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  t.after(() => keys.forEach((key, i) => {
    if (original[i] === undefined) delete process.env[key]; else process.env[key] = original[i];
  }));
  const invoices = [];
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin === 'https://portal.example.test') {
      assert.equal(url.pathname, '/rest/v1/users');
      return Response.json({ id: 'portal-1', origin: 'otros', pais, holded_contact_id: 'contact-1' });
    }
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

function processInvoice(provider, db, pais) {
  if (provider === 'Stripe') return billing.processStripeInvoice(db, { id: 'in-test', amount_paid: 4999, currency: 'EUR', subscription: 'subscription-test' });
  return billing.processRevolutOrder(db, {
    subscriber_id: 'subscriber-1', subscription_id: 'subscription-test',
    billing_info: { name: 'Cliente de prueba', taxId: 'TEST123', country: pais, address: 'Dirección de prueba' },
  }, { id: 'cycle-test' }, { id: 'order-test', state: 'completed', amount: 4999, currency: 'EUR' });
}

for (const provider of ['Stripe', 'Revolut']) {
  test(`${provider}: la suscripción LATAM imprime la frase exacta con su referencia`, async (t) => {
    const invoices = mockBilling(t, 'México');
    const db = subscriptionDb(provider);
    const result = await processInvoice(provider, db, 'México');
    assert.equal(result.ok, true);
    assert.equal(invoices.length, 1);
    const reference = `The Robin Plan · ${provider} ${provider === 'Stripe' ? 'in-test' : 'order-test'}`;
    assert.equal(invoices[0].notes, `${reference}\n${legalNote}`);
    assert.equal(invoices[0].body, `${reference}\n${legalNote}`);
    assert.doesNotMatch(invoices[0].body, /sin impuestos/i);
    assert.deepEqual(invoices[0].items[0].taxes, []);
    assert.equal(invoices[0].items[0].price, 49.99);
    assert.ok(db.writes.some(({ value }) => value.billing_status === 'invoiced'));
  });

  test(`${provider}: conserva las observaciones de las suscripciones que no son LATAM`, async (t) => {
    const invoices = mockBilling(t, 'Estados Unidos');
    const result = await processInvoice(provider, subscriptionDb(provider), 'Estados Unidos');
    assert.equal(result.ok, true);
    const reference = `The Robin Plan · ${provider} ${provider === 'Stripe' ? 'in-test' : 'order-test'}`;
    assert.equal(invoices[0].notes, reference);
    assert.equal(invoices[0].body, undefined);
  });

  test(`${provider}: las facturas ya emitidas no se recrean ni se modifican`, async (t) => {
    mockBilling(t, 'México');
    t.mock.method(globalThis, 'fetch', () => assert.fail('No debe contactar Holded ni el portal'));
    const result = await processInvoice(provider, subscriptionDb(provider, true), 'México');
    assert.equal(result.already, true);
  });
}
