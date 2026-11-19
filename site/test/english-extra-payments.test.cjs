const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function fixture(app) {
  const inserted = [];
  const db = {
    from(table) {
      return {
        id: null, row: null,
        select() { return this; },
        eq(key, value) { if (key === 'id') this.id = value; return this; },
        insert(row) { this.row = row; inserted.push(row); return this; },
        async single() {
          if (table === 'users') return { data: this.id === 'admin'
            ? { id: 'admin', role: 'admin', email: 'advisor@example.com' }
            : { id: 'student', nombre: 'Alumno', apellidos: 'Prueba' } };
          return { data: { id: 'payment', ...this.row } };
        },
        then(fulfilled, rejected) { return Promise.resolve({ data: [] }).then(fulfilled, rejected); },
      };
    },
  };
  const filename = resolve(__dirname, `../../apps/${app}/netlify/functions/admin-payments-add.js`);
  const localRequire = createRequire(filename);
  const overrides = {
    '../../lib/supabase': { getSupabase: () => db },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin' }) },
    '../../lib/integration-sync': { syncGoogleSheets: async () => {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(filename, 'utf8'), { module, exports: module.exports, console, Date,
    require: (name) => overrides[name] || localRequire(name) }, { filename });
  const send = (hours, mode = 'individual') => module.exports.handler({
    httpMethod: 'POST', headers: {},
    body: JSON.stringify({ user_id: 'student', preset: 'ielts_class', amount: 1,
      ...(app === 'admin' ? { hours, class_mode: mode } : { ielts_hours: hours, ielts_mode: mode }) }),
  });
  return { inserted, send };
}

for (const app of ['admin', 'portal', 'robinjr']) {
  test(`${app}: arbitrary class quantities keep the existing rate and override client amounts`, async () => {
    for (const [hours, mode, amount] of [[1, 'individual', 33], [5, 'individual', 165], [7, 'group', 115.5], [25, 'group', 412.5]]) {
      const { inserted, send } = fixture(app);
      const response = await send(hours, mode);
      assert.equal(response.statusCode, 200);
      assert.equal(inserted.length, 1);
      assert.equal(inserted[0].amount, amount);
      assert.equal(inserted[0].status, 'unlocked');
      assert.equal(inserted[0].installment, 4);
      assert.equal(inserted[0].payment_data[app === 'admin' ? 'hours' : 'ielts_hours'], hours);
    }
  });

  test(`${app}: invalid class quantities never create a payment`, async () => {
    for (const hours of [undefined, null, '', true, false, 0, -2, 1.5, 'invalid', Number.MAX_SAFE_INTEGER + 1]) {
      const { inserted, send } = fixture(app);
      const response = await send(hours);
      assert.equal(response.statusCode, 400, String(hours));
      assert.equal(inserted.length, 0);
    }
    const { inserted, send } = fixture(app);
    assert.equal((await send(7, 'invalid')).statusCode, 400);
    assert.equal(inserted.length, 0);
  });
}
