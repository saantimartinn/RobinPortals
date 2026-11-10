const test = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../portal-source/src/application/onboarding/conversation-sections.js');

test('Robin anuncia cada área específica al entrar y no repite el aviso en las siguientes preguntas', async () => {
  const { sectionIntroduction } = await load();
  const { Q_GENERAL, Q_AREAS } = await import('../portal-source/src/questionnaire-data.js');
  for (const block of Object.values(Q_AREAS)) {
    const current = { kind: 'question', block };
    const message = sectionIntroduction(current, { kind: 'question', block: Q_GENERAL });
    assert.match(message, /preguntas específicas/);
    assert.ok(message.includes(block.title.split('·')[1].trim()));
    assert.equal(sectionIntroduction(current, current), '');
  }
});

test('anuncia la información general, el perfil vocacional y la sección final', async () => {
  const { sectionIntroduction } = await load();
  const { Q_GENERAL, Q_VOCACIONAL } = await import('../portal-source/src/questionnaire-data.js');
  assert.match(sectionIntroduction({ kind: 'question', block: Q_GENERAL }, { kind: 'intro' }), /conocerte mejor/);
  assert.match(sectionIntroduction({ kind: 'question', block: Q_VOCACIONAL }, { kind: 'question', block: Q_GENERAL }), /futuro/);
  assert.match(sectionIntroduction({ kind: 'academic' }, { kind: 'question', block: Q_GENERAL }), /último/);
  assert.equal(sectionIntroduction({ kind: 'intro' }), '');
});
