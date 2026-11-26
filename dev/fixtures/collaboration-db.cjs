// In-memory Supabase-shaped adapter for the isolated preview and unit tests.
// It has no network transport, credentials, or persistence outside this process.
const {randomUUID}=require('node:crypto');
function memoryDatabase(seed={}){
  const tables=structuredClone(seed);
  const db={tables,from(table){
    tables[table] ||= [];
    const filters=[];let mode='read',values,options={},single=false,maximum=Infinity,sort;
    const q={
      select(){return q;},eq(key,value){filters.push(row=>row[key]===value);return q;},
      in(key,list){filters.push(row=>list.includes(row[key]));return q;},
      is(key,value){filters.push(row=>value===null?row[key]==null:row[key]===value);return q;},
      gte(key,value){filters.push(row=>row[key]>=value);return q;},
      not(key,operator,value){filters.push(row=>value===null?row[key]!=null:row[key]!==value);return q;},
      order(key,settings={}){sort=[key,settings.ascending===false?-1:1];return q;},
      limit(n){maximum=n;return q;},
      insert(value){mode='insert';values=value;return q;},
      upsert(value,settings={}){mode='upsert';values=value;options=settings;return q;},
      update(value){mode='update';values=value;return q;},
      delete(){mode='delete';return q;},
      maybeSingle(){single=true;return q;},single(){single=true;return q;},
      then(resolve,reject){return Promise.resolve().then(()=>{
        let rows=tables[table].filter(row=>filters.every(filter=>filter(row)));
        if(mode==='insert'||mode==='upsert'){
          const changed=[];
          for(const value of Array.isArray(values)?values:[values]){
            const keys=(options.onConflict||'id').split(',');
            const existing=mode==='upsert'?tables[table].find(row=>keys.every(key=>row[key]===value[key])):null;
            if(existing){if(!options.ignoreDuplicates){Object.assign(existing,structuredClone(value));changed.push(existing);}}
            else{const row={id:randomUUID(),created_at:new Date().toISOString(),...structuredClone(value)};tables[table].push(row);changed.push(row);}
          }
          rows=changed;
        }else if(mode==='update')rows.forEach(row=>Object.assign(row,structuredClone(values)));
        else if(mode==='delete'){
          tables[table]=tables[table].filter(row=>!rows.includes(row));
          if(table==='admin_links')tables.admin_client_shares=(tables.admin_client_shares||[]).filter(share=>!rows.some(link=>link.admin_id===share.admin_id&&link.pro_admin_id===share.pro_admin_id));
        }
        if(sort)rows.sort((a,b)=>String(a[sort[0]]||'').localeCompare(String(b[sort[0]]||''))*sort[1]);
        rows=rows.slice(0,maximum);
        return {data:structuredClone(single?rows[0]||null:rows),error:null};
      }).then(resolve,reject);},
    };return q;
  },async rpc(name,body){
    if(name==='require_admin_tutorial'){
      for(const portal of body.p_portals){
        const row=(tables.admin_tutorials||=[]).find(item=>item.admin_id===body.p_admin_id&&item.portal===portal);
        if(row){row.revision++;row.step=0;}
        else tables.admin_tutorials.push({admin_id:body.p_admin_id,portal,revision:1,completed_revision:0,step:0});
      }
      return {data:null,error:null};
    }
    if(name==='create_admin_profile'){
      const id=randomUUID();tables.users.push({id,nombre:body.p_name,email:body.p_email,username:body.p_username,role:'admin',requires_onboarding:false,visible_tabs:require('../../apps/admin/lib/admin-profiles').ADMIN_VISIBLE_TABS});
      if(body.p_attach){(tables.admin_links||=[]).push({pro_admin_id:body.p_actor,admin_id:id});await db.rpc('require_admin_tutorial',{p_admin_id:id,p_portals:['admin','portal','robinjr','community']});}
      return {data:id,error:null};
    }
    if(name==='claim_admin_meeting_mail'){
      const rows=(tables.admin_meeting_mail||[]).filter(row=>row.portal===body.p_portal&&(row.status||'pending')==='pending'&&(!row.lease_until||Date.parse(row.lease_until)<Date.now())).slice(0,body.p_limit);
      rows.forEach(row=>{row.status='pending';row.lease_until=new Date(Date.now()+120000).toISOString();row.attempts=(row.attempts||0)+1;});
      return {data:structuredClone(rows),error:null};
    }
    throw new Error('Unsupported preview RPC: '+name);
  }};
  return db;
}
module.exports={memoryDatabase};
