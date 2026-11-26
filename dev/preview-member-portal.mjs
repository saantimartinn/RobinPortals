// Isolated UI preview. Every API response below uses in-memory fixtures only.
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { partnersForArrival } = require('../apps/community/backend/lib/arrival-partners.js');
const port = Number(process.env.ROBIN_MEMBER_PREVIEW_PORT || 8895);
const scenarios = new Set(['suscripcion', 'llegada', 'alta-pendiente']);
const frontendRoots = { community: resolve(root, 'apps/community/dist/therobinplan'), portal: resolve(root, 'apps/portal/portal-source/dist') };
const tomorrow = new Date(Date.now() + 86400000);
tomorrow.setHours(11, 0, 0, 0);
const futureStart = tomorrow.toISOString();
const paidAt = new Date(Date.now() - 7 * 86400000).toISOString();
const demoState = new Map();
function fixture(scenario) {
  if (demoState.has(scenario)) return demoState.get(scenario);
  const arrival = scenario !== 'suscripcion';
  const pending = scenario === 'alta-pendiente';
  const user = {
    id: arrival ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
    lead_id: arrival ? 'MUESTRA-LLEGADA' : 'MUESTRA-SUSCRIPCION', username: scenario,
    nombre: arrival ? 'Clara' : 'Lucas', apellidos: 'Muestra', email: `${scenario}@example.test`,
    role: 'subscriber', is_subscriber: !arrival, community_access: arrival ? 'arrival' : 'full',
    subscription_status: arrival ? 'none' : 'active', subscription_plan: arrival ? null : 'monthly',
    current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(), payment_provider: 'stripe',
    ciudad: 'Rotterdam', telefono_alumno: '+34 600 000 000', profile_extra: { phone: '+34 600 000 000' },
    ...(arrival ? { tipo: 'llegada', requires_onboarding: pending, dni_completed: true, contract_signed: true,
      pago_completed: !pending, arrival_pack: { contracted: true, first_payment_completed: !pending,
        calls_enabled: !pending, status: pending ? 'payment_pending' : 'active', service_end_at: '2027-09-14T22:00:00Z' } } : {}),
  };
  const state = {
    user, requests: [{ id: 'support-demo', title: 'Consulta de ejemplo sobre mi cuenta', category: 'soporte', status: 'done', created_at: paidAt }],
    bookings: arrival && !pending ? [
      { id: 'future-demo', user_id: user.id, status: 'scheduled', start_at: futureStart, duration_min: 30, topic: 'Seguimiento con mi asesor', admin_email: 'asesor@example.test', meet_join_url: '' },
      { id: 'history-demo', user_id: user.id, status: 'scheduled', start_at: paidAt, duration_min: 30, topic: 'Primera llamada del Pack Llegada', admin_email: 'asesor@example.test', meet_join_url: '' },
    ] : [],
    payments: arrival ? [
      { id: 'first-demo', user_id: user.id, installment: 1, amount: 850, currency: 'EUR', status: pending ? 'unlocked' : 'paid', paid_at: pending ? null : paidAt, concept: 'Pack Llegada · primer pago' },
      { id: 'balance-demo', user_id: user.id, installment: 2, amount: 850, currency: 'EUR', status: 'locked', concept: 'Pack Llegada · segundo pago' },
    ] : [],
  };
  demoState.set(scenario, state);
  return state;
}
const stats = {};
function json(response, data, status = 200) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(data));
}
async function body(request) {
  let raw = '';
  for await (const chunk of request) { raw += chunk; if (raw.length > 65536) throw new Error('preview_body_too_large'); }
  return raw ? JSON.parse(raw) : {};
}
function html(response, content, status = 200) {
  response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(content);
}
const chooser = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Muestra local · Robin</title><style>body{margin:0;background:#F6F3E0;color:#2D3A64;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:70px auto;padding:24px}h1{font-size:34px;margin:0 0 12px}p{color:#687088}nav{display:grid;gap:14px;margin:32px 0}a{display:block;background:#FFFDF5;border:1px solid #DFDED2;border-radius:14px;padding:20px 24px;color:#2D3A64;text-decoration:none;font-weight:600}a:hover{border-color:#2D3A64}small{display:block;font-weight:400;color:#687088;margin-top:5px}</style><main><h1>La misma interfaz, cada producto con sus condiciones</h1><p>Muestra local con cuentas e historial ficticios. Esta vista no modifica bases de datos ni contacta con proveedores de pagos, correo o Calendar.</p><nav><a href="/therobinplan/?scenario=suscripcion">Suscripción mensual<small>Mismas pestañas; las llamadas con asesor no están incluidas.</small></a><a href="/therobinplan/?scenario=llegada">Pack Llegada<small>Llamadas con asesor, historial y pagos propios del pack.</small></a><a href="/therobinplan/?scenario=alta-pendiente">Pack Llegada · primer pago pendiente<small>Conserva el paso pendiente y el bloqueo de nuevas llamadas.</small></a></nav><p>Vuelve a esta página para cambiar de caso. Los importes del pack son una muestra de su contrato base; la migración respetará los importes registrados de cada cliente.</p></main></html>`;

const server = createHttpServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    const referer = new URL(request.headers.referer || `http://localhost:${port}`);
    const cookieScenario = request.headers.cookie?.match(/(?:^|;\s*)robin_member_preview=([^;]+)/)?.[1];
    const selected = url.searchParams.get('scenario') || referer.searchParams.get('scenario') || cookieScenario;
    const scenario = scenarios.has(selected) ? selected : 'llegada';
    if (url.searchParams.has('scenario')) response.setHeader('set-cookie', `robin_member_preview=${scenario}; Path=/; HttpOnly; SameSite=Strict`);
    const state = fixture(scenario);
    if (url.pathname === '/') return html(response, chooser);
    if (url.pathname === '/__preview/status') return json(response, { fixtureData: true, scenario, requests: stats });
    if (/^\/(therobinplan|portal)\/api\//.test(url.pathname)) {
      stats[url.pathname] = (stats[url.pathname] || 0) + 1;
      if (url.pathname === '/therobinplan/api/me') return json(response, state.user);
      if (url.pathname === '/therobinplan/api/auth/sso') return json(response, { ok: true });
      if (url.pathname === '/therobinplan/api/notifications') return json(response, { notifications: [] });
      if (url.pathname === '/therobinplan/api/partners') return json(response, { partners: partnersForArrival([
        { id: 'revolut-demo', name: 'Revolut', category: 'other', products: ['community', 'pack_llegada'] },
        { id: 'tsh-demo', name: 'The Social Hub', category: 'housing', products: ['community', 'pack_llegada'] },
        { id: 'swapfiets-demo', name: 'Swapfiets', category: 'other', products: ['community', 'pack_llegada'] },
      ]) });
      if (url.pathname === '/therobinplan/api/service-requests') {
        if (request.method === 'POST') { const input = await body(request); state.requests.unshift({ id: `request-${state.requests.length}`, title: input.title, details: input.details, status: 'new', category: 'soporte', created_at: new Date().toISOString() }); }
        return json(response, { requests: state.requests });
      }
      if (['/therobinplan/api/faqs', '/therobinplan/api/challenges'].includes(url.pathname)) return json(response, { faqs: [{ id: 'faq-demo', question: '¿Dónde consulto mis pagos?', answer: 'En la pestaña Pagos puedes consultar el estado de tu facturación.', category: 'Tu cuenta', products: ['community', 'pack_llegada'] }] });
      if (url.pathname === '/therobinplan/api/subscription/sync') return json(response, { user: state.user, ...state.user });
      if (url.pathname === '/therobinplan/api/subscription/plans') return json(response, { plans: [] });
      if (url.pathname === '/therobinplan/api/subscription/portal') return json(response, { url: '/__preview/billing' });
      if (url.pathname === '/portal/api/me') return json(response, { ...state.user, role: 'client' });
      if (url.pathname === '/portal/api/onboarding/state') return json(response, { ...state.user, user: { ...state.user, role: 'client' } });
      if (url.pathname === '/portal/api/portal-update-notice') return json(response, { show: false });
      if (url.pathname.includes('/api/bookings/')) {
        if (!state.user.arrival_pack) return json(response, { error: 'arrival_pack_required' }, 403);
        if (url.pathname.endsWith('/list')) return json(response, { bookings: state.bookings });
        if (url.pathname.endsWith('/availability')) return json(response, { days: [], advisor: 'Asesor de muestra', calendar_connected: true, slot_min: 30 });
        if (url.pathname.endsWith('/cancel')) { const input = await body(request); const booking = state.bookings.find(row => row.id === (input.id || input.booking_id)); if (booking) booking.cancellation_requested_at = new Date().toISOString(); return json(response, { ok: true, booking }); }
        return json(response, { error: state.user.arrival_pack.first_payment_completed ? 'booking_pending' : 'arrival_payment_required' }, 409);
      }
      if (url.pathname === '/portal/api/payments') {
        if (!state.user.arrival_pack) return json(response, { error: 'arrival_pack_required' }, 403);
        return json(response, { user: { ...state.user, role: 'client', tipo: 'llegada' }, payments: state.payments, contract_plan: [{ installment: 1, amount: 850 }, { installment: 2, amount: 850 }] });
      }
      if (url.pathname.endsWith('/auth/logout')) return json(response, { ok: true });
      return json(response, { error: 'preview_read_only', detail: 'Esta operación no se ejecuta en la muestra local.' }, 501);
    }
    if (url.pathname === '/__preview/billing') return html(response, '<!doctype html><html lang="es"><meta charset="utf-8"><title>Facturación · muestra local</title><h1>Facturación de muestra</h1><p>En el servicio publicado se abre el proveedor de tu suscripción. Esta muestra no realiza cobros.</p><a href="/therobinplan/?scenario=suscripcion&tab=pagos">Volver a Pagos</a></html>');
    if (url.pathname === '/portal/logout') { response.writeHead(302, { location: '/' }); return response.end(); }
    const portal = url.pathname.startsWith('/portal/') || url.pathname === '/portal' || url.pathname === '/login';
    const community = url.pathname.startsWith('/therobinplan/') || url.pathname === '/therobinplan';
    if (!portal && !community) return html(response, '<h1>Vista no disponible en esta muestra</h1>', 404);
    const base = frontendRoots[portal ? 'portal' : 'community'];
    const prefix = portal ? '/portal/' : '/therobinplan/';
    const page = ['/therobinplan', '/therobinplan/', '/portal', '/portal/', '/login'].includes(url.pathname);
    const file = page ? resolve(base, 'index.html') : resolve(base, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (!file.startsWith(base + sep)) return html(response, '<h1>Vista no disponible</h1>', 404);
    try {
      const bytes = await readFile(file);
      const contentType = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }[extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
      response.end(page ? bytes.toString().replace(/<title>.*?<\/title>/, '<title>Muestra local · Robin</title>') : bytes);
    } catch { return html(response, '<h1>Compila primero las aplicaciones para abrir esta muestra</h1>', 404); }

  } catch (error) { console.error(error.message); if (!response.headersSent) json(response, { error: 'preview_error' }, 500); else response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Muestra local (datos ficticios): http://localhost:${port}/`));
function stop() { server.close(() => process.exit(0)); }
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
