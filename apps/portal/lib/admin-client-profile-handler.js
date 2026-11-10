// Administrative edits to a student's profile and the private commercial notes copy.
const { getSupabase }=require('./supabase');
const { readSessionFromEvent }=require('./auth');
const { json,methodNotAllowed,parseJsonBody,serverError,verifyOrigin }=require('./http');
const { uuid }=require('./validation');
const { buildProfilePatch,canEditClient,editCommercialNotes }=require('./admin-client-profile');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return methodNotAllowed(['POST']);
 if(!verifyOrigin(event))return json({error:'bad_origin'},{statusCode:403});
 const session=readSessionFromEvent(event);if(!session)return json({error:'unauthorized'},{statusCode:401});
 const body=parseJsonBody(event);const userId=uuid(body?.user_id);if(!userId)return json({error:'invalid_user_id'},{statusCode:400});
 try {
  const sb=getSupabase();
  const {data:actor,error:actorError}=await sb.from('users').select('id,email,username,nombre,apellidos,role,visible_tabs').eq('id',session.uid).maybeSingle();
  if(actorError)throw actorError;
  const {data:client,error:clientError}=await sb.from('users').select('id,role,email,username,assigned_to,lead_id,updated_at').eq('id',userId).maybeSingle();
  if(clientError)throw clientError;
  if(!actor||!client||!canEditClient(actor,client))return json({error:'forbidden'},{statusCode:403});
  if(body.action==='notes') {
   const {data:stored,error:readError}=await sb.from('crm_client_notes').select('notes,synced_at').eq('user_id',userId).maybeSingle();
   if(readError)throw readError;
   if((stored?.synced_at || null)!==(body.expected_version || null))return json({error:'edit_conflict'},{statusCode:409});
   const now=new Date(Math.max(Date.now(),Date.parse(stored?.synced_at || '')+1 || 0)).toISOString();
   const notes=editCommercialNotes(stored?.notes || [],body.data || {},[actor.nombre,actor.apellidos].filter(Boolean).join(' ')||actor.email||actor.username,now);
   const row={notes,synced_at:now};
   const query=stored?sb.from('crm_client_notes').update(row).eq('user_id',userId).eq('synced_at',stored.synced_at):sb.from('crm_client_notes').insert({...row,user_id:userId,lead_id:String(client.lead_id||client.id)});
   const {data:changed,error}=await query.select('notes,synced_at').maybeSingle();
   if(error?.code==='23505'||!error&&!changed)return json({error:'edit_conflict'},{statusCode:409});
   if(error)throw error;
   return json({ok:true,crm_notes:changed.notes,crm_notes_updated_at:changed.synced_at});
  }
  if(body.action!=='profile')return json({error:'invalid_action'},{statusCode:400});
  if((client.updated_at||null)!==(body.expected_updated_at||null))return json({error:'edit_conflict'},{statusCode:409});
  const patch={...buildProfilePatch(body.data),updated_at:new Date().toISOString()};
  let query=sb.from('users').update(patch).eq('id',userId);
  query=client.updated_at?query.eq('updated_at',client.updated_at):query.is('updated_at',null);
  const {data:changed,error}=await query.select('id,updated_at').maybeSingle();
  if(error?.code==='23505')return json({error:'identity_in_use'},{statusCode:409});
  if(error)throw error;
  if(!changed)return json({error:'edit_conflict'},{statusCode:409});
  return json({ok:true,updated_at:changed.updated_at});
 } catch(error) {
  if(error.statusCode)return json({error:error.code||error.message},{statusCode:error.statusCode});
  return serverError(error,'admin.client_profile');
 }
};
