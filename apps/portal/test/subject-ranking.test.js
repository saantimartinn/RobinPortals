const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../portal-source/src/application/onboarding/subject-ranking.js');

test('cada asignatura conserva un pulgar seleccionado y permite cambiar de opinión', async () => {
  const { toggleSubjectPreference } = await load();
  let subjects = [{ name: 'Física', preference: null }, { name: 'Historia', preference: null }];
  subjects = toggleSubjectPreference(subjects, 0, 'like');
  assert.equal(subjects[0].preference, 'like');
  subjects = toggleSubjectPreference(subjects, 0, 'dislike');
  assert.equal(subjects[0].preference, 'dislike');
  subjects = toggleSubjectPreference(subjects, 0, 'dislike');
  assert.equal(subjects[0].preference, 'dislike');
  assert.deepEqual(subjects.map((s) => s.name), ['Física', 'Historia']);
});

test('el resumen y las señales guardadas no asignan posiciones de preferencia', async () => {
  const { formatSubjectRanking, subjectRankingSignals } = await load();
  const subjects = [{ name: 'Arte', preference: 'like' }, { name: 'Historia', preference: null }, { name: 'Física', preference: 'dislike' }];
  assert.deepEqual(formatSubjectRanking(subjects), ['Arte — Me gusta', 'Historia', 'Física — No me gusta']);
  const signals = subjectRankingSignals(subjects);
  assert.deepEqual(signals.asignaturas_fav, ['Arte']);
  assert.deepEqual(signals.asignaturas_menos, ['Física']);
  assert.deepEqual(signals.asignaturas.map((s) => s.name), ['Arte', 'Historia', 'Física']);
  assert.ok(signals.asignaturas.every(subject => !('rank' in subject)));
  assert.equal(signals.asignaturas_ordenadas, undefined);
});

test('la lista sustituye las preguntas antiguas y va después de la especialidad', async () => {
  const { Q_GENERAL } = await import('../portal-source/src/questionnaire-data.js');
  const ids = Q_GENERAL.questions.map((q) => q.id);
  assert.equal(ids[ids.indexOf('g_modalidad') + 1], 'g_asignaturas');
  assert.ok(!ids.includes('g_fav'));
  assert.ok(!ids.includes('g_menos'));
});
