// Automated checks for sandbox mode test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isIsolatedSandbox } = require('../lib/sandbox-mode');

test('isolates non-production Revolut sandbox deploys', () => {
  assert.equal(isIsolatedSandbox({
    PAYMENT_PROVIDER: 'revolut',
    REVOLUT_API_BASE: 'https://sandbox-merchant.revolut.com',
    CONTEXT: 'branch-deploy',
  }), true);
});

test('never isolates production or live Revolut', () => {
  assert.equal(isIsolatedSandbox({
    PAYMENT_PROVIDER: 'revolut',
    REVOLUT_API_BASE: 'https://sandbox-merchant.revolut.com',
    CONTEXT: 'production',
  }), false);
  assert.equal(isIsolatedSandbox({
    PAYMENT_PROVIDER: 'revolut',
    REVOLUT_API_BASE: 'https://merchant.revolut.com',
    CONTEXT: 'branch-deploy',
  }), false);
});
