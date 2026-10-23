const test = require('node:test');
const assert = require('node:assert/strict');
const { createBookingCancelHandler } = require('../netlify/functions/bookings-cancel');

const bookingId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';

function fakeDatabase(actor, booking) {
  const rows = { users: [actor], bookings: [booking] };
  return {
    from(table) {
      const query = {
        filters: [], patch: null,
        select() { return this; },
        update(patch) { this.patch = patch; return this; },
        eq(key, value) { this.filters.push((row) => row[key] === value); return this; },
        is(key, value) { this.filters.push((row) => row[key] === value); return this; },
        async single() { return this.maybeSingle(); },
        async maybeSingle() {
          const row = rows[table].find((candidate) => this.filters.every((filter) => filter(candidate)));
          if (row && this.patch) Object.assign(row, this.patch);
          return { data: row ? { ...row } : null, error: null };
        },
      };
      return query;
    },
  };
}

function fixture({ actorId = studentId, admin = false, pending = false, calendarError = false } = {}) {
  const actor = { id: actorId, email: admin ? 'manuel@project-robin.com' : 'alumno@example.com', role: admin ? 'admin' : 'student' };
  const booking = {
    id: bookingId, user_id: studentId, admin_email: 'manuel@project-robin.com',
    start_at: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled',
    calendar_event_id: 'calendar-event', cancellation_requested_at: pending ? '2026-10-23T12:00:00.000Z' : null,
  };
  const calls = [];
  const handler = createBookingCancelHandler({
    getSupabase: () => fakeDatabase(actor, booking),
    readSessionFromEvent: () => ({ uid: actorId }),
    deleteCalendarEvent: async (...args) => { calls.push(args); if (calendarError) throw new Error('Calendar unavailable'); },
  });
  const send = async (action) => {
    const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ booking_id: bookingId, action }), headers: {} });
    return { status: response.statusCode, body: JSON.parse(response.body) };
  };
  return { booking, calls, send };
}

test('a student can request cancellation without deleting the Meet event or freeing the slot', async () => {
  const { booking, calls, send } = fixture();
  const result = await send('request');
  assert.equal(result.status, 200);
  assert.ok(booking.cancellation_requested_at);
  assert.equal(booking.status, 'scheduled');
  assert.equal(calls.length, 0);
});

test('a student cannot change another student’s booking or approve a cancellation', async () => {
  const stranger = fixture({ actorId: '44444444-4444-4444-8444-444444444444' });
  assert.equal((await stranger.send('request')).status, 403);
  const student = fixture({ pending: true });
  assert.equal((await student.send('approve')).status, 403);
});

test('a failed Google Calendar deletion leaves the booking scheduled', async () => {
  const { booking, send } = fixture({ actorId: adminId, admin: true, pending: true, calendarError: true });
  assert.equal((await send('approve')).status, 502);
  assert.equal(booking.status, 'scheduled');
  assert.ok(booking.cancellation_requested_at);
});

test('an assigned admin can approve a request or directly cancel a future call', async () => {
  for (const [action, pending] of [['approve', true], ['cancel', false]]) {
    const { booking, calls, send } = fixture({ actorId: adminId, admin: true, pending });
    assert.equal((await send(action)).status, 200);
    assert.equal(booking.status, 'cancelled');
    assert.equal(booking.cancellation_requested_at, null);
    assert.deepEqual(calls, [['manuel@project-robin.com', 'calendar-event']]);
  }
});

test('rejecting a request keeps the Meet event and the booked slot', async () => {
  const { booking, calls, send } = fixture({ actorId: adminId, admin: true, pending: true });
  assert.equal((await send('reject')).status, 200);
  assert.equal(booking.status, 'scheduled');
  assert.equal(booking.cancellation_requested_at, null);
  assert.equal(calls.length, 0);
});
