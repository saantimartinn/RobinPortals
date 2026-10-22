// Automated checks for admin navigation test; external services should remain outside this test boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_CLIENT_SECTIONS, INITIAL_ADMIN_NAVIGATION, adminNavigation } from '../portal-source/src/application/admin-navigation.js';

test('abrir un expediente selecciona alumno y progreso en una única transición', () => {
  assert.deepEqual(adminNavigation(INITIAL_ADMIN_NAVIGATION, { type: 'open', clientId: 'alex' }), { active: 'estado', selectedClientId: 'alex' });
});
test('todas las pestañas mantienen el alumno y cambiar de alumno mantiene la pestaña', () => {
  const initial = { active: 'estado', selectedClientId: 'alex' };
  for (const section of ADMIN_CLIENT_SECTIONS) {
    const next = adminNavigation(initial, { type: 'navigate', section });
    assert.deepEqual(next, { active: section, selectedClientId: 'alex' });
    assert.deepEqual(adminNavigation(next, { type: 'switch', clientId: 'lucia' }), { active: section, selectedClientId: 'lucia' });
  }
});
test('las vistas generales nunca conservan un cliente oculto en el contexto', () => {
  for (const section of ['inicio', 'clientes', 'notificaciones']) {
    assert.deepEqual(adminNavigation({ active: 'chat', selectedClientId: 'alex' }, { type: 'navigate', section }), { active: section, selectedClientId: null });
  }
});
test('no se puede abrir una pestaña de expediente sin seleccionar alumno', () => {
  for (const section of ADMIN_CLIENT_SECTIONS) assert.equal(adminNavigation(INITIAL_ADMIN_NAVIGATION, { type: 'navigate', section }), INITIAL_ADMIN_NAVIGATION);
  assert.equal(adminNavigation(INITIAL_ADMIN_NAVIGATION, { type: 'open', clientId: null }), INITIAL_ADMIN_NAVIGATION);
});
