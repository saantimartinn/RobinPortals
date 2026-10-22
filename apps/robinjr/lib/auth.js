/**
 * Auth helpers para Netlify Functions.
 * - bcrypt para hashing de password
 * - JWT para sesion (cookie httpOnly)
 * - sin estado en servidor (todo en la cookie)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parse: parseCookies, serialize: serializeCookie } = require('cookie');

const COOKIE_NAME = 'robin_portal_session';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 dias

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return s;
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}
function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signSession(user) {
  const payload = { uid: user.id, lead_id: user.lead_id, username: user.username, role: user.role };
  if (user.auth_source) payload.auth_source = user.auth_source;
  if (user.auth_source === 'application_admin') {
    payload.auth_source = 'application_admin';
    payload.is_application_admin = true;
    payload.is_pro_admin = true;
    payload.visible_tabs = Array.isArray(user.visible_tabs) ? user.visible_tabs : [];
    payload.email = user.email || null;
    payload.nombre = user.nombre || null;
    payload.apellidos = user.apellidos || null;
  }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', algorithm: 'HS256' });
}

function buildSessionCookie(token, { clear = false } = {}) {
  return serializeCookie(COOKIE_NAME, clear ? '' : token, {
    httpOnly: true,
    secure: true,            // En Netlify siempre es HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: clear ? 0 : COOKIE_MAX_AGE_S,
  });
}

function readSessionFromEvent(event) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const cookies = parseCookies(header || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const session = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return ['application_sso', 'application_admin'].includes(session.auth_source) ? session : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signSession,
  buildSessionCookie,
  readSessionFromEvent,
};
