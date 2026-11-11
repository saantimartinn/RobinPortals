const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../../..');
const appPath = (app, file) => path.join(root, 'apps', app, file);
function frozenDate(iso) {
  return class extends Date {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return Date.parse(iso); }
  };
}
function load(app, file, { overrides = {}, date = Date, expose = '' } = {}) {
  const filename = appPath(app, file);
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const context = { module, exports: module.exports, Date: date, Intl, console, process, Buffer, URL,
    require: (id) => id in overrides ? overrides[id] : localRequire(id) };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + expose, context, { filename });
  return module.exports;
}

for (const app of ['portal', 'robinjr', 'admin']) {
  test(`${app}: booking dates stay consecutive across Spain's autumn DST change`, async () => {
    let query;
    const user = { id: 'student', assigned_to: 'advisor@example.com', role: 'client' };
    const sb = { from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: user }) }) };
    const handler = load(app, 'netlify/functions/bookings-availability.js', {
      date: frozenDate('2026-10-24T18:00:00Z'),
      overrides: {
        '../../lib/supabase': { getSupabase: () => sb },
        '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'student' }) },
        '../../lib/admins': { adminName: () => 'Advisor', canonicalAdvisorEmail: (email) => email },
        '../../lib/google-calendar': { listEvents: async (...args) => { query = args; return []; } },
      },
    }).handler;
    const response = await handler({ httpMethod: 'GET', queryStringParameters: { from: '2026-10-25', days: '3' } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).days.map((day) => day.date), ['2026-10-25', '2026-10-26', '2026-10-27']);
    // Portal/Jr add a 15-minute booking buffer to the calendar query.
    assert.equal(query[2], app === 'admin' ? '2026-10-27T23:00:00.000Z' : '2026-10-27T23:15:00.000Z');
  });

  test(`${app}: contract copies use the Spanish signature date on a UTC server`, () => {
    const previous = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      for (const file of ['lib/onboarding-fulfill.js', 'netlify/functions/onboarding-contract.js']) {
        const { fmtFecha } = load(app, file, { expose: '\nmodule.exports.fmtFecha = fmtFecha;' });
        assert.equal(fmtFecha('2026-12-31T23:30:00Z'), '01 de enero de 2027', file);
        assert.equal(fmtFecha('2026-06-30T22:30:00Z'), '01 de julio de 2026', file);
      }
    } finally { if (previous == null) delete process.env.TZ; else process.env.TZ = previous; }
  });

  test(`${app}: assistant today advances at Spanish midnight`, async () => {
    let prompt;
    const sb = { from: () => ({ select() { return this; }, eq() { return this; },
      single: async () => ({ data: { id: 'admin', email: 'advisor@example.com', role: 'admin' } }),
      order: async () => ({ data: [] }) }) };
    const handler = load(app, 'netlify/functions/admin-assistant.js', {
      date: frozenDate('2026-12-31T23:30:00Z'), overrides: {
        '../../lib/supabase': { getSupabase: () => sb },
        '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin' }) },
        '../../lib/authorization': { isApplicationAdmin: () => true, normalizeEmail: (admin) => admin.email },
        '../../lib/http': { json: (body) => ({ statusCode: 200, body }), verifyOrigin: () => true,
          parseJsonBody: () => ({ messages: [{ role: 'user', content: 'Qué día es hoy?' }] }), serverError: (error) => { throw error; } },
        '../../lib/anthropic-chat': { chatCompletion: async ({ system }) => { prompt = system; return { text: 'Respuesta' }; } },
      },
    }).handler;
    assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 200);
    assert.match(prompt, /Hoy es 2027-01-01\./);
  });
}

for (const app of ['portal', 'robinjr']) {
  test(`${app}: browser instant labels remain Spanish when the device is in Colombia`, async () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    try {
      const utils = await import(appPath(app, 'portal-source/src/client-utils.js'));
      const instant = new Date('2026-12-31T23:30:00Z');
      assert.equal(utils.formatTime(instant), '00:30');
      assert.match(utils.formatDate(instant), /01 ene 2027/);
      assert.equal(utils.formatDateTime(instant, { hour: '2-digit', minute: '2-digit' }), '00:30');
    } finally { if (previous == null) delete process.env.TZ; else process.env.TZ = previous; }
  });
}

test('Junior: a document becomes overdue at Madrid midnight', async () => {
  const { dashboardAlerts } = await import(appPath('robinjr', 'portal-source/src/application/admin/dashboard-utils.js'));
  const alerts = dashboardAlerts({ clients: [{ id: 'student', nombre: 'Ana' }],
    documents: [{ user_id: 'student', name: 'Pasaporte', status: 'required', deadline: '2026-12-31' }],
    now: Date.parse('2026-12-31T23:30:00Z') });
  assert.equal(alerts.find((alert) => alert.kind === 'deadline')?.label, '⏰ Deadline vencida: Pasaporte · 1d');
});

test('Junior: the new school year begins on September 1 in Spain', () => {
  const { schoolYearForDate } = require('../../robinjr/shared/contract-content.cjs');
  assert.equal(schoolYearForDate('2026-08-31T22:30:00Z'), '2026–2027');
  assert.equal(schoolYearForDate('2026-08-31T21:30:00Z'), '2025–2026');
});

function renderComponent(app, file, exportName, stateValues, props, overrides = {}, clock = '2026-12-31T22:00:00Z') {
  const filename = appPath(app, file);
  const localRequire = createRequire(filename);
  const { transformSync } = require(appPath('portal', 'portal-source/node_modules/esbuild'));
  const source = transformSync(fs.readFileSync(filename, 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
  const module = { exports: {} };
  const elements = new Proxy({}, { get: (_, name) => String(name) });
  const react = { Fragment: Symbol.for('react.fragment'), useState: () => [stateValues.shift(), () => {}], useRef: () => ({ current: null }), useEffect: () => {} };
  const context = { module, exports: module.exports, Date: frozenDate(clock),
    require: (id) => id in overrides ? overrides[id] : id === 'react' ? react
      : /ui\.jsx$/.test(id) || id === 'lucide-react' ? elements
      : /theme\.js$/.test(id) ? { NAVY: '#000', NAVY_DARK: '#000' } : localRequire(id) };
  vm.runInNewContext(source, context, { filename });
  return module.exports[exportName](props);
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  return typeof node === 'object' ? textOf(node.props?.children) : String(node);
}
function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map((child) => findElement(child, predicate)).find(Boolean);
  return predicate(node) ? node : findElement(node.props?.children, predicate);
}
for (const app of ['portal', 'robinjr']) {
  test(`${app}: the booking confirmation and history retain Spain time on a Colombian device`, async () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    try {
      const utils = await import(appPath(app, 'portal-source/src/client-utils.js'));
      const booking = { id: 'booking', start_at: '2026-12-31T23:30:00Z', status: 'scheduled', duration_min: 30 };
      const tree = renderComponent(app, 'portal-source/src/application/BookingsPortal.jsx', 'Reservas',
        [[booking], false, '', false, ...(app === 'portal' ? [null] : []), 0, booking, [], false, 'Asesor', true, 30, '', ''], {},
        { '../client-utils.js': utils, '../api.js': {} });
      assert.equal((textOf(tree).match(/00:30/g) || []).length, 2);
      assert.match(textOf(tree), /01 de enero/);
    } finally { if (previous == null) delete process.env.TZ; else process.env.TZ = previous; }
  });

  test(`${app}: saving meeting notes preserves the actual UTC instant`, async () => {
    let request;
    const tree = renderComponent(app, 'portal-source/src/application/admin/AdminChatAssistant.jsx', 'AdminChatAssistant',
      ['panel', [], '', false, '', true, 'Notas de reunión', 'student', 'Reunión', false],
      { user: {}, activeClientId: 'student', clients: [{ id: 'student', nombre: 'Ana' }] },
      { '../../api.js': { adminHistorialAdd: async (body) => { request = body; return { historial: 'Resumen' }; } } });
    const save = findElement(tree, (node) => typeof node.props?.onClick === 'function' && textOf(node).includes('Resumir y añadir al historial'));
    assert.ok(save, 'meeting notes action is available');
    await save.props.onClick();
    assert.equal(request.meeting_date, '2026-12-31T22:00:00.000Z');
  });
}

for (const app of ['portal', 'robinjr']) {
  test(`${app}: contract preview uses the same Spanish day as the signed copy`, () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    try {
      const tree = renderComponent(app, 'portal-source/src/application/onboarding/contract.jsx', 'OnboardingContract',
        ['', '', [], false, '', false, ''], { user: { tipo: 'general', nombre: 'Ana' } },
        { '../../api.js': {}, './onboarding-shared.jsx': { OnboardingShell: 'section' } }, '2026-12-31T23:30:00Z');
      assert.equal(textOf(tree).includes('Fecha: 01 de enero de 2027'), true);
    } finally { if (previous == null) delete process.env.TZ; else process.env.TZ = previous; }
  });
}
