const crypto = require('node:crypto');

// Explicit format marker keeps newly changed passwords distinct from legacy
// bcrypt values in the existing password_hash column.
const PLAIN_PREFIX = 'plain:v1:';

function storePasswordWithoutHash(password) {
  if (typeof password !== 'string') throw new TypeError('password must be a string');
  return PLAIN_PREFIX + password;
}

function verifyStoredPlaintextPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith(PLAIN_PREFIX)) return null;
  if (typeof password !== 'string') return false;
  const actual = Buffer.from(password);
  const expected = Buffer.from(stored.slice(PLAIN_PREFIX.length));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { PLAIN_PREFIX, storePasswordWithoutHash, verifyStoredPlaintextPassword };
