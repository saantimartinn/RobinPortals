const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const appRequire = createRequire(path.resolve(__dirname, '../portal-source/package.json'));
const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
const { buildSync } = appRequire('esbuild');
const result = buildSync({
  stdin: { contents: "export { AdminWorkspace } from './src/application/AdminWorkspace.jsx'; export { AdminPerfil } from './src/application/admin/profile.jsx'; export { AdminArrivalSummary } from './src/application/admin/AdminArrivalSummary.jsx';", resolveDir: path.resolve(__dirname, '../portal-source'), loader: 'jsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
  loader: { '.css': 'empty', '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' }, logLevel: 'silent',
});
const compiled = { exports: {} };
vm.runInNewContext(result.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: appRequire, console, process, URL, Intl, Date, setTimeout, clearTimeout });
const { AdminWorkspace, AdminPerfil, AdminArrivalSummary } = compiled.exports;
const user = { id: 'admin', nombre: 'Admin', email: 'admin@example.test' };
const arrival = { id: 'arrival', role: 'client', tipo: 'llegada', nombre: 'Test', email: 'arrival@example.test', origin: 'espana', dni_completed: true, profile_completed: false, contract_signed: true, pago_completed: false, application_phase: 4, contract_data: { variant: 'llegada', arrival_service_end_at: '2099-09-15T00:00:00+02:00' } };
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('Llegada navigation and profile contain no admission, document or student-chat modules', () => {
  const nav = render(AdminWorkspace, { user, client: arrival, clients: [arrival], active: 'perfil' });
  assert.match(nav, /Pack Llegada/);
  for (const label of ['Carreras', 'Documentos', 'Chat del alumno', 'Perfil académico', 'Paso 4', 'Esperando resultados']) assert.ok(!nav.includes(label), label);
  for (const label of ['Perfil', 'Pagos', 'Llamadas']) assert.ok(nav.includes(label), label);
  const profile = render(AdminPerfil, { client: arrival });
  assert.match(profile, /Datos personales/);
  assert.match(profile, /Notas comerciales/);
  for (const label of ['Intereses de carrera', 'Sugerencias de carreras', 'Cuestionario de orientación', 'Tipo de estudios', 'Experiencia internacional']) assert.ok(!profile.includes(label), label);
});

test('the pack summary uses the real four onboarding flags and never waits for the academic questionnaire', () => {
  const pending = render(AdminArrivalSummary, { client: arrival, onNavigate() {} });
  assert.match(pending, /Primer pago pendiente/);
  assert.match(pending, /Solicitud/);
  assert.match(pending, /Identidad/);
  assert.match(pending, /Contrato/);
  assert.ok(!pending.includes('Perfil académico'));
  assert.ok(!pending.includes('Selecciona la fase'));
  const complete = render(AdminArrivalSummary, { client: { ...arrival, pago_completed: true }, onNavigate() {} });
  assert.match(complete, />Activo</);
  assert.ok(!complete.includes('Primer pago pendiente'));
});

test('standard client navigation and academic profile remain available', () => {
  const client = { ...arrival, tipo: 'general' };
  const nav = render(AdminWorkspace, { user, client, clients: [client], active: 'perfil' });
  for (const label of ['Carreras', 'Documentos', 'Chat del alumno', 'Perfil académico', 'Paso 4']) assert.ok(nav.includes(label), label);
  const profile = render(AdminPerfil, { client });
  for (const label of ['Intereses de carrera', 'Sugerencias de carreras', 'Tipo de estudios', 'Experiencia internacional']) assert.ok(profile.includes(label), label);
});
