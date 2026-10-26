const assert = require('node:assert/strict');
const test = require('node:test');
const { storePasswordWithoutHash, verifyStoredPlaintextPassword } = require('../../packages/auth/password-storage.cjs');

test('a changed password stays readable and still requires an exact match', () => {
  const stored = storePasswordWithoutHash('ClaveNueva2027!');
  assert.equal(stored, 'plain:v1:ClaveNueva2027!');
  assert.equal(verifyStoredPlaintextPassword('ClaveNueva2027!', stored), true);
  assert.equal(verifyStoredPlaintextPassword('ClaveNueva2027?', stored), false);
  assert.equal(verifyStoredPlaintextPassword('x', '$2b$12$legacy'), null);
});

test('all login verifiers accept a manually changed password', () => {
  const stored = storePasswordWithoutHash('ClaveNueva2027!');
  for (const auth of [
    require('../../apps/portal/lib/auth.js'),
    require('../../apps/robinjr/lib/auth.js'),
    require('../../apps/community/backend/lib/auth.js'),
    require('../../apps/admin/lib/auth.js'),
  ]) {
    assert.equal(auth.verifyPassword('ClaveNueva2027!', stored), true);
    assert.equal(auth.verifyPassword('ClaveAnterior2027!', stored), false);
    assert.equal(auth.verifyPassword('ClaveAntigua2027!', auth.hashPassword('ClaveAntigua2027!')), true);
  }
});
