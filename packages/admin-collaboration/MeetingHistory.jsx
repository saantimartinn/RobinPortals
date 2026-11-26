import React,{useEffect,useState} from 'react';

export function MeetingHistory({clientId,portal}){
  const [data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setData(null);setError('');fetch(`/api/admin/client-history?portal=${portal}&user_id=${encodeURIComponent(clientId)}`,{credentials:'same-origin',cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>{if(active)setData(result);}).catch(()=>{if(active)setError('No se pudo cargar el historial de llamadas.');});return()=>{active=false;};},[clientId,portal]);
  return <section className="ui-card rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-slate-800">Historial de llamadas</h2><p className="text-sm text-slate-500 mt-1">Notas de las reuniones, incluidas las anteriores a la asignación compartida.</p>
    {error&&<p role="alert" className="text-sm text-rose-700 mt-3">{error}</p>}
    {!data&&!error&&<p role="status" className="text-sm text-slate-500 mt-3">Cargando historial…</p>}
    {data?.meetings?.map(meeting=><details key={meeting.id} className="rounded-xl border border-slate-200 p-4 mt-3"><summary className="cursor-pointer text-sm font-semibold">{new Date(meeting.meeting_at).toLocaleDateString('es-ES')} · {meeting.title}</summary><p className="whitespace-pre-wrap text-sm text-slate-700 mt-3">{meeting.summary}</p></details>)}
    {data&&!data.meetings?.length&&(data.historial?<p className="whitespace-pre-wrap text-sm text-slate-700 mt-3">{data.historial}</p>:<p className="text-sm text-slate-500 mt-3">Todavía no hay notas de reuniones.</p>)}
  </section>;
}
