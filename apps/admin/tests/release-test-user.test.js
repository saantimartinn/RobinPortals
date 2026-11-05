const test = require('node:test');
const assert = require('node:assert/strict');
const { isReleaseTestUser } = require('../../../packages/auth/release-test.cjs');

test('solo dos marcadores técnicos identifican una cuenta de las pruebas', () => {
  assert.equal(isReleaseTestUser({ nombre: 'TEST Robin', lead_id: '1234', email: 'cliente@example.com' }), false);
  assert.equal(isReleaseTestUser({ lead_id: 'ROBIN_RELEASE_TEST_1234', email: 'cliente@example.com' }), false);
  assert.equal(isReleaseTestUser({ lead_id: '1234', email: 'test-1234@release-test.invalid' }), false);
  assert.equal(isReleaseTestUser({ lead_id: 'ROBIN_RELEASE_TEST_1234', email: 'test-1234@release-test.invalid' }), true);
});
