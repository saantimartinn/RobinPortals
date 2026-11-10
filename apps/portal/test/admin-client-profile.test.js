const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProfilePatch, editCommercialNotes, canEditClient } = require('../lib/admin-client-profile');

test('permite editar solo la cartera del asesor y excluye cuentas administrativas', () => {
 const actor={role:'admin',email:'asesor@example.com',visible_tabs:['platform.student_portal']};
 assert.equal(canEditClient(actor,{role:'client',assigned_to:actor.email}),true);
 assert.equal(canEditClient(actor,{role:'client',assigned_to:'otro@example.com'}),false);
 assert.equal(canEditClient(actor,{role:'admin',assigned_to:actor.email}),false);
 assert.equal(canEditClient({role:'client',email:actor.email},{role:'client',assigned_to:actor.email}),false);
});

test('valida datos personales y académicos sin permitir cambios de permisos o pagos', () => {
 const patch=buildProfilePatch({nombre:' Ana ',email:'ANA@example.com',username:'ana',fecha_nacimiento:'2007-05-09',intereses:['business'],academic_system:'ib',academic_subjects:[{name:'Math',level:'hl'}]});
 assert.equal(patch.nombre,'Ana');assert.equal(patch.email,'ana@example.com');assert.equal(patch.academic_subjects[0].level,'hl');
 assert.throws(()=>buildProfilePatch({role:'admin'}),/invalid_fields/);
 assert.throws(()=>buildProfilePatch({pago_completed:true}),/invalid_fields/);
 assert.throws(()=>buildProfilePatch({email:'invalid'}),/invalid_email/);
 assert.throws(()=>buildProfilePatch({fecha_nacimiento:'2026-02-31'}),/invalid_birth_date/);
 assert.throws(()=>buildProfilePatch({academic_system:'ib',academic_subjects:[{name:'Math',level:''}]}),/invalid_academic_profile/);
});

test('guarda cuestionario y señales sin perder el orden de las asignaturas', () => {
 const questionnaire={version:1,blocks:[{title:'General',items:[{q:'Asignaturas',a:['1. Arte','2. Historia']}]}],signals:{asignaturas_ordenadas:[{name:'Arte',rank:1,preference:'like'},{name:'Historia',rank:2,preference:null}]}};
 const patch=buildProfilePatch({questionnaire});assert.deepEqual(patch.questionnaire,questionnaire);assert.equal(patch.career_suggestions,null);
});

test('edita una nota sin perder su autor ni la información comercial original', () => {
 const original=[{id:'event:abc',kind:'team_note',body:'Anterior',authorName:'Comercial',createdAt:'2026-01-01'}];
 const edited=editCommercialNotes(original,{operation:'edit',note_id:'event:abc',text:' Corregida '},'Asesor','2026-11-10T12:00:00.000Z');
 assert.equal(edited[0].body,'Corregida');assert.equal(edited[0].authorName,'Comercial');assert.equal(edited[0].kind,'team_note');assert.equal(original[0].body,'Anterior');
 assert.throws(()=>editCommercialNotes(original,{operation:'edit',note_id:'missing',text:'Texto'},'Asesor','now'),/note_not_found/);
 assert.throws(()=>editCommercialNotes(original,{operation:'add',text:' '},'Asesor','now'),/invalid_note/);
});
