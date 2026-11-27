const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseMadridDateTime } = require('../../packages/notifications/schedule.cjs');
test('Madrid schedule respects winter and summer time', () => {
  assert.equal(parseMadridDateTime('2026-01-20T10:30').toISOString(), '2026-01-20T09:30:00.000Z');
  assert.equal(parseMadridDateTime('2026-07-20T10:30').toISOString(), '2026-07-20T08:30:00.000Z');
});
test('Madrid schedule rejects nonexistent and ambiguous local times', () => {
  assert.throws(() => parseMadridDateTime('2026-03-29T02:30'));
  assert.throws(() => parseMadridDateTime('2026-10-25T02:30'));
});
