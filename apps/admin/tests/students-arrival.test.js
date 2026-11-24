const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'package.json'));
const views = build({
  entryPoints: [path.join(root, 'src/features/admin/students.tsx')], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  alias: { '@': path.join(root, 'src') }, external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
  define: { 'import.meta.env': '{}' }, loader: { '.css': 'empty', '.png': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl' }, logLevel: 'silent',
  plugins: [{ name: 'isolate-folder-browser', setup(builder) {
    builder.onResolve({ filter: /^\.\/client-folders$/ }, () => ({ path: 'folders', namespace: 'student-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'student-test' }, () => ({ contents: 'export function ClientFolderBrowser({clients}) {return clients.map(client => client.content);}', loader: 'jsx' }));
  } }],
}).then(result => {
  const compiled = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: appRequire, console, process, URL, Intl, Date });
  return compiled.exports;
});
const arrival = Object.freeze({ id: 'arrival', display_id: 'PR-ARRIVAL', nombre: 'Arrival', apellidos: 'Example', email: 'arrival@example.test', telefono_alumno: '+34 600 000 000', tipo: 'llegada', origin: 'espana', pais: 'España', application_phase: 4, application_level: 'maestria', assigned_to: 'manuel@example.test', requires_onboarding: true, profile_completed: false, dni_completed: true, contract_signed: true, pago_completed: true, intereses: ['Business'] });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const snapshot = client => ({ clients: [client], portalUrl: '', payments: [], admin: { id: 'admin', email: 'admin@example.test' }, connections: {} });

test('the Llegada CRM profile shows four real registration steps, without admission or academic details', async () => {
  const { StudentProfile } = await views;
  const html = render(StudentProfile, { client: arrival, portalUrl: '' });
  assert.match(html, /Pack Llegada/);
  for (const label of ['Solicitud', 'Identidad', 'Contrato', 'Primer pago', 'PR-ARRIVAL', 'arrival@example.test', 'manuel@example.test']) assert.ok(html.includes(label), label);
  for (const label of ['Fase 4', 'Nivel de aplicación', '<small>Perfil</small>', 'Intereses', 'Business']) assert.ok(!html.includes(label), label);
  assert.equal((html.match(/<article>/g) || []).length, 4);
});

test('the list identifies Llegada and derives registration from its four steps despite the academic profile flag', async () => {
  const { GlobalStudents } = await views;
  const renderList = client => render(GlobalStudents, { path: '/alumnos-global', snapshot: snapshot(client), connected: true, contacts: [] });
  const complete = renderList(arrival);
  assert.match(complete, /Pack Llegada/);
  assert.match(complete, /Registro completado/);
  assert.ok(!complete.includes('Fase'));
  for (const field of ['origin', 'dni_completed', 'contract_signed', 'pago_completed']) {
    const missing = renderList({ ...arrival, requires_onboarding: false, [field]: field === 'origin' ? '' : false });
    assert.match(missing, /Registro pendiente/, field);
  }
  assert.equal(arrival.profile_completed, false);
});

test('the detail reflects pending identity, contract and payment independently', async () => {
  const { StudentProfile } = await views;
  for (const [field, label] of [['origin', 'Solicitud'], ['dni_completed', 'Identidad'], ['contract_signed', 'Contrato'], ['pago_completed', 'Primer pago']]) {
    const html = render(StudentProfile, { client: { ...arrival, [field]: field === 'origin' ? '' : false }, portalUrl: '' });
    assert.ok(html.includes(`<small>${label}</small><strong>Pendiente</strong>`));
  }
});

test('other products retain their admission phase, academic profile and interests', async () => {
  const { StudentProfile, GlobalStudents } = await views;
  for (const tipo of ['general', 'delft', 'mentoria', undefined]) {
    const client = { ...arrival, tipo };
    const detail = render(StudentProfile, { client, portalUrl: '' });
    for (const label of ['Fase 4', 'Nivel de aplicación', '<small>Perfil</small>', 'Intereses', 'Business']) assert.ok(detail.includes(label), `${tipo}: ${label}`);
    assert.equal((detail.match(/<article>/g) || []).length, 5);
    const list = render(GlobalStudents, { path: '/alumnos-global', snapshot: snapshot(client), connected: true, contacts: [] });
    assert.match(list, /Fase 4/);
    assert.match(list, /Onboarding/);
  }
});
