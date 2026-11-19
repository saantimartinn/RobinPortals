const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const flow = import('../../../packages/onboarding/flow.mjs');
const user = { id: 'arrival-onboarding', tipo: 'llegada', requires_onboarding: true, origin: 'espana', dni_completed: true, contract_signed: true, profile_completed: false, pago_completed: false };

function load(name, mocks) {
  const filename = path.resolve(__dirname, '../netlify/functions', name + '.js');
  const original = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename === filename && mocks[request]) return mocks[request];
    return original.call(this, request, parent, isMain);
  };
  delete require.cache[filename];
  try { return require(filename).handler; }
  finally { Module._load = original; delete require.cache[filename]; }
}

test('Llegada keeps request, identity, contract and payment without an academic questionnaire', async () => {
  const { onboardingOrder, nextOnboardingStep, hasCompletedOnboarding } = await flow;
  assert.deepEqual(onboardingOrder(user), ['origin', 'dni', 'contract', 'payment']);
  assert.equal(nextOnboardingStep(user), 'payment');
  assert.equal(nextOnboardingStep({ ...user, pago_completed: true }), null);
  assert.equal(hasCompletedOnboarding({ ...user, pago_completed: true }), true);
  assert.equal(user.profile_completed, false);
  for (const [patch, expected] of [[{ origin: null }, 'origin'], [{ dni_completed: false }, 'dni'], [{ contract_signed: false }, 'contract']]) {
    assert.equal(nextOnboardingStep({ ...user, ...patch }), expected);
  }
});

test('the other products retain all five onboarding steps and still require their form after payment', async () => {
  const { ONBOARDING_ORDER, onboardingOrder, nextOnboardingStep } = await flow;
  for (const tipo of ['general', 'delft', 'mentoria', undefined]) {
    const standard = { ...user, tipo };
    assert.equal(onboardingOrder(standard), ONBOARDING_ORDER);
    assert.equal(nextOnboardingStep(standard), 'payment');
    assert.equal(nextOnboardingStep({ ...standard, pago_completed: true }), 'profile');
    assert.equal(nextOnboardingStep({ ...standard, profile_completed: true }), 'payment');
    assert.equal(nextOnboardingStep({ ...standard, profile_completed: true, pago_completed: true }), null);
  }
  assert.equal(nextOnboardingStep({ ...user, requires_onboarding: false }), null);
});

test('onboarding state advances Llegada to payment without modifying stored profile flags or answers', async () => {
  for (const actual of [user, { ...user, pago_completed: true }, { ...user, tipo: 'general' }]) {
    const handler = load('onboarding-state', {
      '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
      '../../lib/supabase': { getSupabase: () => ({ from: () => ({ select() { return this; }, eq(key, value) { assert.equal(value, user.id); return this; }, single: async () => ({ data: actual }) }) }) },
    });
    const response = await handler({ httpMethod: 'GET', headers: {} });
    assert.equal(response.statusCode, 200);
    const state = JSON.parse(response.body);
    assert.equal(state.next_step, actual.pago_completed ? null : 'payment');
    assert.equal(state.profile_completed, false);
  }
});

test('login and resumed onboarding agree on the next step for Llegada and standard clients', async () => {
  const { nextOnboardingStep } = await flow;
  for (const actual of [user, { ...user, dni_completed: false }, { ...user, contract_signed: false }, { ...user, tipo: 'general' }]) {
    const handler = load('auth-login', {
      '../../lib/auth': { signSession: () => 'test-token', buildSessionCookie: () => 'test-cookie' },
      '../../lib/supabase': { getSupabase: () => ({}) },
      '../../lib/identity': { findIdentityCandidates: async () => [], resolvePasswordCandidate: () => ({ status: 'ok', candidate: { row: actual } }) },
      '../../lib/observability': { createOperationLogger: () => ({ start() {}, success() {}, warn() {}, failure() {} }) },
    });
    const response = await handler({ httpMethod: 'POST', headers: {}, body: '{"username":"fixture","password":"test-only"}' });
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).next_step, nextOnboardingStep(actual));
  }
});
