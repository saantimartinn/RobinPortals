// Automated checks for admins test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { canonicalAdvisorEmail, isAdminEmail } = require('../lib/admins');

test('los asesores usan únicamente el email canónico configurado', () => {
  assert.equal(canonicalAdvisorEmail(' MARIA@PROJECT-ROBIN.COM '), 'maria@project-robin.com');
  assert.equal(isAdminEmail('maria@project-robin.com'), true);
  assert.equal(isAdminEmail('maria@example.com'), false);
  assert.equal(isAdminEmail('María'), false);
});
