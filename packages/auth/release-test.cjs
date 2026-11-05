'use strict';

// Both markers must match. A customer's name containing "test" is never enough
// to suppress integrations or make that customer eligible for cleanup.
const LEAD_PREFIX = 'ROBIN_RELEASE_TEST_';
const EMAIL_DOMAIN = '@release-test.invalid';

function isReleaseTestUser(user) {
  return String(user?.lead_id || '').startsWith(LEAD_PREFIX)
    && String(user?.email || '').toLowerCase().endsWith(EMAIL_DOMAIN);
}

module.exports = { LEAD_PREFIX, EMAIL_DOMAIN, isReleaseTestUser };
