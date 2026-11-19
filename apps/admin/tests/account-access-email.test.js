const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAccountAccessMessage } = require('../lib/account-access-email');

test('Llegada credentials lead into its onboarding and then the existing Community view', () => {
  const message = buildAccountAccessMessage({ name: 'Ana Cliente', username: 'ana@example.test', password: 'initial-test-password', targetPortal: 'alumno', clientType: 'llegada', loginUrl: 'https://portal.test/portal/?next=%2Ftherobinplan%2F' });
  assert.match(message.subject, /Pack Llegada/);
  for (const body of [message.text, message.html]) {
    assert.match(body, /ana@example.test/);
    assert.match(body, /initial-test-password/);
    assert.match(body, /Pack Llegada/);
    assert.match(body, /identidad, contrato y primer pago/);
    assert.match(body, /next=%2Ftherobinplan%2F/);
    assert.doesNotMatch(body, /proceso de aplicación/);
  }
});

test('other products retain their access email destinations', () => {
  const message = buildAccountAccessMessage({ username: 'test', password: 'test', targetPortal: 'community', loginUrl: 'https://portal.test/portal/' });
  assert.equal(message.subject, 'Tu acceso a Robin Community');
  assert.match(message.text, /acceso a Community/);
  assert.doesNotMatch(message.text, /Pack Llegada/);
});
