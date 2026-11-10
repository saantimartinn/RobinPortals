const test = require('node:test');
const assert = require('node:assert/strict');
const loadQuestions = () => import('../portal-source/src/questionnaire-data.js');

test('pregunta modalidad como respuesta abierta opcional para cualquier sistema', async () => {
  const { Q_GENERAL, visibleQuestionnaireBlocks } = await loadQuestions();
  for (const system of ['Bachillerato español', 'Bachillerato Internacional (IB)', 'A-Levels (británico)', 'Otro']) {
    const questions = visibleQuestionnaireBlocks([Q_GENERAL], { g_sistema: system })[0].questions;
    const index = questions.findIndex((q) => q.id === 'g_sistema');
    assert.equal(questions[index + 1].id, 'g_modalidad');
    assert.equal(questions[index + 1].type, 'text');
    assert.equal(questions[index + 1].optional, true);
    assert.equal(questions[index + 1].options, undefined);
  }
});

test('pregunta certificación después del nivel y pide el nombre solo si tiene una', async () => {
  const { Q_GENERAL, Q_MASTER_BLOCKS, visibleQuestionnaireBlocks } = await loadQuestions();
  for (const [prefix, blocks] of [['g', [Q_GENERAL]], ['m', Q_MASTER_BLOCKS]]) {
    const withCertificate = visibleQuestionnaireBlocks(blocks, { [`${prefix}_certificado`]: 'Sí' }).flatMap((block) => block.questions);
    const index = withCertificate.findIndex((q) => q.id === `${prefix}_ingles`);
    assert.equal(withCertificate[index + 1].id, `${prefix}_certificado`);
    assert.equal(withCertificate[index + 2].id, `${prefix}_certificado_nombre`);
    assert.equal(withCertificate[index + 2].optional, undefined);
    const withoutCertificate = visibleQuestionnaireBlocks(blocks, {
      [`${prefix}_certificado`]: 'No', [`${prefix}_certificado_nombre`]: 'IELTS Academic',
    }).flatMap((block) => block.questions);
    assert.ok(!withoutCertificate.some((q) => q.id === `${prefix}_certificado_nombre`));
  }
});

test('la certificación se elige entre B1, B2, C1 y C2, y no se preguntan países', async () => {
  const { Q_GENERAL, Q_MASTER_BLOCKS, Q_VOCACIONAL } = await loadQuestions();
  for (const questions of [Q_GENERAL.questions, Q_MASTER_BLOCKS.flatMap((block) => block.questions)]) {
    const certificate = questions.find((q) => q.id.endsWith('_certificado_nombre'));
    assert.equal(certificate.type, 'single');
    assert.deepEqual(certificate.options, ['B1', 'B2', 'C1', 'C2']);
  }
  assert.ok(!Q_VOCACIONAL.questions.some((q) => q.id === 'v_paises'));
});
