// Local preview only: no production credentials or external provider calls.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const {previewState}=require('./fixtures/collaboration-state.cjs');
const {changeCollaboration,listCollaboration}=require('../apps/admin/lib/admin-collaboration');
const {canManageClient,hasClientManagement,sharedGrants}=require('../packages/admin-collaboration/access.cjs');
const {tutorialState}=require('../packages/admin-tutorial/state.cjs');
const {deliverMeetingNotes}=require('../packages/admin-collaboration/meeting-mail.cjs');
const {claimSubscriber}=require('../apps/community/backend/lib/subscriber-advisor');
const {isProAdmin}=require('../apps/admin/lib/admin-profiles');
const root=fileURLToPath(new URL('..',import.meta.url));
const port=Number(process.env.ROBIN_COLLABORATION_PREVIEW_PORT||8898);
const roots={admin:resolve(root,'apps/admin/dist'),portal:resolve(root,'apps/portal/portal-source/dist'),robinjr:resolve(root,'apps/robinjr/portal-source/dist'),community:resolve(root,'apps/community/dist/therobinplan')};
let state=previewState();
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function html(res,content,status=200){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'none'"});res.end(content);}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>150000)throw new Error('preview_request_too_large');}return raw?JSON.parse(raw):{};}
const safe=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function actorFor(req){const id=req.headers.cookie?.match(/(?:^|;\s*)robin_collaboration_preview=([^;]+)/)?.[1];return state.db.tables.users.find(u=>u.id===id&&u.role==='admin')||state.db.tables.users[0];}
const publicActor=actor=>({...actor,is_application_admin:true,is_pro_admin:isProAdmin(actor),requires_onboarding:false});
function shell(content){return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview local · Colaboración Robin</title><style>body{background:#FEFBE5;color:#2d3a64;font:16px/1.6 system-ui,sans-serif;margin:0}main{max-width:1000px;margin:50px auto;padding:25px}h1{line-height:1.2}article{background:#fffdf5;border:1px solid #dfe1e7;border-radius:14px;padding:22px;margin:16px 0}nav{display:flex;gap:12px;flex-wrap:wrap}a,button{color:#2d3a64;background:#fff;border:1px solid #c5cbd7;border-radius:9px;padding:9px 14px;text-decoration:none;font:inherit;cursor:pointer}small{display:block;color:#687088}pre{white-space:pre-wrap}form{display:inline}</style><main>${content}</main></html>`;}
const chooser=()=>shell(`<h1>Administradores PRO y vinculados</h1><p>Preview local con datos ficticios. Los cambios viven en memoria. Los correos se guardan en una bandeja de ejemplo y las llamadas conservan su calendario principal.</p><article><h2>1. Gestionar como PRO</h2><nav><a href="/__preview/as/manuel?next=/admin/configuracion">Manuel · Configuración</a><a href="/__preview/as/noel?next=/admin/configuracion">Noel · Configuración</a></nav><p>Ana está vinculada a ambos. Cada PRO solo puede retirar su propio vínculo.</p></article><article><h2>2. Entrar como administrador vinculado</h2><nav>${state.db.tables.users.filter(u=>u.role==='admin'&&!isProAdmin(u)).map(u=>`<a href="/__preview/as/${encodeURIComponent(u.username)}?next=/portal/">${safe(u.nombre)} · Portal</a>`).join('')}<a href="/__preview/as/ana?next=/admin/alumnos-global">Ana · Vista global</a><a href="/__preview/as/ana?next=/robinjr/">Ana · RobinJr</a><a href="/__preview/as/ana?next=/therobinplan/">Ana · Community</a></nav><p>Ana ya existía: no tiene tutorial salvo que un PRO se lo active. Bruno representa una cuenta nueva vinculada: su tutorial es obligatorio. Ana conserva a Diego como cliente propio y comparte a Lucía con Manuel y a Sofía con Noel.</p></article><article><h2>3. Probar las notas de una llamada</h2><form method="post" action="/__preview/meeting"><button>Simular llamada de Manuel con Lucía</button></form> <a href="/__preview/outbox">Ver correos de ejemplo (${state.sent.length})</a><p>La simulación ejecuta la lógica de selección de destinatarios y revocación, sin contactar con ningún proveedor.</p></article><nav><form method="post" action="/__preview/reset"><button>Reiniciar datos de la preview</button></form></nav>`);
async function canManage(actor,portal,id){return canManageClient(state.sources[portal],actor,id,portal,{applicationDb:state.db});}
async function clientsFor(actor,portal){const table=portal==='community'?'subscribers':'users';const grants=await sharedGrants(actor,portal,state.db);return state.sources[portal].tables[table].filter(c=>c.role!=='admin'&&hasClientManagement(actor,c,grants,{allowPro:false})).map(c=>({...c,shared_by:c.assigned_to!==actor.email?c.assigned_to:null}));}
async function api(req,res,url,actor){
  const path=url.pathname.replace(/^\/(portal|robinjr|therobinplan)(?=\/api\/)/,'');
  const portal=url.pathname.startsWith('/robinjr/')?'robinjr':url.pathname.startsWith('/therobinplan/')?'community':'portal';
  const data=req.method==='POST'?await body(req):Object.fromEntries(url.searchParams);
  const source=state.sources[portal];
  if(path==='/api/me')return json(res,portal==='community'?{...publicActor(actor),role:'subscriber_admin'}:publicActor(actor));
  if(path==='/api/auth/sso')return json(res,{ok:true});
  if(path==='/api/auth/sso-ticket')return json(res,{ticket:'local-preview'});
  if(path==='/api/auth/logout')return json(res,{ok:true});
  if(path==='/api/admin/collaboration')return json(res,req.method==='GET'?await listCollaboration(state.db,actor,data,p=>state.sources[p]):await changeCollaboration(state.db,actor,data,p=>state.sources[p]));
  if(path==='/api/admin/tutorial')return json(res,await tutorialState(state.db,actor,data,req.method==='POST'));
  if(path==='/api/admin/users'){
    if(req.method==='POST'){
      if(!isProAdmin(actor))return json(res,{error:'pro_admin_required'},403);
      if(data.action==='create')await state.db.rpc('create_admin_profile',{p_actor:actor.id,p_name:data.name,p_email:data.email,p_username:data.username,p_attach:data.attach_to_me});
      else if(data.action==='permissions'){const user=state.db.tables.users.find(u=>u.id===data.id);user.visible_tabs=data.visible_tabs;return json(res,{ok:true,visible_tabs:user.visible_tabs});}
      else return json(res,{error:'preview_action_not_supported'},501);
    }
    const users=state.db.tables.users.filter(u=>u.role==='admin').map(u=>({...u,is_pro:isProAdmin(u)}));
    return json(res,req.method==='POST'?{user:users.at(-1)}:{users,current_is_pro:isProAdmin(actor)});
  }
  if(path==='/api/admin/integration-snapshot')return json(res,{admin:publicActor(actor),clients:state.db.tables.users.filter(u=>u.role==='client'),payments:state.payments,connections:{stripe:false,holded:false,email:false},portalUrl:`http://localhost:${port}`});
  if(path==='/api/admin/crm/leads')return json(res,{leads:[]});
  if(path==='/api/admin/crm/heartbeat')return json(res,{ok:true});
  if(path==='/api/admin/clients/all')return json(res,{clients:source.tables.users.filter(u=>u.role==='client')});
  if(path==='/api/admin/clients'&&req.method==='GET')return json(res,{clients:await clientsFor(actor,portal)});
  if(path==='/api/admin/client-folders'||path==='/api/sub-admin/client-folders')return json(res,{folders:[],items:[]});
  if(path==='/api/admin/dashboard'){
    const clients=await clientsFor(actor,portal),ids=new Set(clients.map(c=>c.id));
    return json(res,{clients,payments:state.payments.filter(p=>ids.has(p.user_id)),documents:state.documents.filter(d=>ids.has(d.user_id)),bookings:state.bookings.filter(b=>ids.has(b.user_id)),tasks:state.tasks.filter(t=>t.admin_email===actor.email),activity:[],team:[]});
  }
  if(path==='/api/admin/client-history'){
    if(!await canManage(actor,data.portal,data.user_id))return json(res,{error:'client_not_assigned'},403);
    const db=state.sources[data.portal];return json(res,{meetings:db.tables.meeting_transcripts.filter(m=>m.user_id===data.user_id),historial:db.tables.users.find(c=>c.id===data.user_id)?.historial||''});
  }
  if(path==='/api/sub-admin/data'){
    const grants=await sharedGrants(actor,'community',state.db);
    return json(res,{users:source.tables.subscribers.map(user=>({...user,can_manage:hasClientManagement(actor,user,grants)})),events:[],partners:[],requests:[],discount_codes:[],notifications:[],challenges:[],submissions:[]});
  }
  if(path==='/api/sub-admin/mutate'&&data.entity==='user'){
    if(data.action==='claim')return json(res,{ok:true,item:await claimSubscriber(source,actor,data.payload?.id)});
    if(!await canManage(actor,'community',data.payload?.id))return json(res,{error:'client_not_assigned'},403);
    Object.assign(source.tables.subscribers.find(c=>c.id===data.payload.id),data.payload);return json(res,{ok:true});
  }
  const userId=data.user_id||url.searchParams.get('user_id');
  const client=source.tables.users?.find(c=>c.id===userId);
  if(req.method==='POST'&&(path.startsWith('/api/admin/')||path==='/api/profile/lived-abroad')){
    const docId=data.id;
    const document=state.documents.find(d=>d.id===docId);
    const booking=state.bookings.find(b=>b.id===data.booking_id);
    const id=userId||document?.user_id||booking?.user_id;
    if(path==='/api/admin/clients/assign'){
      const target=source.tables.users.find(c=>c.id===userId);
      if(!target||target.role!=='client')return json(res,{error:'invalid_client'},400);
      if(target.assigned_to&&target.assigned_to!==actor.email&&!isProAdmin(actor))return json(res,{error:'only_pro_can_reassign'},403);
      target.assigned_to=actor.email;return json(res,{ok:true});
    }
    if(id&&!await canManage(actor,portal,id))return json(res,{error:'client_not_assigned'},403);
    if(path==='/api/admin/careers/assign'){
      const template=state.templates.find(t=>t.id===data.career_template_id);
      if(!client||!template)return json(res,{error:'invalid_career'},400);
      const assignments=source.tables.client_careers||=[];
      const match=row=>row.user_id===client.id&&row.career_template_id===template.id;
      if(data.action==='unassign')source.tables.client_careers=assignments.filter(row=>!match(row));
      else if(!assignments.some(match))assignments.push({user_id:client.id,career_template_id:template.id});
      return json(res,{ok:true});
    }
    if(path==='/api/admin/phase'&&client){client.application_phase=data.phase;return json(res,{ok:true});}
    if(path==='/api/admin/clients'&&client){Object.assign(client,data.data,{updated_at:new Date().toISOString()});return json(res,{ok:true,updated_at:client.updated_at});}
    if(path==='/api/admin/payments/unlock'){state.payments.find(p=>p.user_id===userId&&p.installment===data.installment).status='unlocked';return json(res,{ok:true});}
    if(path==='/api/admin/documents/review'&&document){document.status=data.decision==='validate'?'validated':'required';return json(res,{ok:true});}
    if(path==='/api/admin/tasks'){state.tasks.push({id:randomUUID(),title:data.title,admin_email:actor.email,status:'open'});return json(res,{ok:true});}
    return json(res,{error:'preview_action_not_supported',detail:'Esta acción no se ejecuta en la demo.'},501);
  }
  if(path==='/api/admin/payments')return json(res,{user:client,payments:state.payments.filter(p=>p.user_id===userId)});
  if(path==='/api/admin/documents')return json(res,{documents:state.documents.filter(d=>d.user_id===userId)});
  if(path==='/api/careers'){
    const assigned=(source.tables.client_careers||[]).filter(row=>row.user_id===userId).map(row=>row.career_template_id);
    return json(res,{templates:state.templates,assigned_template_ids:assigned,careers:state.templates.filter(template=>assigned.includes(template.id))});
  }
  if(path==='/api/admin/career-suggestions')return json(res,{has_questionnaire:true,suggestions:{items:[],generated_at:new Date().toISOString()},feedback:[]});
  if(path==='/api/bookings')return json(res,{bookings:state.bookings.filter(b=>b.user_id===userId)});
  if(path==='/api/admin/chat')return json(res,{messages:[],ai_paused:false});
  if(path==='/api/admin/notifications'||path==='/api/notifications')return json(res,{notifications:[]});
  if(path==='/api/faqs')return json(res,{faqs:state.faqs});
  return json(res,{error:'preview_not_connected',detail:'Área sin datos externos en esta preview.'},503);
}

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://localhost:${port}`),actor=actorFor(req);
    if(url.pathname==='/')return html(res,chooser());
    if(url.pathname.startsWith('/__preview/as/')){
      const selected=state.db.tables.users.find(u=>u.username===decodeURIComponent(url.pathname.slice('/__preview/as/'.length))&&u.role==='admin');
      if(!selected)return json(res,{error:'unknown_preview_actor'},404);
      const next=url.searchParams.get('next')||'/admin/configuracion';
      if(!/^\/(admin|portal|robinjr|therobinplan)(\/|$)/.test(next)||next.startsWith('//'))return json(res,{error:'invalid_preview_path'},400);
      res.writeHead(302,{'set-cookie':`robin_collaboration_preview=${selected.id}; Path=/; HttpOnly; SameSite=Strict`,location:next});return res.end();
    }
    if(url.pathname==='/__preview/reset'&&req.method==='POST'){state=previewState();res.writeHead(303,{location:'/'});return res.end();}
    if(url.pathname==='/__preview/status')return json(res,{actor:publicActor(actor),links:state.db.tables.admin_links,shares:state.db.tables.admin_client_shares,tutorials:state.db.tables.admin_tutorials,sent:state.sent,production:false});
    if(url.pathname==='/__preview/meeting'&&req.method==='POST'){
      const client=state.db.tables.users.find(u=>u.nombre==='Lucía');
      state.db.tables.meeting_transcripts.push({id:randomUUID(),user_id:client.id,advisor_email:'manuel@project-robin.com',title:'Llamada de prueba en local',meeting_at:new Date().toISOString(),completed_at:new Date().toISOString(),summary:'Notas ficticias: revisar documentos y preparar la siguiente llamada.',status:'completed'});
      await deliverMeetingNotes('portal',{db:state.db,source:state.db,sendEmail:async mail=>{state.sent.push(mail);return {sent:true};}});
      res.writeHead(303,{location:'/__preview/outbox'});return res.end();
    }
    if(url.pathname==='/__preview/outbox')return html(res,shell(`<h1>Correos de ejemplo</h1><p>No se ha enviado ningún correo real.</p>${state.sent.map(mail=>`<article><strong>Para: ${safe(mail.to)}</strong><h2>${safe(mail.subject)}</h2><pre>${safe(mail.text)}</pre></article>`).join('')||'<p>No hay correos en la bandeja de ejemplo.</p>'}<a href="/">Volver a los casos de prueba</a>`));
    if(url.pathname.includes('/api/'))return await api(req,res,url,actor);
    const portal=url.pathname.startsWith('/admin')?'admin':url.pathname.startsWith('/robinjr')?'robinjr':url.pathname.startsWith('/therobinplan')?'community':'portal';
    const prefix={admin:'/admin/',portal:'/portal/',robinjr:'/robinjr/',community:'/therobinplan/'}[portal];
    const base=roots[portal];
    const isAsset=url.pathname.startsWith(prefix)&&extname(url.pathname)!=='';
    const filename=isAsset?resolve(base,decodeURIComponent(url.pathname.slice(prefix.length))):resolve(base,'index.html');
    if(!filename.startsWith(base+sep))return json(res,{error:'not_found'},404);
    const content=await readFile(filename);
    if(!isAsset)return html(res,content.toString().replace('</body>','<a href="/" style="position:fixed;bottom:8px;left:8px;z-index:9000;padding:7px 11px;background:white;border:1px solid #2d3a64;border-radius:8px;font:12px Arial;color:#2d3a64;text-decoration:none">Preview local · Cambiar perfil</a></body>'));
    const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'}[extname(filename)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(content);
  }catch(error){if(!res.headersSent)json(res,{error:error.message},error.statusCode||500);else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview local de administradores: http://localhost:${port}/`));
process.on('SIGTERM',()=>server.close());process.on('SIGINT',()=>server.close());
