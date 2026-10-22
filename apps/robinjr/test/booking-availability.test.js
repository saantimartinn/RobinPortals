// Automated checks for booking availability test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateSlot } = require('../lib/booking-availability');

const start = '2026-09-01T08:00:00.000Z';
const windowEvent = {
  summary: 'LLAMADAS CLIENTES',
  start: '2026-09-01T07:00:00.000Z',
  end: '2026-09-01T10:00:00.000Z',
};

test('acepta un slot cubierto por la ventana y sin conflictos', () => {
  assert.deepEqual(evaluateSlot([windowEvent], start, 30), {
    available: true,
    insideWindow: true,
    occupied: false,
  });
});

test('rechaza un slot fuera de la ventana de disponibilidad', () => {
  assert.equal(evaluateSlot([], start, 30).available, false);
});

test('rechaza un solapamiento ocupado pero ignora eventos transparentes', () => {
  const conflict = { summary: 'Ocupado', start, end: '2026-09-01T08:30:00.000Z' };
  assert.equal(evaluateSlot([windowEvent, conflict], start, 30).available, false);
  assert.equal(evaluateSlot([windowEvent, { ...conflict, transparency: 'transparent' }], start, 30).available, true);
});
