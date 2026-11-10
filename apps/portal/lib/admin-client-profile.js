const { randomUUID } = require('node:crypto');
const { email: validEmail } = require('./validation');
const { sanitizeAcademicProfile } = require('../shared/academic-systems.cjs');
const { isApplicationAdmin, isDeveloperAdmin, canUseStudentPortal, normalizeEmail } = require('./authorization');
const INTERESTS = new Set(['ciencias','tecnologia_y_programacion','business','ciencias_de_la_salud','ingenierias','ciencias_sociales','artes']);
const TEXT_FIELDS = { nombre:120, apellidos:180, username:254, dni_numero:80, direccion:500, telefono_alumno:60, pais:120 };
const ALLOWED = new Set([...Object.keys(TEXT_FIELDS),'email','fecha_nacimiento','origin','application_level','has_eu_id','intereses','academic_system','academic_subjects','questionnaire']);
function fail(code, statusCode = 400) { throw Object.assign(new Error(code), { statusCode, code }); }
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
function canEditClient(actor, client) {
 return isApplicationAdmin(actor) && canUseStudentPortal(actor) && !isApplicationAdmin(client)
  && (isDeveloperAdmin(actor) || String(client.assigned_to || '').toLowerCase() === normalizeEmail(actor));
}
function buildProfilePatch(data) {
 if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length || Object.keys(data).some(key=>!ALLOWED.has(key))) fail('invalid_fields');
 const patch={};
 for (const [key,max] of Object.entries(TEXT_FIELDS)) if (own(data,key)) {
  if (typeof data[key] !== 'string' || data[key].trim().length > max || (key === 'username' && !data[key].trim())) fail('invalid_'+key);
  patch[key]=data[key].trim();
 }
 if (own(data,'email')) { patch.email=validEmail(data.email); if (!patch.email) fail('invalid_email'); }
 if (own(data,'fecha_nacimiento')) {
  const date=String(data.fecha_nacimiento || '');
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)) fail('invalid_birth_date');
  patch.fecha_nacimiento=date || null;
 }
 for (const [key,values] of [['origin',['espana','otros']],['application_level',['grado','maestria']]]) if (own(data,key)) {
  if (data[key]!=null && data[key]!=='' && !values.includes(data[key])) fail('invalid_'+key);
  patch[key]=data[key] || null;
 }
 if (own(data,'has_eu_id')) { if (data.has_eu_id!==null && typeof data.has_eu_id!=='boolean') fail('invalid_has_eu_id'); patch.has_eu_id=data.has_eu_id; }
 if (own(data,'intereses')) { if (!Array.isArray(data.intereses) || data.intereses.some(value=>!INTERESTS.has(value))) fail('invalid_intereses'); patch.intereses=[...new Set(data.intereses)]; }
 if (own(data,'academic_system') || own(data,'academic_subjects')) {
  if (!data.academic_system && Array.isArray(data.academic_subjects) && !data.academic_subjects.length) {patch.academic_system=null;patch.academic_subjects=[];}
  else { const profile=sanitizeAcademicProfile(data.academic_system,data.academic_subjects); if(!profile) fail('invalid_academic_profile'); patch.academic_system=profile.system;patch.academic_subjects=profile.subjects; }
 }
 if (own(data,'questionnaire')) {
  const q=data.questionnaire;
  if (!q || typeof q!=='object' || !Array.isArray(q.blocks) || q.blocks.length>30 || JSON.stringify(q).length>100000) fail('invalid_questionnaire');
  if(q.blocks.some(block=>typeof block.title!=='string'||block.title.length>200||!Array.isArray(block.items)||block.items.length>100||block.items.some(item=>typeof item.q!=='string'||item.q.length>400||!(typeof item.a==='string'||typeof item.a==='number'||Array.isArray(item.a)&&item.a.every(value=>typeof value==='string'))||JSON.stringify(item.a).length>12000))) fail('invalid_questionnaire');
  if(q.signals && (typeof q.signals!=='object'||Array.isArray(q.signals))) fail('invalid_questionnaire');
  patch.questionnaire={version:Number(q.version)||1,blocks:q.blocks,signals:q.signals || {}};
 }
 if (['questionnaire','academic_system','academic_subjects','intereses'].some(key=>own(patch,key))) {patch.career_suggestions=null;patch.career_suggestions_at=null;}
 return patch;
}
function editCommercialNotes(notes, data, author, now) {
 const body=typeof data.text==='string'?data.text.trim():'';
 if(!body||body.length>10000)fail('invalid_note');
 if(data.operation==='add')return [...notes,{id:`portal:${randomUUID()}`,kind:'team_note',body,authorName:author,createdAt:now}];
 if(data.operation!=='edit')fail('invalid_note_operation');
 if(!notes.some(note=>note.id===data.note_id))fail('note_not_found',404);
 return notes.map(note=>note.id===data.note_id?{...note,body,editedAt:now,editedBy:author}:note);
}
module.exports={buildProfilePatch,canEditClient,editCommercialNotes,fail};
