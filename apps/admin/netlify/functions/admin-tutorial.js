const { getSupabase }=require('../../lib/supabase');
const { readSessionFromEvent }=require('../../lib/auth');
const { findAdminForSession }=require('../../lib/admin-auth');
const { tutorialState }=require('../../../../packages/admin-tutorial/state.cjs');
const { json,methodNotAllowed,parseJsonBody,serverError,verifyOrigin }=require('../../lib/http');

exports.handler=async event=>{
  if(!['GET','POST'].includes(event.httpMethod))return methodNotAllowed(['GET','POST']);
  if(event.httpMethod==='POST'&&!verifyOrigin(event))return json({error:'bad_origin'},{statusCode:403});
  try {
    const db=getSupabase();
    const actor=await findAdminForSession(db,readSessionFromEvent(event),'id,email,role,visible_tabs');
    if(!actor)return json({error:'forbidden'},{statusCode:403});
    const body=event.httpMethod==='POST'?parseJsonBody(event)||{}:event.queryStringParameters||{};
    return json(await tutorialState(db,actor,body,event.httpMethod==='POST'));
  }catch(error){return error.statusCode?json({error:error.message},{statusCode:error.statusCode}):serverError(error,'admin.tutorial');}
};
