// Automated checks for backend boundaries test; external services should remain outside this test boundary.
const assert = require('node:assert/strict');
const test = require('node:test');

const { daysBetween } = require('../lib/admin-dashboard');
const { extractJsonArray } = require('../lib/career-suggestions');
const { mapResponsableToAdminEmail, normalizeTipo, parsePayload } = require('../lib/notion');

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
