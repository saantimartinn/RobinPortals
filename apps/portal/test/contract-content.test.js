// Automated checks for contract content test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { PRIVACY_EMAIL, VARIANTS, contractVariant, variantKey, fill } = require('../shared/contract-content.cjs');
const { GENERAL_PRICE_VERSION, usesInternational2700Plan } = require('../shared/financial-config.cjs');

function contractText(key) {
  return VARIANTS[key].blocks
    .flatMap((block) => [block.text, ...(block.items || [])])
    .filter(Boolean)
    .join('\n');
}

test('las cinco categorías contractuales 2027 están disponibles', () => {
  assert.deepEqual(Object.keys(VARIANTS).sort(), ['delft', 'general', 'general_noes', 'llegada', 'mentoria']);
  assert.equal(variantKey('general', false), 'general');
  assert.equal(variantKey('general', true), 'general_noes');
  assert.equal(variantKey('delft', false), 'delft');
  assert.equal(variantKey('delft', true), 'general_noes');
  assert.equal(variantKey('llegada', false), 'llegada');
  assert.equal(variantKey('mentoria', false), 'mentoria');
});

test('el contrato de 2.700 € sigue exactamente la misma regla que las cuotas', () => {
  const cases = [
    [{ origin: 'otros', pais: 'México', has_eu_id: true }, true],
    [{ origin: 'otros', pais: 'Brasil', has_eu_id: false }, true],
    [{ origin: 'otros', pais: 'Alemania', has_eu_id: false }, true],
    [{ origin: 'otros', pais: 'Alemania', has_eu_id: true }, false],
    [{ origin: 'espana', pais: null, has_eu_id: null }, false],
  ];

  for (const [user, expected2700] of cases) {
    const plan2700 = usesInternational2700Plan(user);
    assert.equal(plan2700, expected2700);
    assert.equal(variantKey('general', plan2700), expected2700 ? 'general_noes' : 'general');
  }
});

test('todos los contratos usan el contacto de privacidad confirmado', () => {
  assert.equal(PRIVACY_EMAIL, 'hello@project-robin.com');
  for (const key of Object.keys(VARIANTS)) {
    assert.match(contractText(key), /hello@project-robin\.com/, key);
    assert.doesNotMatch(contractText(key), /info@project-robin\.com/, key);
  }
});

test('todos los contratos usan la dirección dinámica recogida del alumno', () => {
  for (const key of Object.keys(VARIANTS)) {
    assert.match(contractText(key), /Dirección completa: \{\{DIRECCION\}\}/, key);
  }
  assert.equal(fill('{{DIRECCION}}', { DIRECCION: 'Calle de prueba 1' }), 'Calle de prueba 1');
});

test('cada categoría mantiene sus servicios e importes propios', () => {
  assert.match(contractText('general'), /Aplicación a 1 grado: 1\.999 €/);
  assert.match(contractText('general_noes'), /coste total de 2\.700 €/);
  assert.match(contractText('general_noes'), /Gestión del proceso de visado/);
  assert.match(contractText('delft'), /Ingeniería Aeroespacial en Delft/);
  assert.match(contractText('delft'), /2\.999 €/);
  assert.match(contractText('llegada'), /Extra Housing en Piso: 450 €/);
  assert.match(contractText('mentoria'), /El precio de la mentoría es de 800 €/);
  assert.doesNotMatch(contractText('mentoria'), /correspondientes al programa Pack Llegada Robin/);
  assert.doesNotMatch(contractText('mentoria'), /El pago del Pack Llegada/);
});

test('un contrato General sin versión usa tarifa vigente y la histórica requiere marca explícita', () => {
  const text = (variant) => variant.blocks.flatMap((block) => [block.text, ...(block.items || [])]).filter(Boolean).join('\n');
  const currentByDefault = text(contractVariant('general', false, null));
  const historical = text(contractVariant('general', false, 'general-1700-2000-2100-v1'));
  const current = text(contractVariant('general', false, GENERAL_PRICE_VERSION));
  assert.match(currentByDefault, /Aplicación a 1 grado: 1\.999 €/);
  assert.match(historical, /Aplicación a 1 grado: 1\.700 €/);
  assert.match(historical, /Un tercio \(1\/3\) del total al inicio/);
  assert.match(current, /Aplicación a 1 grado: 1\.999 €/);
  assert.match(current, /La primera cuota será siempre de 666,33 €/);
});

test('todos los servicios terminan el 14 de septiembre de 2027 y migran a suscripción', () => {
  for (const key of Object.keys(VARIANTS)) {
    const text = contractText(key);
    assert.match(text, /14 de septiembre de 2027/, key);
    assert.match(text, /15 de septiembre de 2027/, key);
    assert.match(text, /suscripción ROBIN/, key);
  }
});
