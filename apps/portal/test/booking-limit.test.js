const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const studentId = 'student-1';
const future = new Date(Date.now() + 86400000).toISOString();
const requestedStart = new Date(Date.now() + 2 * 86400000).toISOString();
const pendingBooking = { id: 'booking-1', user_id: studentId, status: 'scheduled', start_at: future, duration_min: 30 };

function load(relativeFile, overrides, transform) {
  const filename = path.resolve(__dirname, '..', relativeFile);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  let source = fs.readFileSync(filename, 'utf8');
  if (transform) source = require('../portal-source/node_modules/esbuild').transformSync(source,
    { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
  vm.runInNewContext(source, { module, exports: module.exports, Date, Intl, console, process,
    require: (id) => id in overrides ? overrides[id] : localRequire(id) }, { filename });
  return module.exports;
}

function fixture({ bookings = [], queryError = null, insertError = null, cleanupError = null, userPatch = {} } = {}) {
  const calls = { availability: 0, meetings: 0, meetingArgs: [], notifications: 0, inserted: [], deleted: [] };
  const sb = {
    from(table) {
      assert.ok(['users', 'bookings'].includes(table));
      return {
        filters: [], row: null,
        select() { return this; },
        eq(key, value) { this.filters.push((row) => row[key] === value); return this; },
        gt(key, value) { this.filters.push((row) => row[key] > value); return this; },
        async limit(count) {
          return { data: bookings.filter((row) => this.filters.every((filter) => filter(row))).slice(0, count), error: queryError };
        },
        insert(row) { this.row = row; calls.inserted.push(row); return this; },
        async single() {
          if (table === 'users') return { data: { id: studentId, role: 'client', email: 'student@example.com', assigned_to: 'manuel@project-robin.com', ...userPatch } };
          return { data: insertError ? null : { id: 'new-booking', ...this.row }, error: insertError };
        },
      };
    },
  };
  const { handler } = load('netlify/functions/bookings-create.js', {
    '../../lib/supabase': { getSupabase: () => sb },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: studentId }) },
    '../../lib/observability': { ...require('../lib/observability'),
      createOperationLogger: () => ({ start() {}, warn() {}, success() {}, failure() {} }) },
    '../../lib/google-calendar': {
      async listEvents() {
        calls.availability++;
        return [{ summary: 'LLAMADAS CLIENTES', start: requestedStart,
          end: new Date(Date.parse(requestedStart) + 3600000).toISOString() }];
      },
      async createMeetEvent(args) {
        calls.meetings++;
        calls.meetingArgs.push(args);
        return { eventId: 'new-event', meetUrl: 'https://meet.google.com/abc-defg-hij' };
      },
      async deleteCalendarEvent(...args) { calls.deleted.push(args); if (cleanupError) throw cleanupError; },
    },
    '../../lib/booking-create': { ...require('../lib/booking-create'),
      async sendBookingNotifications() { calls.notifications++; return []; } },
  });
  return { calls, send: (body = {}) => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ start_at: requestedStart, ...body }) }) };
}

test('Pack Llegada uses the authenticated student and assigned advisor in the existing booking flow', async () => {
  const { calls, send } = fixture({ userPatch: { tipo: 'llegada', contract_signed: true, pago_completed: true, contract_data: { variant: 'llegada' } } });
  const response = await send({ user_id: 'another-student', advisor_email: 'untrusted@example.test' });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).booking.user_id, studentId);
  assert.equal(calls.meetingArgs[0].advisorEmail, 'manuel@project-robin.com');
  assert.deepEqual(Array.from(calls.meetingArgs[0].attendees), ['student@example.com']);
  assert.equal(calls.notifications, 1);
});

test('una llamada futura bloquea otra reserva antes de consultar Calendar', async () => {
  for (const extra of [{}, { cancellation_requested_at: future }, { admin_email: 'otro-asesor@example.com' }]) {
    const { calls, send } = fixture({ bookings: [{ ...pendingBooking, ...extra }] });
    const response = await send();
    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).error, 'booking_pending');
    assert.equal(calls.availability, 0);
    assert.equal(calls.meetings, 0);
    assert.equal(calls.notifications, 0);
    assert.equal(calls.inserted.length, 0);
  }
});

test('permite reservar sin llamadas, con llamadas pasadas o canceladas y con reservas de otro alumno', async () => {
  for (const bookings of [[], [{ ...pendingBooking, start_at: new Date(Date.now() - 86400000).toISOString() }],
    [{ ...pendingBooking, status: 'cancelled' }], [{ ...pendingBooking, user_id: 'student-2' }]]) {
    const { calls, send } = fixture({ bookings });
    const response = await send();
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).booking.user_id, studentId);
    assert.equal(calls.meetings, 1);
    assert.equal(calls.notifications, 1);
    assert.equal(calls.deleted.length, 0);
  }
});

test('si no puede comprobar las reservas no crea un evento', async () => {
  const { calls, send } = fixture({ queryError: new Error('database_unavailable') });
  assert.equal((await send()).statusCode, 500);
  assert.equal(calls.availability, 0);
  assert.equal(calls.meetings, 0);
});

test('un conflicto concurrente de alumno o de horario elimina el evento nuevo y no envía confirmaciones', async () => {
  for (const error of ['booking_pending', 'booking_slot_unavailable']) {
    const { calls, send } = fixture({ insertError: { code: '23P01', message: error } });
    const response = await send();
    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).error, error === 'booking_pending' ? error : 'slot_unavailable');
    assert.equal(calls.meetings, 1);
    assert.deepEqual(calls.deleted, [['manuel@project-robin.com', 'new-event']]);
    assert.equal(calls.notifications, 0);
  }
});

test('un fallo de limpieza de Calendar conserva la respuesta de error del servidor', async () => {
  const { calls, send } = fixture({ insertError: { code: '23P01', message: 'booking_pending' }, cleanupError: new Error('calendar_unavailable') });
  assert.equal((await send()).statusCode, 500);
  assert.equal(calls.notifications, 0);
});

function renderBookings(bookings, { loading = false, create = async () => ({}) } = {}) {
  const updates = [];
  const states = [bookings, loading, '', false, null, 0, null,
    [{ date: future.slice(0, 10), slots: [{ start: future, label: '10:00' }] }], false, 'Asesor', true, 30, future.slice(0, 10), future];
  let stateIndex = 0;
  const elements = new Proxy({}, { get: (_, name) => String(name) });
  const { Reservas } = load('portal-source/src/application/BookingsPortal.jsx', {
    '../../../../../packages/i18n/react.jsx': { t: (text) => text, useLocale() {}, getLocale: () => 'es-ES' },
    react: { useEffect() {}, useState() { const index = stateIndex++; return [states[index], (value) => updates.push({ index, value })]; } },
    'lucide-react': elements,
    '../ui.jsx': elements,
    '../theme.js': { NAVY: '#000' },
    '../client-utils.js': { formatDateTime: (date) => date.toISOString() },
    '../api.js': { bookingsCreate: create },
  }, true);
  const tree = Reservas();
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === 'object') { nodes.push(node); walk(node.props?.children); }
  }
  walk(tree);
  return { updates, button: nodes.find((node) => node.type === 'Btn'), nodes };
}

test('el portal bloquea el formulario con una llamada futura, incluida una cancelación solicitada', async () => {
  for (const extra of [{}, { cancellation_requested_at: future }]) {
    const { button, nodes } = renderBookings([{ ...pendingBooking, ...extra }], { create: async () => assert.fail('no debe reservar') });
    assert.equal(button.props.disabled, true);
    assert.ok(nodes.some((node) => node.props?.role === 'status' && /Ya tienes una llamada reservada/.test(node.props.children)));
    assert.equal(nodes.some((node) => node.type === 'button' && node.props.children === '10:00'), false);
    await button.props.onClick();
  }
});

test('el portal espera a comprobar reservas y permite reservar con llamadas pasadas o canceladas', () => {
  assert.equal(renderBookings(null, { loading: true }).button.props.disabled, true);
  assert.equal(renderBookings(null).button.props.disabled, true);
  for (const bookings of [[], [{ ...pendingBooking, status: 'cancelled' }],
    [{ ...pendingBooking, start_at: new Date(Date.now() - 86400000).toISOString() }]]) {
    assert.equal(renderBookings(bookings).button.props.disabled, false);
  }
});

test('al reservar actualiza las llamadas locales antes de recargar el listado', async () => {
  const { button, updates } = renderBookings([], { create: async () => ({ booking: pendingBooking }) });
  await button.props.onClick();
  const updateBookings = updates.find((update) => update.index === 0);
  assert.ok(updateBookings);
  assert.equal(updateBookings.value([])[0], pendingBooking);
});

test('una reserva creada en otra pestaña muestra el motivo y recarga el listado', async () => {
  const { button, updates } = renderBookings([], { create: async () => {
    throw Object.assign(new Error('booking_pending'), { status: 409, data: { error: 'booking_pending' } });
  } });
  await button.props.onClick();
  assert.ok(updates.some((update) => update.index === 2 && /Ya tienes una llamada reservada/.test(update.value)));
  assert.ok(updates.some((update) => update.index === 5));
});
