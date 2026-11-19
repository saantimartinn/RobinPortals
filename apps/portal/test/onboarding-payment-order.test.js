const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const signedUser = { id: 'student-1', requires_onboarding: true, origin: 'espana', dni_completed: true, contract_signed: true, pago_completed: false, profile_completed: false };

function database(user) {
  const updates = [];
  return {
    updates,
    from(table) {
      assert.equal(table, 'users');
      let patch = null;
      const query = {
        select() { return query; },
        eq() { return query; },
        neq() { return query; },
        or() { return query; },
        update(value) { patch = value; return query; },
        single: async () => ({ data: { ...user }, error: null }),
        then(resolve) {
          if (patch) { updates.push(patch); Object.assign(user, patch); }
          return Promise.resolve({ data: patch ? [{ id: user.id }] : [], error: null }).then(resolve);
        },
      };
      return query;
    },
  };
}

async function withModule(app, relative, user, run) {
  const file = require.resolve(path.resolve(__dirname, '../../', app, relative));
  const db = database(user);
  const original = Module._load;
  const mocks = {
    '../../lib/supabase': { getSupabase: () => db },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
    '../../lib/integration-sync': { syncGoogleSheets: async () => {} },
    './supabase': {},
    './google-drive': {},
    './contract-pdf': {},
    './storage': {},
    './sandbox-mode': { isIsolatedSandbox: () => true },
    './payments': { ensurePayments: async () => [] },
    './integration-sync': { syncGoogleSheets: async () => {}, syncHoldedInvoice: async () => {} },
    './onboarding-welcome': { sendWelcomeEmail: async () => {} },
  };
  Module._load = function (request, parent, isMain) {
    if (parent?.filename === file && mocks[request]) return mocks[request];
    return original.call(this, request, parent, isMain);
  };
  delete require.cache[file];
  try { await run(require(file), db); }
  finally { Module._load = original; delete require.cache[file]; }
}

for (const app of ['portal', 'robinjr']) {
  test(`${app}: después del contrato se paga antes de responder al perfil`, async () => {
    const user = { ...signedUser };
    await withModule(app, 'netlify/functions/onboarding-state.js', user, async ({ handler }) => {
      const current = async () => JSON.parse((await handler({ httpMethod: 'GET' })).body).next_step;
      assert.equal(await current(), 'payment');
      user.pago_completed = true;
      assert.equal(await current(), 'profile');
      user.profile_completed = true;
      assert.equal(await current(), null);
    });
  });

  test(`${app}: confirmar el pago conserva el cuestionario pendiente y los reintentos son idempotentes`, async () => {
    const user = { ...signedUser };
    await withModule(app, 'lib/onboarding-fulfill.js', user, async ({ markOnboardingPaid }, db) => {
      assert.equal((await markOnboardingPaid(db, user.id, { simulated: true })).ok, true);
      assert.equal(user.pago_completed, true);
      assert.equal(user.requires_onboarding, true);
      await markOnboardingPaid(db, user.id, { simulated: true });
      assert.equal(user.requires_onboarding, true);
      assert.equal(db.updates.length, 1);
    });
  });

  test(`${app}: un perfil antiguo ya completado termina al pagar y los pagos previos no se repiten`, async () => {
    const user = { ...signedUser, profile_completed: true };
    await withModule(app, 'lib/onboarding-fulfill.js', user, async ({ markOnboardingPaid }, db) => {
      await markOnboardingPaid(db, user.id, { simulated: true });
      assert.equal(user.requires_onboarding, false);
    });
    await withModule(app, 'netlify/functions/onboarding-state.js', { ...signedUser, pago_completed: true }, async ({ handler }) => {
      assert.equal(JSON.parse((await handler({ httpMethod: 'GET' })).body).next_step, 'profile');
    });
  });

  test(`${app}: el cuestionario es el último paso y al guardarlo termina el onboarding pagado`, async () => {
    const user = { ...signedUser, pago_completed: true };
    await withModule(app, 'netlify/functions/onboarding-profile.js', user, async ({ handler }) => {
      const response = await handler({
        httpMethod: 'POST',
        headers: { host: 'portal.test', origin: 'https://portal.test' },
        body: JSON.stringify({ email: 'student@example.com', intereses: ['ciencias'], academic_system: 'bachillerato_espanol', academic_subjects: [{ name: 'Física', level: '' }], questionnaire: { version: 1, blocks: [{ title: 'General', items: [] }], signals: { asignaturas: [{ name: 'Física', preference: 'like' }] } } }),
      });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(user.profile_completed, true);
      assert.equal(user.pago_completed, true);
      assert.equal(user.requires_onboarding, false);
    });
  });
}

test('el orden compartido y los requisitos conservan DNI, contrato y pago antes del perfil', async () => {
  const { ONBOARDING_ORDER, nextOnboardingStep, hasCompletedOnboarding } = await import('../../../packages/onboarding/flow.mjs');
  assert.deepEqual(ONBOARDING_ORDER, ['origin', 'dni', 'contract', 'payment', 'profile']);
  for (const [field, step] of [['origin', 'origin'], ['dni_completed', 'dni'], ['contract_signed', 'contract']]) {
    assert.equal(nextOnboardingStep({ ...signedUser, [field]: false }), step);
  }
  assert.equal(nextOnboardingStep({ ...signedUser, requires_onboarding: false }), null);
  assert.equal(hasCompletedOnboarding({ ...signedUser, pago_completed: true }), false);
  assert.equal(hasCompletedOnboarding({ ...signedUser, pago_completed: true, profile_completed: true }), true);
});

test('portal: el pago de Pack Llegada termina el onboarding sin exigir el perfil académico', async () => {
  const user = { ...signedUser, tipo: 'llegada' };
  await withModule('portal', 'lib/onboarding-fulfill.js', user, async ({ markOnboardingPaid }, db) => {
    await markOnboardingPaid(db, user.id, { simulated: true });
    assert.equal(user.pago_completed, true);
    assert.equal(user.requires_onboarding, false);
    assert.equal(user.profile_completed, false);
    await markOnboardingPaid(db, user.id, { simulated: true });
    assert.equal(db.updates.length, 1);
  });
});
