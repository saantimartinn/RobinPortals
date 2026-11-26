const test=require('node:test');
const assert=require('node:assert/strict');
const {memoryDatabase}=require('../../../dev/fixtures/collaboration-db.cjs');
const {canManageClient,sharedGrants,hasClientManagement}=require('../../../packages/admin-collaboration/access.cjs');
const {changeCollaboration,listCollaboration}=require('../lib/admin-collaboration');
const {tutorialState}=require('../../../packages/admin-tutorial/state.cjs');
const {deliverMeetingNotes}=require('../../../packages/admin-collaboration/meeting-mail.cjs');
const pro={id:'11111111-1111-4111-8111-111111111111',email:'manuel@project-robin.com',role:'admin'};
const other={id:'22222222-2222-4222-8222-222222222222',email:'noel@project-robin.com',role:'admin'};
const admin={id:'33333333-3333-4333-8333-333333333333',email:'ana@example.test',role:'admin',visible_tabs:['home.settings','home.students','platform.student_portal']};
const own={id:'44444444-4444-4444-8444-444444444444',role:'client',assigned_to:admin.email};
const client={id:'55555555-5555-4555-8555-555555555555',role:'client',nombre:'Lucía',assigned_to:pro.email};
function setup(){const db=memoryDatabase({users:[pro,other,admin,own,client]});return {db,getSource:()=>db};}
async function link(db,actor=pro){return changeCollaboration(db,actor,{action:'link',admin_id:admin.id});}
async function share(db,actor=pro){return changeCollaboration(db,actor,{action:'share',admin_id:admin.id,portal:'portal',client_id:client.id},()=>db);}

test('compartir conserva el responsable y permite simultáneamente clientes propios',async()=>{
  const {db}=setup();await link(db);await share(db);
  assert.equal(db.tables.users.find(row=>row.id===client.id).assigned_to,pro.email);
  assert.equal(await canManageClient(db,admin,client.id,'portal',{applicationDb:db}),true);
  assert.equal(await canManageClient(db,admin,own.id,'portal',{applicationDb:db}),true);
  assert.equal((await listCollaboration(db,pro,{admin_id:admin.id,portal:'portal'},()=>db)).clients.length,1);
});
test('varios PRO pueden vincularse y cada uno solo modifica su propia relación',async()=>{
  const {db}=setup();await link(db);await link(db,other);await share(db);
  await changeCollaboration(db,other,{action:'unlink',admin_id:admin.id,pro_admin_id:pro.id});
  assert.deepEqual(db.tables.admin_links.map(row=>row.pro_admin_id),[pro.id]);
  assert.equal(db.tables.admin_client_shares.length,1);
  await assert.rejects(share(db,other),/admin_not_linked/);
});
test('no puede compartir un cliente de otro PRO ni un usuario administrador',async()=>{
  const {db}=setup();await link(db,other);
  await assert.rejects(share(db,other),/client_not_owned/);
  await assert.rejects(changeCollaboration(db,pro,{action:'link',admin_id:other.id}),/admin_not_found/);
  await assert.rejects(changeCollaboration(db,admin,{action:'link',admin_id:admin.id}),/pro_admin_required/);
});
test('retirar el vínculo revoca gestión y conserva clientes propios y consulta global',async()=>{
  const {db}=setup();await link(db);await share(db);
  await changeCollaboration(db,pro,{action:'unlink',admin_id:admin.id});
  assert.equal(await canManageClient(db,admin,client.id,'portal',{applicationDb:db}),false);
  assert.equal(await canManageClient(db,admin,own.id,'portal',{applicationDb:db}),true);
  assert.equal(db.tables.users.filter(row=>row.role==='client').length,2);
});
test('una asignación compartida no sobrevive al cambio de responsable ni se propaga entre portales',async()=>{
  const {db}=setup();await link(db);await share(db);
  assert.equal((await sharedGrants(admin,'robinjr',db)).length,0);
  db.tables.users.find(row=>row.id===client.id).assigned_to=other.email;
  assert.equal(await canManageClient(db,admin,client.id,'portal',{applicationDb:db}),false);
  assert.equal(hasClientManagement(admin,client,[]),false);
});
test('las cuentas existentes no reciben tutorial al vincularse y solo su PRO puede activarlo',async()=>{
  const {db}=setup();await link(db);
  assert.equal((await tutorialState(db,admin,{portal:'admin'})).required,false);
  await assert.rejects(changeCollaboration(db,other,{action:'tutorial',admin_id:admin.id}),/admin_not_linked/);
  await changeCollaboration(db,pro,{action:'tutorial',admin_id:admin.id});
  const state=await tutorialState(db,admin,{portal:'admin'});
  assert.equal(state.required,true);
  assert.equal(state.steps.some(step=>step.id==='analytics.sales'),false);
  assert.equal(state.steps.some(step=>step.id==='home.students'),true);
});
test('un tutorial no se puede finalizar anticipadamente; reanuda, completa y se reactiva por revisión',async()=>{
  const {db}=setup();await link(db);await changeCollaboration(db,pro,{action:'tutorial',admin_id:admin.id});
  let state=await tutorialState(db,admin,{portal:'admin'});
  await assert.rejects(tutorialState(db,admin,{portal:'admin',step:0,revision:state.revision,complete:true},true),/tutorial_incomplete/);
  state=await tutorialState(db,admin,{portal:'admin',step:0,revision:state.revision},true);
  assert.equal((await tutorialState(db,admin,{portal:'admin'})).step,1);
  await assert.rejects(tutorialState(db,admin,{portal:'admin',step:0,revision:state.revision},true),/tutorial_changed/);
  while(state.step<state.steps.length-1)state=await tutorialState(db,admin,{portal:'admin',step:state.step,revision:state.revision},true);
  assert.equal((await tutorialState(db,admin,{portal:'admin',step:state.step,revision:state.revision,complete:true},true)).required,false);
  await changeCollaboration(db,pro,{action:'tutorial',admin_id:admin.id});
  assert.equal((await tutorialState(db,admin,{portal:'admin'})).revision,2);
});
test('las notas se envían una vez por destinatario y nunca incluyen la transcripción bruta',async()=>{
  const {db}=setup();await link(db);await share(db);
  db.tables.admin_client_shares[0].created_at=new Date(Date.now()-86400000).toISOString();
  db.tables.meeting_transcripts=[{id:'66666666-6666-4666-8666-666666666666',user_id:client.id,advisor_email:pro.email,title:'Seguimiento',meeting_at:new Date().toISOString(),completed_at:new Date().toISOString(),summary:'Notas de ejemplo',raw_text:'Texto completo privado',status:'completed'}];
  const sent=[];const deps={db,source:db,sendEmail:async message=>{sent.push(message);return {sent:true};}};
  await deliverMeetingNotes('portal',deps);await deliverMeetingNotes('portal',deps);
  assert.equal(sent.length,1);assert.equal(sent[0].to,admin.email);assert.match(sent[0].text,/Notas de ejemplo/);assert.doesNotMatch(sent[0].text,/Texto completo privado/);
});
test('la cola reintenta el correo y comprueba revocaciones antes de enviarlo',async()=>{
  const {db}=setup();await link(db);await share(db);
  db.tables.admin_client_shares[0].created_at=new Date(Date.now()-86400000).toISOString();
  db.tables.meeting_transcripts=[{id:'66666666-6666-4666-8666-666666666666',user_id:client.id,advisor_email:pro.email,meeting_at:new Date().toISOString(),completed_at:new Date().toISOString(),summary:'Notas',status:'completed'}];
  await deliverMeetingNotes('portal',{db,source:db,sendEmail:async()=>({sent:false})});
  assert.equal(db.tables.admin_meeting_mail[0].status,'pending');
  db.tables.admin_meeting_mail[0].lease_until=null;
  await changeCollaboration(db,pro,{action:'unlink',admin_id:admin.id});
  let sent=0;await deliverMeetingNotes('portal',{db,source:db,sendEmail:async()=>{sent++;return {sent:true};}});
  assert.equal(sent,0);assert.equal(db.tables.admin_meeting_mail[0].status,'revoked');
});
