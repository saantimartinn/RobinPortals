import { useEffect, useState } from 'react';
import { Link2, Unlink, Users, GraduationCap, X } from 'lucide-react';
import { portalClient, PortalAccessUser, PortalAdmin } from '@/services/portal';
import { Button } from '@/components/ui/button';

type Link = { pro_admin_id: string; admin_id: string };
type SharedClient = { id: string; nombre?: string; apellidos?: string; email?: string; assigned_to: string };

export function AdminCollaboration({ users, actor, notify }: { users: PortalAccessUser[]; actor: PortalAdmin; notify: (text: string) => void }) {
  const [links,setLinks]=useState<Link[]>([]),[target,setTarget]=useState<PortalAccessUser|null>(null);
  const [portal,setPortal]=useState('portal'),[clients,setClients]=useState<SharedClient[]>([]),[shared,setShared]=useState<string[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState('');
  const pro=actor.is_pro_admin===true;
  const label=(user:PortalAccessUser)=>[user.nombre,user.apellidos].filter(Boolean).join(' ')||user.email||'Administrador';
  async function refresh(){setError('');try{setLinks((await portalClient.collaboration()).links);}catch{setError('No se pudieron cargar los vínculos. Reintenta con Actualizar.');}finally{setLoading(false);}}
  useEffect(()=>{void refresh();},[users.length]);
  useEffect(()=>{
    if(!target)return;
    let active=true;setLoading(true);setError('');setQuery('');setClients([]);
    portalClient.collaboration(target.id,portal).then(data=>{if(active){setClients(data.clients||[]);setShared(data.shared_ids||[]);}}).catch(()=>{if(active)setError('No se pudieron cargar los clientes de este portal.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[target?.id,portal]);
  async function action(action:string,id:string,clientId?:string){
    setBusy(true);setError('');
    try{
      await portalClient.changeCollaboration({action,admin_id:id,...(clientId?{portal,client_id:clientId}:{})});
      if(action==='share')setShared(current=>[...new Set([...current,clientId!])]);
      else if(action==='unshare')setShared(current=>current.filter(value=>value!==clientId));
      else await refresh();
      if(action==='tutorial')notify('Tutorial activado para el próximo acceso a cada área autorizada');
    }catch{setError('No se pudo completar la acción. Revisa el vínculo y vuelve a intentarlo.');}
    finally{setBusy(false);}
  }
  const visible=clients.filter(client=>`${client.nombre||''} ${client.apellidos||''} ${client.email||''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="panel admin-collaboration" data-admin-tour="collaboration">
    <div className="panel-heading"><div><h2><Link2 size={19}/> Administradores vinculados</h2><p>Cada PRO gestiona sus vínculos. Compartir un cliente conserva su responsable y su calendario.</p></div><Button variant="outline" disabled={busy} onClick={()=>void refresh()}>Actualizar</Button></div>
    {error&&<p role="alert" className="collaboration-error">{error}</p>}
    {loading&&!target?<p role="status">Cargando vínculos…</p>:<div className="collaboration-list">{users.filter(user=>!user.is_pro).map(user=>{
      const mine=links.some(link=>link.admin_id===user.id&&link.pro_admin_id===actor.id);
      const owners=links.filter(link=>link.admin_id===user.id).map(link=>users.find(item=>item.id===link.pro_admin_id)).filter(Boolean) as PortalAccessUser[];
      return <article key={user.id}><div><strong>{label(user)}</strong><p>{owners.length?`Vinculado a ${owners.map(label).join(', ')}`:'Sin vínculos PRO'}</p></div>
        {pro&&<div className="collaboration-actions">{mine?<><Button variant="outline" disabled={busy} onClick={()=>{setPortal('portal');setTarget(user);}}><Users size={16}/>Compartir clientes</Button><Button variant="outline" disabled={busy} onClick={()=>{if(window.confirm(`¿Activar el tutorial obligatorio para ${label(user)}? Se repetirá en su próximo acceso a cada portal autorizado.`))void action('tutorial',user.id);}}><GraduationCap size={16}/>Activar tutorial</Button><Button variant="outline" disabled={busy} onClick={()=>{if(window.confirm(`¿Desvincular a ${label(user)} de tu perfil? Perderá tus asignaciones compartidas y dejará de recibir sus notas. Sus clientes propios y sus otros vínculos se conservan.`))void action('unlink',user.id);}}><Unlink size={16}/>Desvincular de mí</Button></>:<Button variant="outline" disabled={busy} onClick={()=>void action('link',user.id)}><Link2 size={16}/>Vincular a mí</Button>}</div>}
      </article>;
    })}{!users.some(user=>!user.is_pro)&&<p>No hay administradores para vincular.</p>}</div>}
    {target&&<div className="modal-backdrop"><section className="panel collaboration-dialog" role="dialog" aria-modal="true" aria-labelledby="share-client-title"><div className="panel-heading"><div><h2 id="share-client-title">Compartir clientes con {label(target)}</h2><p>Solo aparecen tus clientes. Cada cambio se guarda al pulsar.</p></div><button aria-label="Cerrar clientes compartidos" onClick={()=>setTarget(null)}><X/></button></div>
      <label>Portal<select aria-label="Portal de clientes compartidos" value={portal} onChange={event=>setPortal(event.target.value)} disabled={busy}><option value="portal">Portal del Alumno</option><option value="robinjr">RobinJr</option><option value="community">Robin Community</option></select></label>
      <input aria-label="Buscar clientes para compartir" placeholder="Buscar por nombre o email…" value={query} onChange={event=>setQuery(event.target.value)}/>
      {error&&<p role="alert" className="collaboration-error">{error}</p>}
      <div className="collaboration-clients">{loading?<p role="status">Cargando clientes…</p>:visible.map(client=><div key={client.id}><span><strong>{[client.nombre,client.apellidos].filter(Boolean).join(' ')||client.email}</strong><small>{client.email} · Responsable: tú</small></span><Button variant="outline" disabled={busy} onClick={()=>void action(shared.includes(client.id)?'unshare':'share',target.id,client.id)}>{shared.includes(client.id)?'Retirar acceso compartido':'Compartir'}</Button></div>)}{!loading&&!visible.length&&<p>No hay clientes propios que coincidan en este portal.</p>}</div>
      <p className="collaboration-hint">El vinculado podrá gestionar el expediente y consultar su historial. Recibirá por correo las nuevas notas de tus llamadas con este cliente. La consulta global seguirá disponible al retirar el acceso de gestión.</p>
      <Button variant="outline" onClick={()=>setTarget(null)}>Cerrar</Button>
    </section></div>}
  </section>;
}
