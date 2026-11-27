const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerDevice, unregisterDevice } = require('../../packages/notifications/mobile-devices.cjs');

test('device registration validates token and binds it to the authenticated user', async () => {
  const calls = [];
  const db = { from(table) { assert.equal(table, 'mobile_push_devices'); return { upsert(row, options) { calls.push({ row, options }); return Promise.resolve({ error: null }); } }; } };
  await registerDevice(db, 'user-id', 'A'.repeat(64));
  assert.equal(calls[0].row.user_id, 'user-id');
  assert.equal(calls[0].row.token, 'a'.repeat(64));
  assert.equal(calls[0].options.onConflict, 'token');
  await assert.rejects(registerDevice(db, 'user-id', 'invalid'));
  assert.equal(calls.length, 1);
});

test('signing out disables the exact device token', async () => {
  const calls = [];
  const db = { from(table) {
    assert.equal(table, 'mobile_push_devices');
    return { update(row) { calls.push(row); return { eq(field, value) { calls.push([field, value]); return Promise.resolve({ error: null }); } }; } };
  } };
  await unregisterDevice(db, 'B'.repeat(64));
  assert.equal(calls[0].enabled, false);
  assert.deepEqual(calls[1], ['token', 'b'.repeat(64)]);
});
