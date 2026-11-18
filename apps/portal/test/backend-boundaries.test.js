// Automated checks for backend boundaries test; external services should remain outside this test boundary.
const assert = require('node:assert/strict');
const test = require('node:test');

const { daysBetween } = require('../lib/admin-dashboard');
const { extractJsonArray } = require('../lib/career-suggestions');
const { buildExistingUserPatch, mapResponsableToAdminEmail, normalizeTipo, parsePayload } = require('../lib/notion');

test('el read model administrativo conserva sus métricas temporales puras', () => {
  assert.equal(daysBetween('2026-08-01T00:00:00.000Z', '2026-08-04T00:00:00.000Z'), 3);
  assert.equal(daysBetween(null, '2026-08-04T00:00:00.000Z'), null);
});

test('la respuesta IA de carreras extrae solo un array JSON válido', () => {
  assert.deepEqual(extractJsonArray('texto [{"program_code":"x"}] final'), [{ program_code: 'x' }]);
  assert.equal(extractJsonArray('sin json'), null);
  assert.equal(extractJsonArray('[invalido]'), null);
});

test('Notion normaliza payload directo sin depender del evento HTTP', () => {
  assert.deepEqual(parsePayload({
    lead_id: 42,
    pageId: 'page-1',
    status: 'INSIDE',
    responsable: 'María García',
    tipo: 'Mentoría',
    primer_pago_pagado: 'sí',
  }), {
    lead_id: '42',
    notion_page_id: 'page-1',
    status: 'INSIDE',
    name: null,
    email: null,
    responsable: 'María García',
    tipo: 'Mentoría',
    primer_pago_pagado: true,
  });
  assert.equal(mapResponsableToAdminEmail('María García'), 'maria@project-robin.com');
  assert.equal(normalizeTipo('Servicio llegada'), 'llegada');
});

test('Notion conserva los contratos firmados y solo actualiza los datos recibidos', () => {
  const existing = { contract_signed: true, tipo: 'general', assigned_to: 'actual@example.test', contract_data: { pricing_version: 'signed-price' } };
  const patch = buildExistingUserPatch(existing, { assignedEmail: 'nuevo@example.test', notion_page_id: 'page-2', tipo: 'Delft', primer_pago_pagado: false });
  assert.deepEqual(patch, { assigned_to: 'nuevo@example.test', notion_page_id: 'page-2', tipo: 'delft' });
  assert.equal(existing.contract_data.pricing_version, 'signed-price');
});

test('Notion actualiza una tarifa sin firmar conservando el crédito y registra la transferencia', () => {
  const credit = { credit_eur: 500 };
  const existing = { contract_signed: false, tipo: 'general', pago_completed: false, contract_data: { pricing_version: 'old-price', mentoria_upgrade: credit } };
  const patch = buildExistingUserPatch(existing, { primer_pago_pagado: true });
  assert.notEqual(patch.contract_data.pricing_version, 'old-price');
  assert.equal(patch.contract_data.mentoria_upgrade, credit);
  assert.equal(existing.contract_data.pricing_version, 'old-price');
  assert.equal(patch.pago_completed, true);
  assert.deepEqual(patch.pago_data, { method: 'transferencia', source: 'notion', at: patch.pago_completed_at });
  assert.ok(Number.isFinite(Date.parse(patch.pago_completed_at)));
  const changedPlan = buildExistingUserPatch(existing, { tipo: 'Delft' });
  assert.equal(changedPlan.tipo, 'delft');
  assert.notEqual(changedPlan.contract_data.pricing_version, patch.contract_data.pricing_version);
});
