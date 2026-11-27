const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveIds, preview, deliver } = require('../../packages/notifications/push-jobs.cjs');

function database(tables) {
  return {
    from(name) {
      let filters = [];
      let operation = 'select';
      let row;
      const query = {
        select() { return this; },
        eq(field, value) { filters.push(item => item[field] === value); return this; },
        in(field, values) { filters.push(item => values.includes(item[field])); return this; },
        order(field) { this.sort = field; return this; },
        range(start, end) { this.start = start; this.end = end; return this; },
        insert(value) { operation = 'insert'; row = value; return this; },
        update(value) { operation = 'update'; row = value; return this; },
        then(resolve, reject) {
          try {
            if (operation === 'insert') {
              const duplicate = tables[name].some(item => item.notification_id === row.notification_id && item.token === row.token);
              if (duplicate) return resolve({ error: { code: '23505' } });
              tables[name].push({ ...row });
              return resolve({ error: null });
            }
            if (operation === 'update') {
              tables[name].filter(item => filters.every(filter => filter(item))).forEach(item => Object.assign(item, row));
              return resolve({ data: [], error: null });
            }
            const selected = tables[name].filter(item => filters.every(filter => filter(item)));
            if (this.sort) selected.sort((a, b) => String(a[this.sort]).localeCompare(String(b[this.sort])));
            return resolve({ data: this.start == null ? selected : selected.slice(this.start, this.end + 1), error: null });
          } catch (error) { return reject(error); }
        },
      };
      return query;
    },
  };
}

test('audience pages through all clients and counts only registered devices', async () => {
  const ids = Array.from({ length: 1205 }, (_, index) => `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`);
  const db = database({
    users: ids.map(id => ({ id, role: 'client', email: `${id}@example.com` })),
    mobile_push_devices: [{ token: 'a'.repeat(64), user_id: ids[1100], enabled: true }, { token: 'b'.repeat(64), user_id: ids[1100], enabled: true }],
  });
  assert.equal((await resolveIds(db, { mode: 'all' }, 'users', user => user.role === 'client')).length, 1205);
  assert.deepEqual(await preview(db, { mode: 'installed' }, 'users', user => user.role === 'client'), { recipients: 1, devices: 2 });
});

test('delivery is claimed once and invalid APNs tokens are disabled', async () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const token = 'a'.repeat(64);
  const tables = { mobile_push_devices: [{ token, user_id: id, enabled: true }], mobile_push_deliveries: [] };
  const db = database(tables);
  const push = async message => { assert.equal(message.body, 'Mensaje visible'); return { accepted: false, status: 410, reason: 'Unregistered' }; };
  const notice = { id, title: 'Aviso', content: 'Mensaje visible', type: 'info' };
  assert.deepEqual(await deliver(db, 'portal', notice, [id], push), { accepted: 0, rejected: 1, review: 0 });
  assert.equal(tables.mobile_push_devices[0].enabled, false);
  assert.deepEqual(await deliver(db, 'portal', notice, [id], push), { accepted: 0, rejected: 0, review: 0 });
  assert.equal(tables.mobile_push_deliveries.length, 1);
});
