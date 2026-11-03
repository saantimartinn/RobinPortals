const test = require('node:test');
const assert = require('node:assert/strict');
const { accountFor, ACCOUNT_BY_TIPO } = require('../lib/holded');

test('Alumno clasifica el plan UE, LATAM y las clases de inglés en sus cuentas', () => {
  const spain = { origin: 'espana', pais: 'España' };
  const peru = { origin: 'otros', pais: 'Perú', has_eu_id: false };
  assert.equal(accountFor('general', spain, {}), ACCOUNT_BY_TIPO.general);
  assert.equal(accountFor('general', peru, {}), process.env.HOLDED_ACCOUNT_LATAM_PLANS || '70500007');
  assert.equal(accountFor('general', spain, { payment_data: { ielts_preset: 'evaluation' } }), process.env.HOLDED_ACCOUNT_ENGLISH || '70500008');
});
