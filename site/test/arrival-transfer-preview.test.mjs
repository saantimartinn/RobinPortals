import test from 'node:test';
import assert from 'node:assert/strict';
import { planArrivalAccounts } from '../../dev/preview-arrival-transfer.mjs';

const hash = '$2b$12$' + 'a'.repeat(53);
const user = { id: 'source-id', tipo: 'llegada', username: 'arrival', email: 'arrival@example.test', lead_id: 'lead-1', password_hash: hash,
  requires_onboarding: true, dni_completed: true, contract_signed: true, pago_completed: false };

test('el plan conserva categoría, identificador y los pasos pendientes sin publicar credenciales', () => {
  const before = structuredClone(user);
  const [account] = planArrivalAccounts([user, { ...user, id: 'general', tipo: 'general' }], []);
  assert.equal(account.action, 'create');
  assert.equal(account.sourceId, account.targetId);
  assert.equal(account.category, 'llegada');
  assert.equal(account.onboarding.requires_onboarding, true);
  assert.equal(account.onboarding.contract_signed, true);
  assert.equal(account.onboarding.pago_completed, false);
  for (const item of ['credentials', 'contract', 'payment_amounts', 'payment_status', 'history', 'storage_files']) assert.ok(account.preserve.includes(item));
  assert.ok(!JSON.stringify(account).includes(hash));
  assert.deepEqual(user, before);
});

test('una coincidencia, una cuenta de personal o una credencial incompatible exige revisión', () => {
  for (const target of [{ id: user.id }, { id: 'target', email: 'ARRIVAL@EXAMPLE.TEST' }, { id: 'target', lead_id: user.lead_id }, { id: 'target', username: user.username }]) {
    assert.equal(planArrivalAccounts([user], [target])[0].blocked, 'existing_target_requires_review');
  }
  assert.equal(planArrivalAccounts([{ ...user, role: 'admin' }], [])[0].blocked, 'staff_identity');
  assert.equal(planArrivalAccounts([{ ...user, password_hash: 'plain-password' }], [])[0].blocked, 'credential_review_required');
  assert.equal(planArrivalAccounts([{ ...user, password_hash: null }], [])[0].blocked, 'credential_review_required');
});
