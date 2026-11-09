const test = require('node:test');
const assert = require('node:assert/strict');
const { requestRecommenderHistory } = require('../../../shared/recommender-history.cjs');

test('entrega el último test completo para mostrarlo en el popup del CRM', async () => {
  const history = await requestRecommenderHistory('ana@example.com', 'secret', async () => ({
    ok: true,
    json: async () => ({ count: 3, sessions: [{
      id: 'session-3', created_at: '2026-11-09T12:00:00Z', first_name: 'Ana', last_name: 'García',
      school: 'Colegio Robin', origin_city: 'Madrid', origin_country: 'España', selected_area: 'ingenierias',
      academic_system: 'IB', academic_subjects: [{ name: 'Matemáticas', level: 'HL' }],
      questionnaire: { course: 'IB Year 2', blocks: [{ title: 'Intereses', items: [{ q: '¿Qué te gusta?', a: 'Ciencias' }] }] },
      recommendations: [{ career_name: 'Ingeniería', university: 'Universidad', city: 'Madrid', compatibility: 91 }],
    }] }),
  }));
  assert.equal(history.count, 3);
  assert.equal(history.sessions[0].course, 'IB Year 2');
  assert.equal(history.sessions[0].blocks[0].items[0].a, 'Ciencias');
  assert.equal(history.sessions[0].recommendations[0].career_name, 'Ingeniería');
});
