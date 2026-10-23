// Automated checks for booking config test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { bookingConfig, DEFAULT_BOOKING_CONFIG, requestedDays } = require('../lib/booking-config');

test('la configuración de reservas conserva los defaults vigentes', () => {
  assert.deepEqual(bookingConfig({}), DEFAULT_BOOKING_CONFIG);
});

test('mantiene el título y la duración de Robin Jr y valida el horizonte', () => {
  assert.deepEqual(bookingConfig({
    BOOKING_AVAIL_TITLE: '  AGENDA ROBIN  ',
    BOOKING_MAX_DAYS: '21',
    BOOKING_SLOT_MIN: '45',
  }), { availabilityTitle: 'RobinJr', maxDays: 21, slotMin: 60 });
  assert.deepEqual(bookingConfig({ BOOKING_MAX_DAYS: '90', BOOKING_SLOT_MIN: '0' }), DEFAULT_BOOKING_CONFIG);
});

test('el cliente no puede pedir más días que el máximo operativo', () => {
  assert.equal(requestedDays('7', 14), 7);
  assert.equal(requestedDays('31', 14), 14);
  assert.equal(requestedDays('no-numérico', 14), 14);
});
