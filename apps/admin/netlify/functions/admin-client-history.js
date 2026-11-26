const { getSupabase }=require('../../lib/supabase');
const { readSessionFromEvent }=require('../../lib/auth');
const { findAdminForSession }=require('../../lib/admin-auth');
const { checked,sourceDatabase,canManageClient }=require('../../../../packages/admin-collaboration/access.cjs');
const { uuid }=require('../../lib/validation');
const { json,methodNotAllowed,serverError }=require('../../lib/http');

exports.handler=async event=>{
  if(event.httpMethod!=='GET')return methodNotAllowed(['GET']);
  try{
    const actor=await findAdminForSession(getSupabase(),readSessionFromEvent(event),'id,email,role,visible_tabs');
    if(!actor)return json({error:'forbidden'},{statusCode:403});
    const {portal,user_id}=event.queryStringParameters||{};
    if(!['portal','robinjr'].includes(portal)||!uuid(user_id))return json({error:'invalid_client'},{statusCode:400});
    const source=sourceDatabase(portal);
    if(!await canManageClient(source,actor,user_id,portal))return json({error:'client_not_assigned'},{statusCode:403});
    const client=await checked(source.from('users').select('historial').eq('id',user_id).maybeSingle());
    const meetings=await checked(source.from('meeting_transcripts').select('id,title,meeting_at,summary').eq('user_id',user_id).eq('status','completed').order('meeting_at',{ascending:false}))||[];
    return json({meetings,historial:client?.historial||''});
  }catch(error){return serverError(error,'admin.client_history');}
};
