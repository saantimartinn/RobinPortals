// Automated checks for operational config test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  commaSeparated,
  DEFAULT_PUBLIC_BASE_URL,
  DEFAULT_SUPPORT_INBOXES,
  portalUrl,
  publicBaseUrl,
  supportInboxes,
  teamEmail,
} = require('../lib/operational-config');

test('los buzones conservan los destinatarios operativos actuales por defecto', () => {
  assert.deepEqual(supportInboxes({}), [...DEFAULT_SUPPORT_INBOXES]);
  assert.equal(teamEmail({}), DEFAULT_SUPPORT_INBOXES[0]);
});

test('la configuración admite una lista CSV limpia y sin duplicados', () => {
  assert.deepEqual(commaSeparated('ops@example.test, help@example.test,ops@example.test'), [
    'ops@example.test',
    'help@example.test',
  ]);
  assert.deepEqual(supportInboxes({ SUPPORT_INBOXES: 'ops@example.test, help@example.test' }), [
    'ops@example.test',
    'help@example.test',
  ]);
});

test('TEAM_EMAIL es explícito o usa el primer buzón de soporte', () => {
  assert.equal(teamEmail({ SUPPORT_INBOXES: 'ops@example.test' }), 'ops@example.test');
  assert.equal(teamEmail({ TEAM_EMAIL: 'legal@example.test', SUPPORT_INBOXES: 'ops@example.test' }), 'legal@example.test');
});

test('la URL pública usa la configuración de Netlify y nunca el dominio retirado', () => {
  assert.equal(publicBaseUrl({}), DEFAULT_PUBLIC_BASE_URL);
  assert.equal(publicBaseUrl({ PUBLIC_BASE_URL: 'https://example.test/' }), 'https://example.test');
  assert.equal(publicBaseUrl({ URL: 'https://deploy.example.test/' }), 'https://deploy.example.test');
  assert.equal(portalUrl({ PUBLIC_BASE_URL: 'https://example.test/' }), 'https://example.test/portal/');
});
