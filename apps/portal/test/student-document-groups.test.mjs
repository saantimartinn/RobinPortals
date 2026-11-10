import test from 'node:test';
import assert from 'node:assert/strict';
import { groupStudentDocumentsByCareer } from '../portal-source/src/application/documents/document-utils.js';

const careers = [{ id: 'a', name: 'Psicología', university: 'Universidad A' }, { id: 'b', name: 'Business', university: 'Universidad B' }];
test('los pendientes de revisión van al final y los aprobados detrás de todos ellos', () => {
  const documents = [
    { id: 'approved', career_template_id: 'a', status: 'validated' },
    { id: 'pending', career_template_id: 'a', status: 'pending_review' },
    { id: 'missing', career_template_id: 'a', status: 'required' },
    { id: 'unknown', career_template_id: 'a' },
    { id: 'correction', career_template_id: 'a', status: 'rejected' },
  ];
  const snapshot = structuredClone(documents);
  const result = groupStudentDocumentsByCareer(documents, careers);
  assert.deepEqual(result.groups[0].documents.map(entry=>entry.document.id), ['missing', 'unknown', 'correction', 'pending', 'approved']);
  assert.deepEqual(documents, snapshot);
});
test('Robin Jr muestra los documentos compartidos dentro de cada carrera sin crear otras solicitudes', () => {
  const documents = [{ id: 'passport', name: 'Pasaporte', status: 'required' }, { id: 'cv', name: 'CV', status: 'validated' }];
  const result = groupStudentDocumentsByCareer(documents, careers, { shareUnlinkedDocuments: true });
  assert.deepEqual(result.groups.map(group=>group.documents.map(entry=>entry.document.id)), [['passport', 'cv'], ['passport', 'cv']]);
  assert.equal(result.groups[0].documents[0].document, documents[0]);
  assert.equal(result.groups[1].documents[0].document, documents[0]);
  assert.deepEqual(result.ungrouped, []);
});
test('si no hay carreras se conservan todos los documentos, en el mismo orden de estados', () => {
  const result = groupStudentDocumentsByCareer([{ id: 'done', status: 'validated' }, { id: 'review', status: 'pending_review' }, { id: 'todo', status: 'required' }], [], { shareUnlinkedDocuments: true });
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.ungrouped.map(entry=>entry.document.id), ['todo','review','done']);
});
test('al subir o validar un documento se actualiza su posición dentro de su carrera', () => {
  const docs = [{id:'first',career_template_id:'a',status:'required'},{id:'second',career_template_id:'a',status:'required'},{id:'last',career_template_id:'a',status:'pending_review'}];
  const uploaded = docs.map(d=>d.id==='first'?{...d,status:'pending_review'}:d);
  assert.deepEqual(groupStudentDocumentsByCareer(uploaded,careers).groups[0].documents.map(entry=>entry.document.id), ['second','first','last']);
  const validated=uploaded.map(d=>d.id==='first'?{...d,status:'validated'}:d);
  assert.deepEqual(groupStudentDocumentsByCareer(validated,careers).groups[0].documents.map(entry=>entry.document.id), ['second','last','first']);
});

for (const app of ['portal', 'robinjr']) {
  test(`${app}: la agrupación compartida conserva el orden de los estados`, async () => {
    const {groupStudentDocumentsByCareer: group} = await import(`../../${app}/portal-source/src/application/documents/document-utils.js`);
    const result=group([{id:'approved',status:'validated'},{id:'pending',status:'pending_review'},{id:'missing',status:'required'}],careers,{shareUnlinkedDocuments:true});
    assert.deepEqual(result.groups[0].documents.map(entry=>entry.document.id),['missing','pending','approved']);
  });
}

test('cada carrera muestra la fecha de su requisito aunque comparta el mismo archivo', () => {
  const assigned = [
    {id:'a',name:'Carrera A',required_docs:[{name:'CV',deadline:'2027-01-15'}]},
    {id:'b',name:'Carrera B',required_docs:[{name:'CV',deadline:'2027-02-20'}]},
  ];
  const document={id:'cv',name:'CV',status:'required'};
  const result=groupStudentDocumentsByCareer([document],assigned);
  assert.equal(result.groups[0].documents[0].deadline,'2027-01-15');
  assert.equal(result.groups[1].documents[0].deadline,'2027-02-20');
  assert.equal(result.groups[0].documents[0].document,document);
});
test('conserva la fecha propia del expediente cuando no hay fecha de carrera', () => {
  const result=groupStudentDocumentsByCareer([{id:'passport',name:'Pasaporte',deadline:'2027-03-01'}],careers,{shareUnlinkedDocuments:true});
  assert.equal(result.groups[0].documents[0].deadline,'2027-03-01');
  const other=groupStudentDocumentsByCareer([{id:'other',deadline:'2027-04-01'}],[]);
  assert.equal(other.ungrouped[0].deadline,'2027-04-01');
});
test('el marcador cuenta documentos aprobados y las fechas ausentes o inválidas se muestran sin inventar plazos', async () => {
  const {studentDocumentProgress,formatDocumentDeadline}=await import('../../../packages/student-documents/document-groups.mjs');
  const entries=[{document:{status:'validated'}},{document:{status:'pending_review'}},{document:{status:'required'}},{document:{status:'rejected'}}];
  assert.deepEqual(studentDocumentProgress(entries),{approved:1,total:4});
  assert.deepEqual(studentDocumentProgress([]),{approved:0,total:0});
  assert.equal(formatDocumentDeadline('2027-01-15'),'15/01/2027');
  assert.equal(formatDocumentDeadline(null),null);
  assert.equal(formatDocumentDeadline('2027-02-31'),null);
});
