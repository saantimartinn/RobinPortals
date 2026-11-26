const { runInApp } = require('../../site/app-env.cjs');
const { applicationDatabase, sourceDatabase, checked } = require('./access.cjs');
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

// The durable outbox is shared by the portal and legacy Admin workers. Unique
// keys and provider idempotency avoid duplicate emails when both discover a call.
async function deliverMeetingNotes(portal, deps = {}) {
  if (!['portal','robinjr'].includes(portal)) return { sent: 0 };
  const db=deps.db||applicationDatabase(), source=deps.source||sourceDatabase(portal);
  const send=deps.sendEmail||(mail=>runInApp('admin',()=>require('../../apps/admin/lib/email').sendEmail(mail)));
  const since=new Date((deps.now||Date.now())-7*86400000).toISOString();
  const meetings=await checked(source.from('meeting_transcripts').select('id,user_id,advisor_email,title,meeting_at,summary,status').eq('status','completed').gte('completed_at',since).order('completed_at').limit(500))||[];
  const grants=await checked(db.from('admin_client_shares').select('pro_admin_id,admin_id,client_id,owner_email,created_at').eq('portal',portal))||[];
  for(const meeting of meetings){
    for(const grant of grants.filter(row=>row.client_id===meeting.user_id&&row.owner_email===String(meeting.advisor_email).toLowerCase()&&Date.parse(row.created_at)<=Date.parse(meeting.meeting_at))){
      await checked(db.from('admin_meeting_mail').upsert({portal,meeting_id:meeting.id,client_id:meeting.user_id,admin_id:grant.admin_id,pro_admin_id:grant.pro_admin_id},{onConflict:'portal,meeting_id,admin_id',ignoreDuplicates:true}));
    }
  }
  const pending=await checked(db.rpc('claim_admin_meeting_mail',{p_portal:portal,p_limit:20}))||[];
  let sent=0;
  for(const item of pending){
    // Recheck the link, the individual grant and the actual primary advisor at
    // send time, including retries. Previously queued emails are not permission.
    const grant=await checked(db.from('admin_client_shares').select('owner_email').eq('pro_admin_id',item.pro_admin_id).eq('admin_id',item.admin_id).eq('portal',portal).eq('client_id',item.client_id).maybeSingle());
    const client=await checked(source.from('users').select('id,nombre,apellidos,assigned_to').eq('id',item.client_id).maybeSingle());
    const recipient=await checked(db.from('users').select('email,role').eq('id',item.admin_id).maybeSingle());
    if(!grant||!client||client.assigned_to?.toLowerCase()!==grant.owner_email||!recipient||!['admin','supervisor'].includes(recipient.role)){
      await checked(db.from('admin_meeting_mail').update({status:'revoked',lease_until:null}).eq('id',item.id));continue;
    }
    const meeting=await checked(source.from('meeting_transcripts').select('title,meeting_at,summary,status').eq('id',item.meeting_id).maybeSingle());
    if(meeting?.status!=='completed'||!meeting.summary)continue;
    const name=[client.nombre,client.apellidos].filter(Boolean).join(' ')||'Cliente';
    const text=`Notas de llamada · ${name}\n${meeting.title}\n${meeting.meeting_at}\nResponsable: ${grant.owner_email}\n\n${meeting.summary}`;
    const result=await send({to:recipient.email,reply_to:grant.owner_email,subject:`Notas de llamada · ${name}`,text,html:`<h2>Notas de llamada · ${escapeHtml(name)}</h2><p>${escapeHtml(meeting.title)}<br>${escapeHtml(meeting.meeting_at)}<br>Responsable: ${escapeHtml(grant.owner_email)}</p><div style="white-space:pre-wrap">${escapeHtml(meeting.summary)}</div>`,tag:'shared_client_meeting_notes',idempotencyKey:`shared-meeting-${portal}-${item.meeting_id}-${item.admin_id}`});
    if(result.sent){await checked(db.from('admin_meeting_mail').update({status:'sent',sent_at:new Date().toISOString(),lease_until:null}).eq('id',item.id));sent++;}
  }
  return {sent};
}
module.exports={deliverMeetingNotes};
