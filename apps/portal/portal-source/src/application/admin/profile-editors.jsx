import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, FileText, GraduationCap, Loader2, Pencil, Plus, Save, User } from 'lucide-react';
import { Btn, Card, CardContent, CardHeader } from '../../ui.jsx';
import { NAVY } from '../../theme.js';
import { adminClientNoteSave, adminClientProfileSave } from '../../api.js';
import academicSystemsConfig from '../../../../shared/academic-systems.cjs';
import { SubjectRanking } from '../onboarding/subject-ranking.jsx';
import { profileDraft, profilePayload, questionDefinition } from './profile-edit-model.js';
const { ACADEMIC_SYSTEMS, academicSystemByValue }=academicSystemsConfig;
export const INTERESTS=[['ciencias','Ciencias'],['tecnologia_y_programacion','Tecnología y programación'],['business','Business'],['ciencias_de_la_salud','Ciencias de la salud'],['ingenierias','Ingenierías'],['ciencias_sociales','Ciencias sociales'],['artes','Artes']];
function errorMessage(error){
 const code=error.data?.error;
 if(code==='edit_conflict')return 'Otro miembro del equipo ha modificado estos datos. Recarga el perfil antes de guardar.';
 if(code==='identity_in_use')return 'Ese correo o usuario ya está en uso por otra cuenta.';
 if(code==='invalid_academic_profile')return 'Revisa el sistema académico y el nivel de cada asignatura.';
 if(code==='invalid_email')return 'Revisa el correo electrónico.';
 if(code==='invalid_birth_date')return 'Revisa la fecha de nacimiento.';
 return error.message||'No se pudieron guardar los cambios.';
}
function EditField({label,value,onChange,type='text',className=''}){return <label className={className}><span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span><input aria-label={label} type={type} value={value||''} onChange={event=>onChange(event.target.value)} /></label>;}
export function AdminProfileEditor({client,onRefresh,academicOnly=false,personalOnly=false,formOnly=false,onSaved,onCancel}){
 const [draft,setDraft]=useState(()=>profileDraft(client));
 const [busy,setBusy]=useState(false);const [status,setStatus]=useState(null);
 useEffect(()=>{setDraft(profileDraft(client));},[client.id,client.updated_at]);
 useEffect(()=>setStatus(null),[client.id]);
 const field=(key,value)=>{setDraft(previous=>({...previous,[key]:value}));setStatus(null);};
 const system=academicSystemByValue(draft.academic_system);
 function changeSystem(value){const selected=academicSystemByValue(value);setDraft(previous=>({...previous,academic_system:value,academic_subjects:previous.academic_subjects.map(subject=>({...subject,level:selected?.levels.some(level=>level.value===subject.level)?subject.level:''}))}));setStatus(null);}
 function updateAnswer(blockIndex,itemIndex,value){setDraft(previous=>({...previous,questionnaire:{...previous.questionnaire,blocks:previous.questionnaire.blocks.map((block,bi)=>bi===blockIndex?{...block,items:block.items.map((item,ii)=>ii===itemIndex?{...item,a:value}:item)}:block)}}));setStatus(null);}
 async function save(event){event.preventDefault();setBusy(true);setStatus(null);try{const data=profilePayload(draft,client);if(academicOnly||formOnly||personalOnly){const allowed=personalOnly?['nombre','apellidos','email','username','dni_numero','fecha_nacimiento','telefono_alumno','direccion','origin','pais','application_level','has_eu_id']:formOnly?['intereses','academic_system','academic_subjects','questionnaire']:['academic_system','academic_subjects','questionnaire'];for(const key of Object.keys(data))if(!allowed.includes(key))delete data[key];}await adminClientProfileSave(client.id,data,client.updated_at);await onRefresh?.();setStatus({type:'success',text:'Cambios guardados.'});onSaved?.();}catch(error){setStatus({type:'error',text:errorMessage(error)});}finally{setBusy(false);}}
 return <form onSubmit={save} className="admin-profile-form" aria-label={formOnly?'Modificar formulario':academicOnly?'Editar perfil académico':'Editar perfil del alumno'}>
  {!academicOnly&&!formOnly&&<Card><CardHeader title="Datos personales" subtitle="Puedes corregir los datos del alumno y su solicitud" icon={User}/><CardContent className="admin-profile-fields">
   {[['nombre','Nombre'],['apellidos','Apellidos'],['email','Email','email'],['username','Usuario'],['dni_numero','DNI o pasaporte'],['fecha_nacimiento','Fecha de nacimiento','date'],['telefono_alumno','Teléfono del alumno','tel'],['direccion','Dirección']].map(([key,label,type])=><EditField key={key} label={label} type={type} value={draft[key]} onChange={value=>field(key,value)}/>)}
   <label><span className="block text-xs font-medium text-slate-600 mb-1.5">Origen de la solicitud</span><select aria-label="Origen de la solicitud" value={draft.origin} onChange={event=>field('origin',event.target.value)}><option value="">Sin indicar</option><option value="espana">España</option><option value="otros">Otro país</option></select></label>
   <EditField label="País" value={draft.pais} onChange={value=>field('pais',value)}/>
   <label><span className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de estudios</span><select aria-label="Tipo de estudios" value={draft.application_level} onChange={event=>field('application_level',event.target.value)}><option value="">Sin indicar</option><option value="grado">Grado</option><option value="maestria">Máster</option></select></label>
   <label><span className="block text-xs font-medium text-slate-600 mb-1.5">Documento de identidad europeo</span><select aria-label="Documento de identidad europeo" value={draft.has_eu_id==null?'':String(draft.has_eu_id)} onChange={event=>field('has_eu_id',event.target.value===''?null:event.target.value==='true')}><option value="">Sin indicar</option><option value="true">Sí</option><option value="false">No</option></select></label>
  </CardContent></Card>}
  {!academicOnly&&!personalOnly&&<Card><CardHeader title="Intereses de carrera" subtitle="Modifica las áreas de interés del alumno" icon={BookOpen}/><CardContent className="admin-profile-interests">{INTERESTS.map(([value,label])=><label key={value}><input type="checkbox" checked={draft.intereses.includes(value)} onChange={()=>field('intereses',draft.intereses.includes(value)?draft.intereses.filter(item=>item!==value):[...draft.intereses,value])}/>{label}</label>)}</CardContent></Card>}
  {!personalOnly&&<Card><CardHeader title="Perfil académico" subtitle="Sistema, asignaturas, niveles y preferencias" icon={GraduationCap}/><CardContent className="space-y-4">
   <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1.5">Sistema académico</span><select aria-label="Sistema académico" value={draft.academic_system} onChange={event=>changeSystem(event.target.value)}><option value="">Sin indicar</option>{ACADEMIC_SYSTEMS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
   <SubjectRanking system={system} value={draft.academic_subjects} onChange={value=>field('academic_subjects',value)}/>
  </CardContent></Card>}
  {!academicOnly&&!personalOnly&&<Card><CardHeader title="Cuestionario de orientación" subtitle="Corrige las respuestas recogidas durante el onboarding" icon={FileText}/><CardContent>
   {!draft.questionnaire?.blocks?.length?<p className="text-sm text-slate-500">Todavía no hay respuestas registradas.</p>:draft.questionnaire.blocks.map((block,bi)=><fieldset key={bi} className="mb-6"><legend className="text-sm font-semibold text-slate-800">{block.title}</legend>{block.items.map((item,ii)=>questionDefinition(item.q)?.type==='subject-ranking'?<p key={ii} className="text-xs text-slate-500 mt-3">El orden y las preferencias de las asignaturas se editan en «Perfil académico», arriba.</p>:<label className="admin-profile-question" key={ii}><span>{item.q}{Array.isArray(item.a)?' (una respuesta por línea)':''}</span><textarea rows={Array.isArray(item.a)?Math.min(5,Math.max(2,item.a.length)):2} value={Array.isArray(item.a)?item.a.join('\n'):String(item.a??'')} onChange={event=>updateAnswer(bi,ii,Array.isArray(item.a)?event.target.value.split('\n').map(value=>value.trim()).filter(Boolean):event.target.value)}/></label>)}</fieldset>)}
  </CardContent></Card>}
  <div className="admin-profile-save"><span role={status?.type==='error'?'alert':'status'} className={`admin-profile-status ${status?'is-'+status.type:''}`}>{status?.text}</span><Btn type="button" variant="secondary" disabled={busy} onClick={()=>{setDraft(profileDraft(client));setStatus(null);onCancel?.();}}>{onCancel?'Cancelar':'Descartar cambios'}</Btn><Btn type="submit" disabled={busy}>{busy?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {busy?'Guardando…':formOnly?'Guardar formulario':'Guardar cambios'}</Btn></div>
 </form>;
}
export function OnboardingQuestionnaire({client,questionnaire,onRefresh}){
 const [expanded,setExpanded]=useState(false);
 const [editing,setEditing]=useState(false);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{setExpanded(false);setEditing(false);setSaved(false);},[client.id]);
 const blocks=questionnaire?.blocks||[];
 if(!blocks.length)return null;
 return <Card className="admin-questionnaire">
  <CardHeader title="Cuestionario de orientación" icon={FileText} subtitle="Respuestas del alumno en el onboarding" right={<div className="flex flex-wrap gap-2">
   {!editing&&<Btn type="button" variant="secondary" size="sm" onClick={()=>{setExpanded(true);setEditing(true);setSaved(false);}}><Pencil size={14}/>Modificar formulario</Btn>}
   <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100" aria-expanded={expanded} aria-controls={`questionnaire-${client.id}`} onClick={()=>{setExpanded(value=>!value);}}>{expanded?'Ocultar':'Ver respuestas'}<ChevronDown size={14} style={{transform:expanded?'rotate(180deg)':'none',transition:'transform .2s'}}/></button>
  </div>}/>
  {saved&&<p role="status" className="px-5 pb-3 text-sm text-emerald-700">Formulario guardado.</p>}
  {expanded&&<div id={`questionnaire-${client.id}`}><CardContent className="space-y-4">
   {editing?<AdminProfileEditor client={{...client,questionnaire}} onRefresh={onRefresh} formOnly onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setSaved(true);}}/>:blocks.map((block,bi)=><div key={bi}><div className="text-xs font-bold mb-2" style={{color:NAVY}}>{block.title}</div><div className="space-y-2">{(block.items||[]).map((item,ii)=><div key={ii} className="text-sm"><div className="text-slate-500 text-xs">{item.q}</div><div className="text-slate-800 whitespace-pre-wrap">{Array.isArray(item.a)?item.a.join(', '):String(item.a??'')}</div></div>)}</div></div>)}
  </CardContent></div>}
 </Card>;
}

function NoteEditor({note,onSave,busy}){
 const [text,setText]=useState(note.body||'');const [editing,setEditing]=useState(false);
 useEffect(()=>{setText(note.body||'');setEditing(false);},[note.id,note.body]);
 return <div className="admin-note-editor rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{note.authorName||'Equipo Robin'}{note.createdAt?` · ${new Date(note.createdAt).toLocaleDateString('es-ES')}`:''}{note.editedAt?' · Editada':''}</div>{editing?<><textarea aria-label="Editar nota comercial" maxLength={10000} value={text} onChange={event=>setText(event.target.value)}/><div className="admin-note-actions"><Btn size="sm" variant="secondary" disabled={busy} onClick={()=>{setText(note.body||'');setEditing(false);}}>Cancelar</Btn><Btn size="sm" disabled={busy||!text.trim()} onClick={async()=>{if(await onSave({operation:'edit',note_id:note.id,text}))setEditing(false);}}>Guardar nota</Btn></div></>:<><p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p><div className="admin-note-actions"><Btn size="sm" variant="secondary" onClick={()=>setEditing(true)}>Editar nota</Btn></div></>}</div>;
}
export function CommercialNotesEditor({client,onRefresh}){
 const [notes,setNotes]=useState(client.crm_notes||[]);const [version,setVersion]=useState(client.crm_notes_updated_at||null);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [status,setStatus]=useState(null);
 useEffect(()=>{setNotes(client.crm_notes||[]);setVersion(client.crm_notes_updated_at||null);setText('');setStatus(null);},[client.id,client.crm_notes_updated_at]);
 async function save(data){setBusy(true);setStatus(null);try{const result=await adminClientNoteSave(client.id,data,version);setNotes(result.crm_notes);setVersion(result.crm_notes_updated_at);await onRefresh?.();setStatus({type:'success',text:'Nota guardada.'});return true;}catch(error){setStatus({type:'error',text:errorMessage(error)});return false;}finally{setBusy(false);}}
 return <Card><CardHeader title="Notas comerciales" subtitle="Información interna editable, visible solo para administración" icon={FileText}/><CardContent className="space-y-3">
  {!notes.length&&<p className="text-sm text-slate-400">No hay notas comerciales.</p>}
  {notes.map(note=><NoteEditor key={note.id} note={note} busy={busy} onSave={save}/>)}
  <div className="admin-note-editor"><label className="block text-xs text-slate-600" htmlFor={`new-note-${client.id}`}>Nueva nota comercial</label><textarea id={`new-note-${client.id}`} maxLength={10000} value={text} onChange={event=>setText(event.target.value)} placeholder="Añade información para el equipo…"/><div className="admin-note-actions"><Btn size="sm" disabled={busy||!text.trim()} onClick={async()=>{if(await save({operation:'add',text}))setText('');}}>{busy?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Añadir nota</Btn></div></div>
  {status&&<p role={status.type==='error'?'alert':'status'} className={`admin-profile-status is-${status.type}`}>{status.text}</p>}
 </CardContent></Card>;
}
