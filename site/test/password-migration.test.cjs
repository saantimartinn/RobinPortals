const test = require('node:test');
const assert = require('node:assert/strict');
const { migratePasswords } = require('../../dev/migrate-legacy-passwords.cjs');

function mockSupabase(rows) {
  const writes = [];
  return {
    writes,
    from(table) {
      assert.equal(table, 'users');
      return {
        select() { return this; },
        like() { return this; },
        order() { return this; },
        limit() { return this; },
        gt() { return this; },
        then(resolve) { resolve({ data: rows, error: null }); },
        update(values) { this.values = values; return this; },
        eq(key, value) { this[key] = value; return this; },
        maybeSingle() {
          writes.push({ values: this.values, id: this.id, old: this.password_hash });
          return Promise.resolve({ data: { id: this.id }, error: null });
        },
      };
    },
  };
}

test('legacy password migration preview counts records without writing', async () => {
  const sb = mockSupabase([{ id: '1', password_hash: 'plain:v1:unchanged-password' }]);
  const result = await migratePasswords({ sb, table: 'users', hashPassword: () => '$2b$12$hash', apply: false });
  assert.deepEqual(result, { found: 1, migrated: 0, blocked: 0, conflicts: 0, errors: 0 });
  assert.equal(sb.writes.length, 0);
});

test('migration preserves the password and conditionally replaces its legacy value', async () => {
  const sb = mockSupabase([{ id: '1', password_hash: 'plain:v1:unchanged-password' }]);
  const result = await migratePasswords({ sb, table: 'users', hashPassword: (value) => `hashed:${value}`, apply: true });
  assert.deepEqual(result, { found: 1, migrated: 1, blocked: 0, conflicts: 0, errors: 0 });
  assert.deepEqual(sb.writes, [{ values: { password_hash: 'hashed:unchanged-password' }, id: '1', old: 'plain:v1:unchanged-password' }]);
});

test('migration blocks credentials that bcrypt cannot store without truncation', async () => {
  const sb = mockSupabase([{ id: '1', password_hash: `plain:v1:${'x'.repeat(73)}` }]);
  const result = await migratePasswords({ sb, table: 'users', hashPassword: () => assert.fail('must not hash blocked value'), apply: true });
  assert.deepEqual(result, { found: 1, migrated: 0, blocked: 1, conflicts: 0, errors: 0 });
  assert.equal(sb.writes.length, 0);
});
