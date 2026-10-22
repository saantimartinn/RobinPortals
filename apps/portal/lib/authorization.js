/**
 * Predicados de autorización compartidos por las Netlify Functions.
 *
 * No autentica peticiones ni sustituye `readSessionFromEvent`: clasifica una
 * sesión/fila ya autenticada sin conceder permisos desde datos del frontend.
 */
const { ADMIN_EMAILS } = require('./admins');
const {
  hasApplicationAdminRole,
  normalizeApplicationRole,
} = require('../shared/application-roles.cjs');

function normalizeEmail(value) {
  const raw = value && typeof value === 'object'
    ? (value.email || value.username || '')
    : value;
  return String(raw || '').trim().toLowerCase();
}

function isListedAdvisor(value) {
  return ADMIN_EMAILS.has(normalizeEmail(value));
}

function isApplicationAdmin(value) {
  if (!value || typeof value !== 'object') return false;
  return hasApplicationAdminRole(value) || isListedAdvisor(value);
}

function isDeveloperAdmin(value) {
  return isApplicationAdmin(value) && normalizeEmail(value) === 'santimartin1203@gmail.com';
}

function canUseStudentPortal(value) {
  if (!isApplicationAdmin(value)) return false;
  const email = normalizeEmail(value);
  if (['noel@project-robin.com', 'maria@project-robin.com', 'manuel@project-robin.com', 'santimartin1203@gmail.com'].includes(email)) return true;
  return Array.isArray(value.visible_tabs) && value.visible_tabs.includes('platform.student_portal');
}

function ownsRecord(actor, record, ownerKey = 'user_id') {
  if (!actor || !record || actor.id == null || record[ownerKey] == null) return false;
  return String(actor.id) === String(record[ownerKey]);
}

module.exports = {
  normalizeEmail,
  normalizeApplicationRole,
  hasApplicationAdminRole,
  isListedAdvisor,
  isApplicationAdmin,
  isDeveloperAdmin,
  canUseStudentPortal,
  ownsRecord,
};
