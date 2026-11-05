const test = require('node:test');
const assert = require('node:assert/strict');
const { clientKey, validName } = require('../lib/client-folders');

test('la misma persona conserva la carpeta entre CRM y portales por lead_id', () => {
  const leadId = 'cdd8355a-87e9-46e5-af6c-c362cf63001e';
  assert.equal(clientKey('crm', { id: leadId }), `lead:${leadId}`);
  for (const source of ['alumno', 'robinjr', 'community']) {
    assert.equal(clientKey(source, { id: 'be76d6b1-3cb8-48c6-81f7-0a90f16e7978', lead_id: leadId }), `lead:${leadId}`);
  }
});

test('dos cuentas con el mismo correo sin lead_id no se agrupan', () => {
  const email = 'compartido@example.com';
  assert.notEqual(
    clientKey('alumno', { id: '01f3caf8-8dd0-4027-8c59-dc010bc6f7d0', email }),
    clientKey('community', { id: 'a852c808-5d38-4b27-8515-a21f884f8de8', email }),
  );
});

test('el nombre de carpeta se normaliza y tiene límite', () => {
  assert.equal(validName('  Curso   2027  '), 'Curso 2027');
  assert.throws(() => validName('   '), /invalid_name/);
  assert.throws(() => validName('x'.repeat(81)), /invalid_name/);
});
