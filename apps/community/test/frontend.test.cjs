// Automated checks for frontend test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const React = require('react');
const { renderToString } = require('react-dom/server');

test('frontend entry points and domain views render with local fixtures', async t => {
  const frontendRequire = createRequire(path.resolve('frontend/package.json'));
  const vite = await import(pathToFileURL(frontendRequire.resolve('vite')).href);
  const createServer = vite.createServer || vite.default?.createServer;
  const server = await createServer({
    root: path.resolve('frontend'),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  });
  const user = { id: 'fixture-user', role: 'subscriber', nombre: 'Prueba', subscription_status: 'active', ciudad: 'Rotterdam' };
  const noop = () => {};
  const cases = [
    ['application/SubscriberPortal.jsx', 'SubscriberPortal', { user: { ...user, subscription_status: 'none' }, onLogout: noop, onUserRefresh: noop }, 'plan'],
    ['features/admin/SubscriberAdmin.jsx', 'SubscriberAdmin', { user: { ...user, role: 'subscriber_admin' }, onLogout: noop }, 'Usuarios'],
    ['features/subscription/SubHome.jsx', 'SubHome', { user, events: [], partners: [], requests: [], setActive: noop }, 'Plan Mensual'],
    ['features/community/SubPartners.jsx', 'SubPartners', { partners: [{ id: 'p1', name: 'Partner demo', category: 'other', logo_url: 'https://assets.example.test/logo.png' }], loading: false }, 'Logo de Partner demo'],
    ['application/SubscriberPortal.jsx', 'SubscriberPortal', { user: { ...user, community_access: 'arrival', subscription_status: 'none', arrival_pack: { status: 'active', first_payment_completed: true } }, onLogout: noop, onUserRefresh: noop }, 'Pack Llegada'],
    ['features/arrival/ArrivalCalls.jsx', 'ArrivalCalls', { user: { ...user, arrival_pack: { first_payment_completed: true } } }, 'Reservar llamada con mi asesor'],
    ['features/arrival/ArrivalPayments.jsx', 'ArrivalPayments', {}, 'Pagos · Pack Llegada'],
  ];
  try {
    for (const [file, name, props, expected] of cases) {
      await t.test(name, async () => {
        const module = await server.ssrLoadModule(`/src/${file}`);
        const html = renderToString(React.createElement(module[name], props));
        assert.match(html, new RegExp(expected, 'i'));
      });
    }
    await t.test('a subscription has an informational calls page without a booking form', async () => {
      const { ArrivalCalls } = await server.ssrLoadModule('/src/features/arrival/ArrivalCalls.jsx');
      const html = renderToString(React.createElement(ArrivalCalls, { user, onSupport: noop }));
      assert.match(html, /Tu suscripción no incluye este servicio/);
      assert.match(html, /Contactar con Soporte/);
      assert.ok(!html.includes('Reservar llamada con mi asesor'));
      assert.ok(!html.includes('Reservar Meet'));
    });
    await t.test('a valid session needs one request; only an expired session repeats SSO', async () => {
      const { restoreSession } = await server.ssrLoadModule('/src/api/index.js');
      const originalFetch = globalThis.fetch;
      const cases = [
        { statuses: [200], expected: ['GET /therobinplan/api/me'] },
        { statuses: [401, 200, 200], expected: ['GET /therobinplan/api/me', 'POST /therobinplan/api/auth/sso', 'GET /therobinplan/api/me'] },
        { statuses: [503], expected: ['GET /therobinplan/api/me'], error: 503 },
      ];
      try {
        for (const example of cases) {
          const calls = [];
          globalThis.fetch = async (url, options) => {
            calls.push(`${options.method} ${url}`);
            const status = example.statuses[calls.length - 1];
            assert.ok(status, 'unexpected extra authentication request');
            return new Response(JSON.stringify(status === 200 ? user : { error: 'unavailable' }), { status });
          };
          if (example.error) await assert.rejects(restoreSession(), error => error.status === example.error);
          else assert.equal((await restoreSession()).id, user.id);
          assert.deepEqual(calls, example.expected);
        }
      } finally { globalThis.fetch = originalFetch; }
    });
    await t.test('partner category catalogue is available to admins and subscribers', async () => {
      const module = await server.ssrLoadModule('/src/features/community/SubPartners.jsx');
      const html = renderToString(React.createElement(module.SubPartners, { partners: [], loading: false }));
      for (const label of ['Desarrollo profesional','Academias','Fiesta','Eventos sociales','Eventos culturales','Apoyo legal','Trabajo']) {
        assert.match(html, new RegExp(label, 'i'));
      }
    });
    await t.test('Llegada partner logos and actions use dialog buttons without outgoing Revolut or TSH links', async () => {
      const { partnersForArrival } = require('../backend/lib/arrival-partners');
      const { SubPartners } = await server.ssrLoadModule('/src/features/community/SubPartners.jsx');
      const partners = partnersForArrival([
        { id: 'r', name: 'Revolut', contact_url: 'https://www.revolut.com/', booking_url: 'https://revolut.example/book' },
        { id: 't', name: 'The Social Hub', contact_url: 'https://www.thesocialhub.co/', booking_url: 'https://tsh.example/book' },
        { id: 's', name: 'Swapfiets', contact_url: 'https://swapfiets.nl/en-NL/students', discount: 'ROBIN' },
      ]);
      const html = renderToString(React.createElement(SubPartners, { partners, loading: false, websiteStyle: true }));
      for (const url of ['https://www.revolut.com/', 'https://www.thesocialhub.co/', 'https://revolut.example/book', 'https://tsh.example/book']) assert.ok(!html.includes(url));
      assert.equal((html.match(/aria-haspopup="dialog"/g) || []).length, 4);
      assert.match(html, /El link único aún no está disponible\./);
      assert.match(html, /aria-describedby="partner-link-message"/);
      assert.match(html, /Tu descuento en Swapfiets/);
      assert.match(html, /https:\/\/swapfiets.nl\/en-NL\/students/);
      for (const partner of partners) assert.ok(html.includes(partner.arrival_description));
    });
    await t.test('full Community partner cards retain operator descriptions and their normal external links', async () => {
      const { SubPartners } = await server.ssrLoadModule('/src/features/community/SubPartners.jsx');
      const html = renderToString(React.createElement(SubPartners, { partners: [{ id: 'r', name: 'Revolut', description: 'Contenido del equipo', contact_url: 'https://www.revolut.com/' }], loading: false }));
      assert.match(html, /Contenido del equipo/);
      assert.match(html, /href="https:\/\/www.revolut.com\/"/);
      assert.ok(!html.includes('El link único aún no está disponible.'));
    });
    await t.test('every member uses the Llegada navigation without obsolete tabs', async () => {
      const { SubscriberShell } = await server.ssrLoadModule('/src/application/SubscriberShell.jsx');
      const arrival = renderToString(React.createElement(SubscriberShell, { user: { ...user, community_access: 'arrival', arrival_pack: { status: 'active' } }, onLogout: noop, onUserRefresh: noop }));
      for (const label of ['Inicio', 'Llamadas', 'Tu habitación', 'Partners', 'Pagos', 'Soporte', 'FAQs', 'Ajustes']) assert.ok(arrival.includes(label));
      for (const label of ['Lifestyle', 'Career Support', 'Mis eventos', 'Perks &amp; Partners', 'Tu vida fuera, un poco más fácil.']) assert.ok(!arrival.includes(label), label);
      const full = renderToString(React.createElement(SubscriberShell, { user: { ...user, community_access: 'full', arrival_pack: { status: 'active' } }, onLogout: noop, onUserRefresh: noop }));
      const monthly = renderToString(React.createElement(SubscriberShell, { user: { ...user, community_access: 'full' }, onLogout: noop, onUserRefresh: noop }));
      for (const html of [full, monthly]) {
        for (const label of ['Inicio', 'Llamadas', 'Tu habitación', 'Partners', 'Pagos', 'Soporte', 'FAQs', 'Ajustes']) assert.ok(html.includes(label));
        for (const label of ['Lifestyle', 'Career Support', 'Mis eventos', 'Perks &amp; Partners']) assert.ok(!html.includes(label), label);
      }
      assert.match(monthly, /Tu suscripción no incluye este servicio/);
      assert.ok(!monthly.includes('Reservar llamada con mi asesor'));
    });
  } finally { await server.close(); }
});
