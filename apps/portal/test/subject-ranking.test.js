const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../portal-source/src/application/onboarding/subject-ranking.js');

test('reordena asignaturas conservando niveles y preferencias sin modificar el original', async () => {
  const { moveSubject } = await load();
  const original = [{ name: 'Matemáticas', level: 'hl', preference: 'like' }, { name: 'Historia', level: 'sl', preference: null }];
  assert.deepEqual(moveSubject(original, 1, 0), [original[1], original[0]]);
  assert.equal(original[0].name, 'Matemáticas');
  assert.deepEqual(moveSubject(original, 0, -1), original);
});

test('los pulgares se pueden alternar o desmarcar y no afectan al orden', async () => {
  const { toggleSubjectPreference } = await load();
  let subjects = [{ name: 'Física', preference: null }, { name: 'Historia', preference: null }];
  subjects = toggleSubjectPreference(subjects, 0, 'like');
  assert.equal(subjects[0].preference, 'like');
  subjects = toggleSubjectPreference(subjects, 0, 'dislike');
  assert.equal(subjects[0].preference, 'dislike');
  subjects = toggleSubjectPreference(subjects, 0, 'dislike');
  assert.equal(subjects[0].preference, null);
  assert.deepEqual(subjects.map((s) => s.name), ['Física', 'Historia']);
});

test('el resumen y las señales guardadas respetan el orden y los pulgares', async () => {
  const { formatSubjectRanking, subjectRankingSignals } = await load();
  const subjects = [{ name: 'Arte', preference: 'like' }, { name: 'Historia', preference: null }, { name: 'Física', preference: 'dislike' }];
  assert.deepEqual(formatSubjectRanking(subjects), ['1. Arte — Me gusta', '2. Historia', '3. Física — No me gusta']);
  const signals = subjectRankingSignals(subjects);
  assert.deepEqual(signals.asignaturas_fav, ['Arte']);
  assert.deepEqual(signals.asignaturas_menos, ['Física']);
  assert.deepEqual(signals.asignaturas_ordenadas.map((s) => s.name), ['Arte', 'Historia', 'Física']);
});

test('la lista sustituye las preguntas antiguas y va después de la especialidad', async () => {
  const { Q_GENERAL } = await import('../portal-source/src/questionnaire-data.js');
  const ids = Q_GENERAL.questions.map((q) => q.id);
  assert.equal(ids[ids.indexOf('g_modalidad') + 1], 'g_asignaturas');
  assert.ok(!ids.includes('g_fav'));
  assert.ok(!ids.includes('g_menos'));
});
