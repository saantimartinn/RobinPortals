const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');

test('la migración crea cuentas y tutoriales atómicamente, revoca por cascada y cierra acceso público',async()=>{
  const {PGlite}=await import('@electric-sql/pglite');
  const db=new PGlite();
  try{
    await db.exec("create role anon;create role authenticated;create role service_role;create table users(id uuid primary key default gen_random_uuid(),nombre text,email text unique,username text unique,role text,password_hash text,requires_onboarding boolean,visible_tabs text[] default '{}');");
    await db.exec(readFileSync(resolve(__dirname,'../supabase/migrations/202611250001_admin_collaboration.sql'),'utf8'));
    const pro='11111111-1111-4111-8111-111111111111';
    await db.query("insert into users(id,email,role) values($1,'manuel@project-robin.com','admin')",[pro]);
    const {rows}=await db.query("select create_admin_profile($1,'Ana','ana@example.test','ana','demo-hash',true) as id",[pro]);
    const admin=rows[0].id;
    assert.equal((await db.query('select count(*)::int as n from admin_links')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int as n from admin_tutorials where admin_id=$1',[admin])).rows[0].n,4);
    await db.query("insert into admin_client_shares(pro_admin_id,admin_id,portal,client_id,owner_email) values($1,$2,'portal',gen_random_uuid(),'manuel@project-robin.com')",[pro,admin]);
    await db.query('delete from admin_links where pro_admin_id=$1 and admin_id=$2',[pro,admin]);
    assert.equal((await db.query('select count(*)::int as n from admin_client_shares')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int as n from admin_tutorials')).rows[0].n,4);
    assert.equal((await db.query("select has_table_privilege('anon','admin_client_shares','SELECT') as allowed")).rows[0].allowed,false);
    assert.equal((await db.query("select has_function_privilege('authenticated','create_admin_profile(uuid,text,text,text,text,boolean)','EXECUTE') as allowed")).rows[0].allowed,false);
    await assert.rejects(db.query("select create_admin_profile($1,'Ana 2','ana@example.test','ana-duplicate','demo-hash',true)",[pro]));
    assert.equal((await db.query('select count(*)::int as n from users')).rows[0].n,2);
  }finally{await db.close();}
});
