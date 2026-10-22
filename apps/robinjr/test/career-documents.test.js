// Automated checks for career documents test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeDocumentName, selectMissingRequiredDocs, planUnassignedCareerDocuments } = require('../lib/career-documents');

test('normaliza mayúsculas, espacios y acentos al comparar documentos', () => {
  assert.equal(normalizeDocumentName('  Certificación   Académica  '), 'certificacion academica');
});

test('no vuelve a pedir un documento que el alumno ya tiene solicitado', () => {
  const required = [
    { name: 'Pasaporte', required: true },
    { name: 'Carta de motivación', required: true },
  ];
  const existing = [{ name: '  PASAPORTE ' }];

  assert.deepEqual(selectMissingRequiredDocs(required, existing), [required[1]]);
});

test('elimina duplicados dentro de la misma plantilla de carrera', () => {
  const first = { name: 'Diploma' };
  const duplicate = { name: 'DÍPLOMA' };

  assert.deepEqual(selectMissingRequiredDocs([first, duplicate], []), [first]);
});

test('conserva un documento ya subido o validado en vez de crear otro', () => {
  const existing = [{ name: 'Transcript of Records', status: 'validated' }];
  assert.deepEqual(selectMissingRequiredDocs([{ name: 'transcript of records' }], existing), []);
});

test('al quitar una carrera elimina solo solicitudes intactas que ya no hacen falta', () => {
  const plan = planUnassignedCareerDocuments([
    { id: 'pending', name: 'CV', career_template_id: 'removed', source: 'career_template', status: 'required' },
    { id: 'uploaded', name: 'DNI', career_template_id: 'removed', source: 'career_template', status: 'pending_review', uploaded_at: '2026-09-01' },
    { id: 'manual', name: 'Carta extra', career_template_id: 'removed', source: 'manual', status: 'required' },
  ], 'removed', []);

  assert.deepEqual(plan.deleteIds, ['pending']);
  assert.deepEqual(plan.preservedIds, ['uploaded', 'manual']);
});

test('reasigna un requisito compartido a otra carrera en vez de eliminarlo', () => {
  const plan = planUnassignedCareerDocuments([
    { id: 'transcript', name: 'Certificado académico', career_template_id: 'removed', source: 'career_template', status: 'required' },
  ], 'removed', [{ id: 'remaining', required_docs: [{ name: 'certificado academico' }] }]);

  assert.deepEqual(plan.deleteIds, []);
  assert.deepEqual(plan.reassignments, [{ id: 'transcript', careerTemplateId: 'remaining' }]);
});

test('elimina el duplicado de la carrera retirada si otra solicitud ya cubre el requisito', () => {
  const plan = planUnassignedCareerDocuments([
    { id: 'old', name: 'Pasaporte', career_template_id: 'removed', source: 'career_template', status: 'required' },
    { id: 'kept', name: 'PASAPORTE', career_template_id: 'remaining', source: 'career_template', status: 'required' },
  ], 'removed', [{ id: 'remaining', required_docs: [{ name: 'Pasaporte' }] }]);

  assert.deepEqual(plan.deleteIds, ['old']);
  assert.deepEqual(plan.reassignments, []);
});

test('ignora eventos al buscar documentos de una carrera restante', () => {
  const plan = planUnassignedCareerDocuments([
    { id: 'document', name: 'Entrevista', career_template_id: 'removed', source: 'career_template', status: 'required' },
  ], 'removed', [{ id: 'remaining', required_docs: [{ type: 'event', name: 'Entrevista' }] }]);

  assert.deepEqual(plan.deleteIds, ['document']);
  assert.deepEqual(plan.reassignments, []);
});
