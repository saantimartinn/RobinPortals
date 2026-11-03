// Automated checks for contract content test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { PRIVACY_EMAIL, VARIANTS, contractVariant, variantKey, schoolYearForDate, fill } = require('../shared/contract-content.cjs');
const { GENERAL_PRICE_VERSION, ROBIN_JR_PRICE_VERSION, usesInternational2700Plan } = require('../shared/financial-config.cjs');

function contractText(key) {
  return VARIANTS[key].blocks
    .flatMap((block) => [block.text, ...(block.items || [])])
    .filter(Boolean)
    .join('\n');
}

test('las variantes contractuales anteriores y Robin Junior están disponibles', () => {
  assert.deepEqual(Object.keys(VARIANTS).sort(), ['delft', 'general', 'general_noes', 'llegada', 'mentoria', 'robin_junior']);
  assert.equal(variantKey('general', false), 'general');
  assert.equal(variantKey('general', true), 'general_noes');
  assert.equal(variantKey('delft', false), 'delft');
  assert.equal(variantKey('delft', true), 'general_noes');
  assert.equal(variantKey('llegada', false), 'llegada');
  assert.equal(variantKey('mentoria', false), 'mentoria');
  assert.equal(variantKey('robin_junior', false), 'general');
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
    assert.match(contractText(key), /\{\{DIRECCION\}\}/, key);
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

test('el contrato General conserva precios históricos solo para clientes existentes', () => {
  const text = (variant) => variant.blocks.flatMap((block) => [block.text, ...(block.items || [])]).filter(Boolean).join('\n');
  const historical = text(contractVariant('general', false, null));
  const current = text(contractVariant('general', false, GENERAL_PRICE_VERSION));
  assert.match(historical, /Aplicación a 1 grado: 1\.700 €/);
  assert.match(historical, /Un tercio \(1\/3\) del total al inicio/);
  assert.match(current, /Aplicación a 1 grado: 1\.999 €/);
  assert.match(current, /La primera cuota será siempre de 666,33 €/);
});

test('todos los servicios terminan el 14 de septiembre de 2027 y migran a suscripción', () => {
  for (const key of Object.keys(VARIANTS).filter((key) => key !== 'robin_junior')) {
    const text = contractText(key);
    assert.match(text, /14 de septiembre de 2027/, key);
    assert.match(text, /15 de septiembre de 2027/, key);
    assert.match(text, /suscripción ROBIN/, key);
  }
});

test('la nueva versión selecciona el contrato Robin Junior para cualquier alta de este portal', () => {
  for (const tipo of ['general', 'delft', 'mentoria', 'llegada']) {
    assert.equal(contractVariant(tipo, false, ROBIN_JR_PRICE_VERSION).key, 'robin_junior');
    assert.equal(contractVariant(tipo, true, ROBIN_JR_PRICE_VERSION).key, 'robin_junior');
  }
  assert.equal(contractVariant('general', false, GENERAL_PRICE_VERSION).key, 'general');
  assert.equal(contractVariant('general', false, null).key, 'general_historical');
});

test('Robin Junior reproduce el alcance y las cuotas del modelo sin datos del cliente firmado', () => {
  const text = contractText('robin_junior');
  for (const phrase of [
    'ocho sesiones', 'Mentorías individuales', 'Mentorías grupales', 'Diagnóstico de inglés',
    'Summer School', 'Open Days', 'no incluye la presentación de solicitudes',
    '1.499 €', 'Primera cuota: 500 €', 'Segunda cuota: 500 €',
    'Tercera y última cuota: 499 €', 'siete días hábiles',
    'descuento del 10 %', '{{CURSO_ESCOLAR}}',
  ]) assert.ok(text.includes(phrase), phrase);
  assert.doesNotMatch(text, /Martina|Chamero|51558757W|46749756W/);
  assert.doesNotMatch(text, /alojamiento garantizado en residencia partner|14 de septiembre de 2027/i);
  assert.equal(schoolYearForDate('2026-11-03T12:00:00Z'), '2026–2027');
  assert.equal(schoolYearForDate('2027-02-01T12:00:00Z'), '2026–2027');
});
