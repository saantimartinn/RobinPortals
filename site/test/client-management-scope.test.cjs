const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createRequire}=require('node:module');
const vm=require('node:vm');
const {memoryDatabase}=require('../../dev/fixtures/collaboration-db.cjs');
const access=require('../../packages/admin-collaboration/access.cjs');
const actor={id:'11111111-1111-4111-8111-111111111111',email:'ana@example.test',role:'admin'};
const pro={id:'22222222-2222-4222-8222-222222222222',email:'manuel@project-robin.com',role:'admin'};
const client={id:'33333333-3333-4333-8333-333333333333',role:'client',tipo:'general',assigned_to:pro.email,application_phase:3};
const documentId='44444444-4444-4444-8444-444444444444';
function load(app,name,db){
  const filename=resolve(__dirname,`../../apps/${app}/netlify/functions/${name}.js`),localRequire=createRequire(filename),module={exports:{}};
  const mocks={
    '../../lib/supabase':{getSupabase:()=>db},
    '../../lib/auth':{readSessionFromEvent:()=>({uid:actor.id})},
    '../../lib/session-user':{getSessionUser:async()=>({data:actor,error:null})},
    '../../lib/client-access':{canManageClient:(source,user,id)=>access.canManageClient(source,user,id,app==='admin'?'portal':app,{applicationDb:db})},
    '../../lib/http':{...localRequire('../../lib/http'),verifyOrigin:()=>true},
  };
  vm.runInNewContext(readFileSync(filename,'utf8'),{module,exports:module.exports,console,Date,process,Buffer,require:id=>mocks[id]||localRequire(id)},{filename});
  return body=>module.exports.handler({httpMethod:'POST',headers:{},body:JSON.stringify(body)});
}
for(const app of ['portal','robinjr','admin']){
  test(`${app}: consultar globalmente no permite cambiar fases, cuotas ni documentos de otro asesor`,async()=>{
    const db=memoryDatabase({users:[actor,pro,client],documents:[{id:documentId,user_id:client.id,status:'pending_review'}],admin_client_shares:[]});
    for(const [name,body]of [['admin-phase-set',{user_id:client.id,phase:4}],['admin-payments-unlock',{user_id:client.id,installment:2}],['admin-documents-review',{id:documentId,decision:'validate'}]]){
      const response=await load(app,name,db)(body);
      assert.equal(response.statusCode,403,name);
    }
    assert.equal(db.tables.users.find(row=>row.id===client.id).application_phase,3);
    assert.equal(db.tables.documents[0].status,'pending_review');
  });
  test(`${app}: una asignación compartida permite avanzar y su retirada bloquea la siguiente escritura`,async()=>{
    const portal=app==='admin'?'portal':app;
    const db=memoryDatabase({users:[actor,pro,client],admin_client_shares:[{admin_id:actor.id,pro_admin_id:pro.id,portal,client_id:client.id,owner_email:pro.email}]});
    const send=load(app,'admin-phase-set',db);
    assert.equal((await send({user_id:client.id,phase:4})).statusCode,200);
    assert.equal(db.tables.users.find(row=>row.id===client.id).assigned_to,pro.email);
    db.tables.admin_client_shares=[];
    assert.equal((await send({user_id:client.id,phase:5})).statusCode,403);
    assert.equal(db.tables.users.find(row=>row.id===client.id).application_phase,4);
  });
}
