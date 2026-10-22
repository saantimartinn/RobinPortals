// Automated checks for career requirements test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  documentRequirements,
  findCareerDocument,
  normalizeCareerRequirement,
  normalizeDeadline,
} = require('../lib/career-requirements');

test('normaliza documentos y eventos con deadline', () => {
  const document = normalizeCareerRequirement({ id: 'doc-1', name: '  CV  ', deadline: '2027-01-15' });
  const event = normalizeCareerRequirement({ id: 'event-1', type: 'event', name: 'Cierre', deadline: '2027-02-01', required: true });

  assert.equal(document.type, 'document');
  assert.equal(document.name, 'CV');
  assert.equal(document.deadline, '2027-01-15');
  assert.equal(document.required, true);
  assert.deepEqual(event, { id: 'event-1', type: 'event', name: 'Cierre', deadline: '2027-02-01', required: false });
});

test('rechaza deadlines imposibles y filtra eventos de la lista documental', () => {
  assert.equal(normalizeDeadline('2027-02-30'), null);
  assert.deepEqual(documentRequirements([
    { type: 'document', name: 'CV' },
    { type: 'event', name: 'Cierre de solicitud' },
    { name: 'Pasaporte' },
  ]).map((item) => item.name), ['CV', 'Pasaporte']);
});

test('encuentra el documento existente al renombrar un requisito', () => {
  const existing = [{ id: 'd1', career_template_id: 'c1', name: 'Carta antigua' }];
  const match = findCareerDocument(existing, 'c1', { name: 'Carta nueva' }, { name: 'Carta antigua' });
  assert.equal(match.id, 'd1');
});
