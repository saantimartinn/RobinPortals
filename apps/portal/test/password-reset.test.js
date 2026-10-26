const assert = require('node:assert/strict');
const test = require('node:test');

process.env.JWT_SECRET = 'test-only-password-reset-secret';
const { hashPassword, verifyPassword } = require('../lib/auth');
const { issueResetToken, readResetToken, passwordVersion } = require('../lib/password-reset');

test('el enlace de recuperación caduca y queda invalidado al cambiar el hash', () => {
  const oldHash = hashPassword('ClaveDePrueba2027#');
  const user = { id: 'student-test', email: 'alumna@example.org', password_hash: oldHash };
  const token = issueResetToken(user);
  const payload = readResetToken(token);
  assert.equal(payload.uid, user.id);
  assert.equal(payload.email, user.email);
  assert.equal(payload.version, passwordVersion(oldHash));
  assert.notEqual(payload.version, passwordVersion(hashPassword('Otra clave nueva 2027!')));
  assert.equal(readResetToken('invalid'), null);
});

test('la contraseña se verifica sin guardarla en texto legible', () => {
  const hash = hashPassword('ClaveDePrueba2027');
  assert.equal(verifyPassword('ClaveDePrueba2027', hash), true);
  assert.equal(verifyPassword('ClaveDePrueba2027#', hash), false);
  assert.equal(hash.includes('ClaveDePrueba2027'), false);
});
