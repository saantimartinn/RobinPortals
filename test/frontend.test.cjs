const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const React = require('react');
const { renderToString } = require('react-dom/server');

test('frontend entry points and domain views render with local fixtures', async t => {
  const frontendRequire = createRequire(path.resolve('frontend/package.json'));
  const { createServer } = await import(pathToFileURL(frontendRequire.resolve('vite')).href);
  const server = await createServer({
    root: path.resolve('frontend'),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  });
  const user = { id: 'fixture-user', role: 'subscriber', nombre: 'Prueba', subscription_status: 'active', ciudad: 'Rotterdam' };
  const noop = () => {};
  const cases = [
    ['features/auth/SubscriberAuthScreen.jsx', 'SubscriberAuthScreen', { onLogin: noop, onSignup: noop }, 'The Robin Plan'],
    ['application/SubscriberPortal.jsx', 'SubscriberPortal', { user: { ...user, subscription_status: 'none' }, onLogout: noop, onUserRefresh: noop }, 'plan'],
    ['features/admin/SubscriberAdmin.jsx', 'SubscriberAdmin', { user: { ...user, role: 'subscriber_admin' }, onLogout: noop }, 'Usuarios'],
    ['features/subscription/SubHome.jsx', 'SubHome', { user, events: [], partners: [], requests: [], setActive: noop }, 'Plan Mensual'],
    ['features/community/SubCommunity.jsx', 'SubCommunity', { user, events: [], partners: [], loading: false, onRefresh: noop }, 'Community'],
    ['features/profile/SubProfile.jsx', 'SubProfile', { user, onUserRefresh: noop, setActive: noop }, 'perfil'],
  ];
  try {
    for (const [file, name, props, expected] of cases) {
      await t.test(name, async () => {
        const module = await server.ssrLoadModule(`/src/${file}`);
        const html = renderToString(React.createElement(module[name], props));
        assert.match(html, new RegExp(expected, 'i'));
      });
    }
  } finally { await server.close(); }
});
