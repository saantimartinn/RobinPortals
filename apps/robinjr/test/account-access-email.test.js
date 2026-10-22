// Automated checks for account access email test; external services should remain outside this test boundary.
const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAccountAccessMessage } = require('../lib/account-access-email');

test('el correo de alta incluye las credenciales y el acceso al portal', () => {
  const message = buildAccountAccessMessage({
    name: 'Lucía Martín',
    username: 'lead-42',
    password: 'Clave común segura 2026!',
    loginUrl: 'https://portal.example/portal/',
  });
  assert.match(message.subject, /acceso/i);
  assert.match(message.text, /Lucía/);
  assert.match(message.text, /lead-42/);
  assert.match(message.text, /Clave común segura 2026!/);
  assert.match(message.html, /https:\/\/portal\.example\/portal\//);
});
