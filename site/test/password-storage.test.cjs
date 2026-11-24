const assert = require('node:assert/strict');
const test = require('node:test');

for (const [name, auth] of [
  ['Portal', require('../../apps/portal/lib/auth.js')],
  ['RobinJr', require('../../apps/robinjr/lib/auth.js')],
  ['Community', require('../../apps/community/backend/lib/auth.js')],
  ['Admin', require('../../apps/admin/lib/auth.js')],
]) {
  test(`${name} only authenticates bcrypt passwords`, () => {
    const password = 'Synthetic-test-password!';
    const stored = auth.hashPassword(password);
    assert.match(stored, /^\$2[aby]\$12\$/);
    assert.notEqual(stored, auth.hashPassword(password));
    assert.equal(stored.includes(password), false);
    assert.equal(auth.verifyPassword(password, stored), true);
    assert.equal(auth.verifyPassword('wrong-password', stored), false);
    assert.equal(auth.verifyPassword(password, `plain:v1:${password}`), false);
    assert.equal(auth.verifyPassword(password, password), false);
    for (const invalid of [null, undefined, {}, '', 'invalid-hash']) {
      assert.equal(auth.verifyPassword(password, invalid), false);
    }
  });

  test(`${name} rejects passwords bcrypt would silently truncate`, () => {
    const limit = 'a'.repeat(72);
    const stored = auth.hashPassword(limit);
    assert.equal(auth.verifyPassword(limit, stored), true);
    assert.equal(auth.verifyPassword(limit + 'different', stored), false);
    assert.throws(() => auth.hashPassword(limit + 'different'));
    assert.throws(() => auth.hashPassword('é'.repeat(37)));
  });
}
