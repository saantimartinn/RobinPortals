const test = require('node:test');
const assert = require('node:assert/strict');

const generators = [
  ['portal', require('../lib/holded').generateInvoiceForPaymentRow],
  ['admin', require('../../admin/lib/holded/payment-invoice').generateInvoiceForPaymentRow],
  ['robinjr', require('../../robinjr/lib/holded').generateInvoiceForPaymentRow],
];

function fakeSupabase() {
  const payment = { id: 'payment-1', user_id: 'user-1', installment: 1, amount: 666.33, currency: 'EUR', status: 'paid', payment_data: {} };
  const user = { id: 'user-1', lead_id: 'lead-1', nombre: 'Test', apellidos: 'Client', tipo: 'general', origin: 'espana', holded_contact_id: 'contact-1' };
  let claim = null;
  let failApply = false;

  function from(table) {
    const query = {
      updateValue: null,
      select() { return this; },
      eq() { return this; },
      is() { return this; },
      update(value) { this.updateValue = value; return this; },
      async insert(value) {
        if (table === 'webhook_log') return { error: null };
        if (claim) return { error: { code: '23505' } };
        claim = { payment_id: value.payment_id, invoice_data: null };
        return { error: null };
      },
      async single() {
        return { data: table === 'payments' ? { ...payment, payment_data: { ...payment.payment_data } }
          : table === 'users' ? user : claim, error: null };
      },
      async then(resolve, reject) {
        if (table === 'holded_invoice_claims' && this.updateValue) {
          claim.invoice_data = this.updateValue.invoice_data;
          return resolve({ data: [{ payment_id: payment.id }], error: null });
        }
        return resolve({ data: null, error: null });
      },
    };
    return query;
  }

  return {
    from,
    get payment() { return payment; },
    set failApply(value) { failApply = value; },
    async rpc(name, args) {
      assert.equal(name, 'apply_holded_invoice_data');
      if (failApply) return { data: null, error: { message: 'temporary_database_error' } };
      Object.assign(payment.payment_data, args.p_invoice_data);
      return { data: true, error: null };
    },
  };
}

test('una sola factura con tres confirmaciones simultáneas en cada portal', async () => {
  const originalFetch = global.fetch;
  const originalPat = process.env.HOLDED_API_PAT;
  process.env.HOLDED_API_PAT = 'test';
  try {
    for (const [name, generate] of generators) {
      const sb = fakeSupabase();
      let posts = 0;
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      global.fetch = async (url, options) => {
        if (options.method === 'POST' && url.endsWith('/invoices')) {
          posts += 1;
          await gate;
          return { ok: true, text: async () => JSON.stringify({ id: 'invoice-1' }) };
        }
        return { ok: true, text: async () => JSON.stringify({ document_number: 'F-1' }) };
      };

      const pending = [generate(sb, 'payment-1'), generate(sb, 'payment-1'), generate(sb, 'payment-1')];
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(posts, 1, name);
      release();
      const results = await Promise.all(pending);
      assert.equal(results.filter((result) => result.invoice_id === 'invoice-1').length, 1, name);
      assert.equal(sb.payment.payment_data.holded_invoice_id, 'invoice-1', name);
      assert.equal((await generate(sb, 'payment-1')).already, true, name);
      assert.equal(posts, 1, name);
    }
  } finally {
    global.fetch = originalFetch;
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT;
    else process.env.HOLDED_API_PAT = originalPat;
  }
});

test('recupera una factura creada si falló el guardado en payments', async () => {
  const originalFetch = global.fetch;
  const originalPat = process.env.HOLDED_API_PAT;
  process.env.HOLDED_API_PAT = 'test';
  const sb = fakeSupabase();
  sb.failApply = true;
  let posts = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'POST' && url.endsWith('/invoices')) posts += 1;
    return { ok: true, text: async () => JSON.stringify({ id: 'invoice-1' }) };
  };
  try {
    const generate = generators[0][1];
    assert.equal((await generate(sb, 'payment-1')).ok, false);
    sb.failApply = false;
    assert.equal((await generate(sb, 'payment-1')).already, true);
    assert.equal(sb.payment.payment_data.holded_invoice_id, 'invoice-1');
    assert.equal(posts, 1);
  } finally {
    global.fetch = originalFetch;
    if (originalPat === undefined) delete process.env.HOLDED_API_PAT;
    else process.env.HOLDED_API_PAT = originalPat;
  }
});
