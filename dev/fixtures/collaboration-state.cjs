const {memoryDatabase}=require('./collaboration-db.cjs');
const {ADMIN_VISIBLE_TABS}=require('../../apps/admin/lib/admin-profiles');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function previewState(){
  const ago=days=>new Date(Date.now()-days*86400000).toISOString();
  const actors=[
    {id:uid(1),username:'manuel',nombre:'Manuel',email:'manuel@project-robin.com',role:'admin',is_pro_admin:true,visible_tabs:ADMIN_VISIBLE_TABS},
    {id:uid(2),username:'noel',nombre:'Noel',email:'noel@project-robin.com',role:'admin',is_pro_admin:true,visible_tabs:ADMIN_VISIBLE_TABS},
    {id:uid(3),username:'ana',nombre:'Ana',apellidos:'Demo',email:'ana@example.test',role:'admin',visible_tabs:['home.summary','home.students','home.settings','crm.to_contact','platform.student_portal','platform.robin_plan']},
    {id:uid(4),username:'bruno',nombre:'Bruno',apellidos:'Demo',email:'bruno@example.test',role:'admin',visible_tabs:['home.students','home.settings','platform.student_portal','platform.robin_plan']},
  ];
  const common={role:'client',tipo:'general',origin:'espana',pais:'España',application_level:'grado',has_eu_id:true,application_phase:3,days_in_phase:5,requires_onboarding:false,dni_completed:true,contract_signed:true,profile_completed:true,pago_completed:true,num_carreras:2,created_at:ago(12),updated_at:ago(1),fecha_nacimiento:'2007-05-10',telefono_alumno:'+34 600 000 000',direccion:'Dirección de ejemplo',dni_numero:'DEMO',intereses:['business'],academic_system:'ib',academic_subjects:[{name:'Economía',level:'hl'},{name:'Inglés',level:'sl'}],questionnaire:{blocks:[{title:'Orientación',items:[{q:'¿Qué te gustaría estudiar?',a:'Business y economía'}]}],signals:{}},crm_notes:[{id:'demo-note',body:'Nota interna ficticia: revisar requisitos de acceso.',authorName:'Equipo de ejemplo',createdAt:ago(2)}],historial:'Reunión anterior a la asignación compartida: acordamos revisar las opciones de Business.'};
  function client(n,nombre,apellidos,owner){return {...structuredClone(common),id:uid(n),lead_id:String(1800+n),username:String(1800+n),nombre,apellidos,email:`cliente${n}@example.test`,assigned_to:owner};}
  const clients=[client(10,'Lucía','Martín',actors[0].email),client(11,'Clara','Vega',actors[0].email),client(12,'Sofía','Ruiz',actors[1].email),client(13,'Diego','López',actors[2].email),client(14,'Eva','Santos',actors[3].email)];
  const juniors=[client(20,'Alma','Díaz',actors[0].email),client(21,'Hugo','Gil',actors[2].email)];
  const subscribers=[client(30,'Sara','Molina',actors[0].email),client(31,'Lucas','Sanz',actors[2].email),client(32,'Nora','Vidal',null)].map(c=>({...c,role:'subscriber',is_subscriber:true,name:`${c.nombre} ${c.apellidos}`,ciudad:'Maastricht',subscription_status:'active',subscription_plan:'monthly',requests_open:0,requests_total:0,rsvps_count:0}));
  const links=[{pro_admin_id:actors[0].id,admin_id:actors[2].id},{pro_admin_id:actors[1].id,admin_id:actors[2].id},{pro_admin_id:actors[0].id,admin_id:actors[3].id}];
  const grant=(pro,admin,portal,clientId)=>({pro_admin_id:actors[pro].id,admin_id:actors[admin].id,portal,client_id:uid(clientId),owner_email:actors[pro].email,created_at:ago(3)});
  const meetings=rows=>rows.map((c,i)=>({id:uid(100+Number(c.lead_id)),user_id:c.id,advisor_email:c.assigned_to,title:'Orientación inicial · ejemplo',meeting_at:ago(8),completed_at:ago(8),summary:'Temas: opciones académicas.\nDecisión: revisar requisitos.\nAcción: preparar la documentación para la próxima reunión.',status:'completed'}));
  const db=memoryDatabase({users:[...actors,...clients],admin_links:links,admin_client_shares:[grant(0,2,'portal',10),grant(1,2,'portal',12),grant(0,2,'robinjr',20),grant(0,2,'community',30)],admin_tutorials:['admin','portal','robinjr','community'].map(portal=>({admin_id:actors[3].id,portal,revision:1,completed_revision:0,step:0})),admin_meeting_mail:[],meeting_transcripts:meetings(clients)});
  const sources={portal:db,robinjr:memoryDatabase({users:juniors,meeting_transcripts:meetings(juniors)}),community:memoryDatabase({subscribers})};
  const templates=[
    {id:uid(70),name:'International Business',university:'Maastricht University',city:'Maastricht',required_docs:[{id:'req-demo',type:'document',name:'Certificado académico',required:true,deadline:'2027-01-15'}]},
    {id:uid(71),name:'Economics',university:'Maastricht University',city:'Maastricht',required_docs:[]},
    {id:uid(72),name:'Psychology',university:'Tilburg University',city:'Tilburg',required_docs:[]},
    {id:uid(73),name:'Computer Science',university:'University of Groningen',city:'Groningen',required_docs:[]},
    {id:uid(74),name:'Law',university:'Tilburg University',city:'Tilburg',required_docs:[]},
    {id:uid(75),name:'Artificial Intelligence',university:'University of Groningen',city:'Groningen',required_docs:[]},
    {id:uid(76),name:'Business Analytics',university:'Maastricht University',city:'Maastricht',required_docs:[]},
    {id:uid(77),name:'Programa pendiente de universidad',university:'',city:'',required_docs:[]},
  ];
  db.tables.client_careers=[{user_id:uid(10),career_template_id:uid(70)},{user_id:uid(10),career_template_id:uid(74)},{user_id:uid(11),career_template_id:uid(72)},{user_id:uid(13),career_template_id:uid(73)}];
  sources.robinjr.tables.client_careers=[{user_id:uid(20),career_template_id:uid(71)}];
  const payments=[],documents=[],bookings=[];
  for(const c of [...clients,...juniors]){
    payments.push({id:uid(200+Number(c.lead_id)),user_id:c.id,installment:1,amount:799.67,currency:'EUR',status:'paid',paid_at:ago(10),payment_data:{}},{id:uid(300+Number(c.lead_id)),user_id:c.id,installment:2,amount:799.67,currency:'EUR',status:'locked'},{id:uid(400+Number(c.lead_id)),user_id:c.id,installment:3,amount:799.66,currency:'EUR',status:'locked'});
    documents.push({id:uid(500+Number(c.lead_id)),user_id:c.id,name:'Certificado académico',required:true,status:'pending_review',has_file:true,uploaded_at:ago(1)});
    bookings.push({id:uid(600+Number(c.lead_id)),user_id:c.id,admin_email:c.assigned_to,status:'scheduled',start_at:new Date(Date.now()+2*86400000).toISOString(),duration_min:30,topic:'Seguimiento de ejemplo',meet_join_url:'#reunion-de-ejemplo'});
  }
  return {db,sources,templates,payments,documents,bookings,sent:[],tasks:[],faqs:[{id:uid(90),question:'¿Dónde consulto mis documentos?',answer:'En la pestaña Documentos de tu expediente.',category:'General',published:true,builtin:true,sort_order:1}]};
}
module.exports={previewState,uid};
