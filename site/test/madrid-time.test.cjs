const test = require('node:test');
const assert = require('node:assert/strict');

test('Madrid business dates preserve Spanish midnight and summer offsets', () => {
  const { dateKey, calendarDate, dayStart, addCalendarDays } = require('../../packages/time/madrid.cjs');
  assert.equal(dateKey('2025-12-31T23:00:00Z'), '2026-01-01');
  assert.equal(dateKey('2026-08-31T22:00:00Z'), '2026-09-01');
  assert.equal(calendarDate('2026-10-31T23:00:00Z').toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(dayStart('2026-01-01').toISOString(), '2025-12-31T23:00:00.000Z');
  assert.equal(dayStart('2026-09-01').toISOString(), '2026-08-31T22:00:00.000Z');
  assert.equal(dayStart('2026-03-29').toISOString(), '2026-03-28T23:00:00.000Z');
  assert.equal(dayStart('2026-03-30').toISOString(), '2026-03-29T22:00:00.000Z');
  assert.equal(dayStart('2026-10-25').toISOString(), '2026-10-24T22:00:00.000Z');
  assert.equal(dayStart('2026-10-26').toISOString(), '2026-10-25T23:00:00.000Z');
  assert.equal(addCalendarDays('2026-10-25', 1), '2026-10-26');
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
  assert.throws(() => dayStart('2026-02-30'), /invalid_calendar_date/);
});
