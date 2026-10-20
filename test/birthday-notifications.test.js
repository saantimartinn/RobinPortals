// Automated checks for birthday notifications test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  madridDateParts,
  isBirthdayOn,
  studentName,
  isScheduledEvent,
} = require('../netlify/functions/birthday-notifications');

test('calcula el día de cumpleaños con el huso horario de Madrid', () => {
  assert.deepEqual(madridDateParts(new Date('2026-10-05T22:30:00.000Z')), {
    year: 2026,
    month: '10',
    day: '06',
  });
});

test('compara solo mes y día de fecha_nacimiento', () => {
  const today = { year: 2026, month: '10', day: '06' };
  assert.equal(isBirthdayOn('2008-10-06', today), true);
  assert.equal(isBirthdayOn('2008-10-07', today), false);
  assert.equal(isBirthdayOn('fecha-invalida', today), false);
});

test('normaliza el nombre del alumno para el asunto del asesor', () => {
  assert.equal(studentName({ nombre: '  Lucía  María ', apellidos: ' Martín  ' }), 'Lucía María Martín');
  assert.equal(studentName({}), 'el alumno');
});

test('la función solo acepta invocaciones programadas de Netlify', () => {
  assert.equal(isScheduledEvent({ body: JSON.stringify({ next_run: '2026-10-07T08:00:00Z' }) }), true);
  assert.equal(isScheduledEvent({ body: '{}' }), false);
  assert.equal(isScheduledEvent({ body: '{' }), false);
});
