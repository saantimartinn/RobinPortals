// Automated checks for financial config test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APPLICATION_TOTALS,
  DELFT_PRICE_VERSION,
  GENERAL_PRICE_VERSION,
  applicationPlan,
  applicationPlanForUser,
  invoiceBreakdown,
  isLatamClient,
  pricingVersionForNewUser,
  taxRateForClient,
} = require('../shared/financial-config.cjs');
const { latamPlanWithPaidAmounts } = require('../lib/payments');
const { taxCodesFor, taxRateFor: holdedTaxRateFor } = require('../lib/holded');
const { VARIANTS } = require('../shared/contract-content.cjs');

test('cada plan de aplicación cuadra exactamente con su total canónico', () => {
  for (const careers of [1, 2, 3]) {
    const total = applicationPlan('general', careers).reduce((sum, row) => sum + row.amount, 0);
    assert.equal(total, APPLICATION_TOTALS.general[careers]);
  }
  assert.equal(applicationPlan('delft').reduce((s, r) => s + r.amount, 0), APPLICATION_TOTALS.delft);
  assert.equal(applicationPlan('llegada').reduce((s, r) => s + r.amount, 0), APPLICATION_TOTALS.llegada);
  assert.equal(applicationPlan('mentoria').reduce((s, r) => s + r.amount, 0), APPLICATION_TOTALS.mentoria);
  assert.equal(applicationPlan('general', 1, 'otros', false).reduce((s, r) => s + r.amount, 0), APPLICATION_TOTALS.international);
});

test('LATAM siempre suma 2.700 €, incluso con documento europeo o etiqueta directa', () => {
  const clients = [
    { origin: 'otros', pais: 'México', has_eu_id: true },
    { origin: 'otros', pais: 'Colombia', has_eu_id: false },
    { origin: 'latam', pais: null, has_eu_id: true },
    { tipo: 'Pack LATAM', origin: 'espana', has_eu_id: true },
  ];

  for (const client of clients) {
    assert.equal(isLatamClient(client), true);
    const rows = applicationPlanForUser({ tipo: 'general', num_carreras: 3, ...client });
    assert.deepEqual(rows, [
      { installment: 1, amount: 900 },
      { installment: 2, amount: 900 },
      { installment: 3, amount: 900 },
    ]);
    assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 2700);
  }
});

test('si LATAM ya pagó una cuota histórica, las pendientes se ajustan para sumar 2.700 €', () => {
  const rows = latamPlanWithPaidAmounts(applicationPlan('general', 1, 'latam'), [
    { installment: 1, amount: 666.33, status: 'paid' },
  ]);

  assert.equal(rows[0].amount, 666.33);
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 2700);
});

test('las facturas LATAM salen sin IVA tanto en el cálculo común como en Holded', () => {
  const latam = { origin: 'otros', pais: 'Perú', has_eu_id: true };
  assert.equal(taxRateForClient(latam), 0);
  assert.equal(holdedTaxRateFor(latam), 0);
  assert.deepEqual(taxCodesFor(holdedTaxRateFor(latam)), []);
  assert.deepEqual(invoiceBreakdown(900, latam), {
    gross: 900,
    base: 900,
    tax: 0,
    taxRate: 0,
  });
  assert.equal(invoiceBreakdown(900, latam, 21).taxRate, 0);

  assert.equal(taxRateForClient({ origin: 'espana', pais: 'España' }), 21);
  assert.equal(taxRateForClient({ origin: 'otros', pais: 'Alemania' }), 21);
});

test('Delft usa 999 € de entrada y dos cuotas posteriores de 1.000 €', () => {
  assert.equal(APPLICATION_TOTALS.delft, 2999);
  assert.deepEqual(applicationPlan('delft'), [
    { installment: 1, amount: 999 },
    { installment: 2, amount: 1000 },
    { installment: 3, amount: 1000 },
  ]);
});

test('General nuevo mantiene 666,33 € de entrada y adapta solo las dos cuotas posteriores', () => {
  assert.deepEqual(applicationPlan('general', 1), [
    { installment: 1, amount: 666.33 },
    { installment: 2, amount: 666.33 },
    { installment: 3, amount: 666.34 },
  ]);
  assert.deepEqual(applicationPlan('general', 2), [
    { installment: 1, amount: 666.33 },
    { installment: 2, amount: 866.33 },
    { installment: 3, amount: 866.34 },
  ]);
  assert.deepEqual(applicationPlan('general', 3), [
    { installment: 1, amount: 666.33 },
    { installment: 2, amount: 916.33 },
    { installment: 3, amount: 916.34 },
  ]);
});

test('General existente conserva el plan histórico y los clientes nuevos reciben versión vigente', () => {
  assert.deepEqual(applicationPlanForUser({ tipo: 'general', num_carreras: 2 }), [
    { installment: 1, amount: 566.67 },
    { installment: 2, amount: 716.67 },
    { installment: 3, amount: 716.66 },
  ]);
  assert.deepEqual(applicationPlanForUser({
    tipo: 'general',
    num_carreras: 2,
    contract_data: { pricing_version: GENERAL_PRICE_VERSION },
  }), applicationPlan('general', 2));
  assert.equal(pricingVersionForNewUser('general'), GENERAL_PRICE_VERSION);
  assert.equal(pricingVersionForNewUser('delft'), DELFT_PRICE_VERSION);
});

test('Delft conserva 933 € por cuota en contratos históricos ya firmados', () => {
  assert.deepEqual(applicationPlanForUser({
    tipo: 'delft',
    contract_signed: true,
    contract_data: { version_template: 'contratos-2027-revision-integrada' },
  }), [
    { installment: 1, amount: 933 },
    { installment: 2, amount: 933 },
    { installment: 3, amount: 933 },
  ]);

  assert.deepEqual(applicationPlanForUser({
    tipo: 'delft',
    contract_signed: true,
    contract_data: { pricing_version: DELFT_PRICE_VERSION },
  }), [
    { installment: 1, amount: 999 },
    { installment: 2, amount: 1000 },
    { installment: 3, amount: 1000 },
  ]);
});

test('los contratos de admisiones describen el calendario de pagos 2027 vigente', () => {
  const text = (variant) => variant.blocks.flatMap((block) => [block.text, ...(block.items || [])]).filter(Boolean).join('\n');
  const general = text(VARIANTS.general);

  assert.match(general, /La primera cuota será siempre de 666,33 €/);
  assert.match(general, /La segunda cuota se abonará tras la presentación/);
  assert.doesNotMatch(general, /Primera cuota: 566,67 €/);
  assert.match(general, /Aplicación a 1 grado: 1\.999 €/);
  assert.match(general, /Aplicación a 2 grados: 2\.399 €/);
  assert.match(general, /Aplicación a 3 grados: 2\.499 €/);
  assert.match(general, /La primera cuota será siempre de 666,33 €/);
  assert.match(general, /segunda cuota de 866,33 € y tercera cuota de 866,34 €/);

  assert.match(text(VARIANTS.general_noes), /Un tercio \(1\/3\) del total/);
  const delft = text(VARIANTS.delft);
  assert.match(delft, /999 € al inicio del servicio/);
  assert.match(delft, /1\.000 € tras la presentación de las aplicaciones/);
  assert.match(delft, /1\.000 € tras la aceptación en al menos una universidad/);
});
