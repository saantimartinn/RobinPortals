const test = require('node:test');
const assert = require('node:assert/strict');
const { focusedHistoryContext } = require('../../../packages/meeting-history/assistant-context.cjs');

test('el alumno enfocado conserva el historial posterior a los primeros 1200 caracteres', () => {
  const history = 'Contexto previo. '.repeat(300) + 'Decisión final: estudiar Biología.';
  const result = focusedHistoryContext([{ id: 'mine', historial: history, academic_system: 'ib' }], 'mine');
  assert.equal(result.historial, history);
  assert.match(result.historial, /Decisión final: estudiar Biología\.$/);
  assert.equal(result.academic_system, 'ib');
});
test('un alumno ajeno a la cartera no puede convertirse en el contexto de la consulta', () => {
  assert.throws(() => focusedHistoryContext([{ id: 'mine' }], 'other'), /focus_not_assigned/);
  assert.equal(focusedHistoryContext([{ id: 'mine' }], null), null);
});
