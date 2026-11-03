const test = require('node:test');
const assert = require('node:assert/strict');
const { accountFor } = require('../lib/holded');

test('Robin Junior y las clases de inglés usan cuentas propias', () => {
  assert.equal(accountFor('general', {}, {}), process.env.HOLDED_ACCOUNT_ROBINJR || '70500006');
  assert.equal(accountFor('general', {}, { payment_data: { ielts_preset: 'class' } }), process.env.HOLDED_ACCOUNT_ENGLISH || '70500008');
});
