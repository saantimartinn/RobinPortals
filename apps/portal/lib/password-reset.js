const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const RESET_SCOPE = 'student_password_reset';

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado');
  return process.env.JWT_SECRET;
}

function passwordVersion(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash || '')).digest('hex');
}

function issueResetToken(user) {
  return jwt.sign({
    scope: RESET_SCOPE,
    uid: user.id,
    email: String(user.email || '').trim().toLowerCase(),
    version: passwordVersion(user.password_hash),
  }, secret(), { algorithm: 'HS256', expiresIn: '20m' });
}

function readResetToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), secret(), { algorithms: ['HS256'] });
    return payload.scope === RESET_SCOPE && payload.uid && payload.email && payload.version ? payload : null;
  } catch (_) { return null; }
}

module.exports = { issueResetToken, readResetToken, passwordVersion };
