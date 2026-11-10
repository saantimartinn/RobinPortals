import { Q_GENERAL, Q_VOCACIONAL, Q_AREAS, Q_MASTER_BLOCKS } from '../../questionnaire-data.js';
import { formatSubjectRanking, subjectRankingSignals } from '../onboarding/subject-ranking.js';
const ALL_QUESTIONS=[Q_GENERAL,Q_VOCACIONAL,...Object.values(Q_AREAS),...Q_MASTER_BLOCKS].flatMap(block=>block.questions);
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function questionDefinition(text){return ALL_QUESTIONS.find(question=>normalize(question.q)===normalize(text));}
export const PROFILE_FIELDS=['nombre','apellidos','email','username','dni_numero','direccion','fecha_nacimiento','telefono_alumno','pais'];
export function profileDraft(client){
 const signals=client.questionnaire?.signals||{};
 const preferred=signals.asignaturas_ordenadas||[];
 return {
  ...Object.fromEntries(PROFILE_FIELDS.map(key=>[key,client[key]||''])),
  origin:client.origin||'',application_level:client.application_level||'',has_eu_id:client.has_eu_id??null,
  intereses:[...(client.intereses||[])],academic_system:client.academic_system||'',
  academic_subjects:(client.academic_subjects||[]).map(subject=>{
   const existing=preferred.find(item=>normalize(item.name)===normalize(subject.name));
   const likes=(signals.asignaturas_fav||[]).some(name=>normalize(name)===normalize(subject.name));
   const dislikes=(signals.asignaturas_menos||[]).some(name=>normalize(name)===normalize(subject.name));
   return {...subject,level:subject.level||'',preference:existing?.preference||(likes?'like':dislikes?'dislike':null)};
  }),
  questionnaire:client.questionnaire?JSON.parse(JSON.stringify(client.questionnaire)):null,
 };
}
const SIGNALS={g_nota:'nota_media',g_estilo:'estilo_aprendizaje',g_independencia:'independencia',g_presupuesto:'presupuesto_mensual',g_ingles:'nivel_ingles',m_ingles:'nivel_ingles',g_modalidad:'modalidad_bachillerato',g_rasgos:'rasgos',g_valora:'valora',v_prioridad:'prioridad'};
function optionValue(options,value){const option=(options||[]).find(item=>(typeof item==='string'?item:item.label)===value);return typeof option==='object'?option.value:value;}
export function profilePayload(draft,original){
 const data={...Object.fromEntries(PROFILE_FIELDS.map(key=>[key,draft[key]])),origin:draft.origin,application_level:draft.application_level,has_eu_id:draft.has_eu_id,intereses:draft.intereses,academic_system:draft.academic_system,academic_subjects:draft.academic_subjects.map(({name,level})=>({name,level}))};
 if(!draft.questionnaire)return data;
 const q=JSON.parse(JSON.stringify(draft.questionnaire));const signals={...(q.signals||{}),areas:[...draft.intereses]};
 const syncRanking=JSON.stringify(draft.academic_subjects)!==JSON.stringify(profileDraft(original).academic_subjects)||Array.isArray(signals.asignaturas_ordenadas);
 for(const block of q.blocks||[]) for(const item of block.items||[]){
  const def=questionDefinition(item.q);
  if(def?.type==='subject-ranking') {item.a=formatSubjectRanking(draft.academic_subjects);continue;}
  if(!def)continue;
  const signal=SIGNALS[def.id];
  if(signal){
   if(def.type==='slider'){const value=parseFloat(String(item.a).replace(',','.'));if(Number.isFinite(value))signals[signal]=value;}
   else if(def.type==='multi') signals[signal]=(Array.isArray(item.a)?item.a:[]).map(value=>optionValue(def.options,value));
   else signals[signal]=optionValue(def.options,item.a);
  }
  if(def.id.endsWith('_certificado'))signals.tiene_certificacion_ingles=item.a==='Sí';
  if(def.id.endsWith('_certificado_nombre'))signals.certificacion_ingles=item.a;
 }
 if(signals.tiene_certificacion_ingles===false)signals.certificacion_ingles='';
 if(syncRanking)Object.assign(signals,subjectRankingSignals(draft.academic_subjects));
 q.signals=signals;data.questionnaire=q;return data;
}
