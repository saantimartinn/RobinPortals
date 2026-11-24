const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');

// Bundle the real client views just as Vite does, then render both languages
// without sessions, external services or a listening development server.
for (const app of ['portal', 'robinjr', 'community']) {
  test(`${app}: client screens render in both languages and preserve client names and form values`, () => {
    const frontend = path.resolve(__dirname, '../../apps', app, app === 'community' ? 'frontend' : 'portal-source');
    const localRequire = createRequire(path.join(frontend, 'package.json'));
    const { buildSync } = localRequire('esbuild');
    const React = localRequire('react');
    const { renderToStaticMarkup } = localRequire('react-dom/server');
    const cases = app === 'community' ? [
      ['application/SubscriberShell.jsx', 'SubscriberShell', { community_access: 'arrival', arrival_pack: { status: 'active', first_payment_completed: true } }, 'Tu Pack Llegada', 'Your Arrival Pack'],
      ['application/SubscriberShell.jsx', 'SubscriberShell', { subscription_plan: 'monthly' }, 'Tu espacio', 'Your space'],
      ['features/subscription/SubHome.jsx', 'SubHome', { subscription_plan: 'monthly' }, 'Plan Mensual', 'Monthly plan'],
      ['features/arrival/ArrivalCalls.jsx', 'ArrivalCalls', {}, 'Tu suscripción no incluye este servicio.', 'Your subscription does not include this service.'],
      ['features/arrival/ArrivalSettings.jsx', 'ArrivalSettings', { arrival_pack: { status: 'active' } }, 'Datos personales', 'Personal details'],
      ['features/subscription/SubPayments.jsx', 'SubPayments', {}, 'Pagos y facturación', 'Payments and billing'],
    ] : [
      ['application/ApplicationPortals.jsx', 'PortalShell', {}, app === 'portal' ? 'Mi camino' : 'Mi plan', app === 'portal' ? 'My journey' : 'My plan'],
      ['application/onboarding/origin.jsx', 'OnboardingOrigin', {}, 'Tu solicitud', 'Your application'],
      ['application/onboarding/contract.jsx', 'OnboardingContract', {}, 'Firmar y continuar', 'Sign and continue'],
      ['application/onboarding/profile.jsx', 'OnboardingProfile', {}, 'Tu perfil académico', 'Your academic profile'],
    ];
    const exports = cases.map(([file, component], i) => `export { ${component} as View${i} } from ${JSON.stringify(path.join(frontend, 'src', file))};`).join('\n');
    const bundle = buildSync({
      stdin: { contents: `${exports}\nexport { CrossPortalNav } from ${JSON.stringify(path.join(frontend, 'src/application/CrossPortalNav.jsx'))};\nexport { setLanguage, setTranslationsEnabled } from ${JSON.stringify(path.resolve(__dirname, '../../packages/i18n/language.js'))};`, resolveDir: frontend },
      bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
      external: ['react', 'react-dom', 'framer-motion'],
      loader: { '.css': 'empty', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
      define: { 'import.meta.env': '{}' }, logLevel: 'silent',
    });
    const module = { exports: {} };
    const browser = { addEventListener() {}, matchMedia: () => ({ matches: false }), location: { search: '', pathname: '/portal/' } };
    new Function('require', 'module', 'exports', 'window', bundle.outputFiles[0].text)(localRequire, module, module.exports, browser);
    const user = { id: 'fixture', nombre: 'María', apellidos: 'Fernández', email: 'maria@example.test', tipo: app === 'robinjr' ? 'robin_junior' : 'general', pricing_version: app === 'robinjr' ? 'robin-jr-1499-v2' : undefined, role: 'subscriber', subscription_status: 'active', ciudad: 'Rotterdam' };
    module.exports.setLanguage('en');
    const header = renderToStaticMarkup(React.createElement(module.exports.CrossPortalNav, { user }));
    assert.ok(header.includes('Idioma / Language'));
    assert.ok(/<option(?=[^>]*value="en")(?=[^>]*selected)/.test(header), header.match(/<select[\s\S]*?<\/select>/)?.[0]);
    module.exports.setTranslationsEnabled(false);
    const adminHeader = renderToStaticMarkup(React.createElement(module.exports.CrossPortalNav, { user: { ...user, role: 'admin', is_application_admin: true } }));
    assert.ok(!adminHeader.includes('Idioma / Language'));
    module.exports.setTranslationsEnabled(true);
    cases.forEach(([, , extra, spanish, english], index) => {
      const props = { user: { ...user, ...extra }, clientName: 'María Fernández', active: 'estado', setActive() {}, onLogout() {}, onDone() {}, requests: [], partners: [], events: [], loading: false };
      module.exports.setLanguage('es');
      const es = renderToStaticMarkup(React.createElement(module.exports[`View${index}`], props));
      assert.ok(es.includes(spanish), `${app} ${index}: ${spanish}`);
      module.exports.setLanguage('en');
      const en = renderToStaticMarkup(React.createElement(module.exports[`View${index}`], props));
      assert.ok(en.includes(english), `${app} ${index}: ${english}`);
      if (es.includes('María')) assert.ok(en.includes('María'));
      if (es.includes('value="maria@example.test"')) assert.ok(en.includes('value="maria@example.test"'));
      if (index === 2 && app !== 'community') {
        assert.ok(en.includes('Purpose of the agreement'));
        assert.ok(en.includes('PROJECT ROBIN STUDENTS MOBILITY S.L.'));
        assert.ok(en.includes('€1,999') || en.includes('€1,499'), en.match(/(?:precio|price|€|IVA)[^<>]*/g)?.join(' | '));
      }
    });
  });
}
