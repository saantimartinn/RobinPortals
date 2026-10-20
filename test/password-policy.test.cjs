// Automated checks for password policy test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, passwordByteLength, passwordPolicy } = require('../shared/password-policy.cjs');

test('la política exige ocho caracteres sin composición arbitraria', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.equal(passwordPolicy('1234567').error, 'password_too_short');
  assert.equal(passwordPolicy('12345678').ok, true);
});

test('respeta el límite real de 72 bytes de bcrypt', () => {
  assert.equal(PASSWORD_MAX_BYTES, 72);
  assert.equal(passwordByteLength('á'), 2);
  assert.equal(passwordPolicy('a'.repeat(72)).ok, true);
  assert.equal(passwordPolicy('a'.repeat(73)).error, 'password_too_long');
  assert.equal(passwordPolicy('á'.repeat(37)).error, 'password_too_long');
});
