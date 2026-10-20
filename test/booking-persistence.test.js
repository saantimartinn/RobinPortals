// Automated checks for booking persistence test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { insertBookingOrRollback } = require('../netlify/functions/bookings-create');

function supabaseInsert(result) {
  return {
    from(table) {
      assert.equal(table, 'bookings');
      return {
        insert(row) {
          return {
            select() {
              return {
                single: async () => result(row),
              };
            },
          };
        },
      };
    },
  };
}

test('persiste una reserva Meet sin eliminar su evento', async () => {
  let deletes = 0;
  const row = { calendar_event_id: 'event-ok', meet_join_url: 'https://meet.google.com/abc-defg-hij' };
  const booking = await insertBookingOrRollback({
    sb: supabaseInsert(async (inserted) => ({ data: { id: 'booking-1', ...inserted }, error: null })),
    row,
    advisorEmail: 'maria@project-robin.com',
    eventId: 'event-ok',
    removeEvent: async () => { deletes++; },
  });
  assert.equal(booking.id, 'booking-1');
  assert.equal(deletes, 0);
});

test('elimina el evento de Calendar cuando Supabase rechaza la reserva', async () => {
  const deleted = [];
  const dbError = new Error('duplicate_slot');
  await assert.rejects(
    insertBookingOrRollback({
      sb: supabaseInsert(async () => ({ data: null, error: dbError })),
      row: { calendar_event_id: 'event-rollback' },
      advisorEmail: 'noel@project-robin.com',
      eventId: 'event-rollback',
      removeEvent: async (email, eventId) => { deleted.push({ email, eventId }); },
    }),
    dbError
  );
  assert.deepEqual(deleted, [{ email: 'noel@project-robin.com', eventId: 'event-rollback' }]);
});

test('conserva el fallo de limpieza para observabilidad', async () => {
  const dbError = new Error('database_unavailable');
  const cleanupError = new Error('calendar_unavailable');
  await assert.rejects(
    insertBookingOrRollback({
      sb: supabaseInsert(async () => ({ data: null, error: dbError })),
      row: { calendar_event_id: 'event-pending-cleanup' },
      advisorEmail: 'manuel@project-robin.com',
      eventId: 'event-pending-cleanup',
      removeEvent: async () => { throw cleanupError; },
    }),
    (error) => error === dbError && error.calendarCleanupError === cleanupError
  );
});
