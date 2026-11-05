// Admin workspace module for client management; AdminPortal composes these views.
import { useEffect, useMemo, useState } from "react";
import { Search, Users, Plus, ChevronRight, Loader2, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader } from "../../ui.jsx";
import { ClientAvatar } from "./ClientAvatar.jsx";
import { useDebounced } from "./useDebounced.js";
import { api } from "../../api/core.js";
import { ConvertMentoria } from "./ConvertMentoria.jsx";
import { clientsInFolder, folderPath } from "../../../../../../packages/client-folders/model.mjs";
import "../../../../../../packages/client-folders/folders.css";

function FolderedClients({ clients, totalCount, onSelect, onConverted }) {
  const [data, setData] = useState({ folders: [], items: [] });
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem('robin_client_folder_open'));
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(null);
  useEffect(() => { let active = true; api.get('/api/admin/client-folders').then((result) => { if (active) setData(result); }).catch((cause) => { if (active) setError(cause.message); }); return () => { active = false; }; }, []);
  function open(id) { setSelectedId(id); if (id) sessionStorage.setItem('robin_client_folder_open', id); else sessionStorage.removeItem('robin_client_folder_open'); }
  async function change(payload) {
    setBusy(true); setError('');
    try { await api.post('/api/admin/client-folders', payload); const result = await api.get('/api/admin/client-folders'); setData(result); }
    catch (cause) { setError(cause.message || 'No se pudo guardar la carpeta'); }
    finally { setBusy(false); }
  }
  function drop(event, id) {
    event.preventDefault(); setDragOver(null);
    try { const payload = JSON.parse(event.dataTransfer.getData('application/x-robin-client')); if (payload.source === 'alumno' && clients.some((client) => client.id === payload.id)) void change({ action: 'moveClient', source: 'alumno', clientId: payload.id, folderId: id }); } catch (_) {}
  }
  function dropProps(id) { return { 'data-drop-active': dragOver === (id || 'root') ? 'true' : undefined, onDragOver: (event) => { if (event.dataTransfer.types.includes('application/x-robin-client')) { event.preventDefault(); setDragOver(id || 'root'); } }, onDragLeave: () => setDragOver(null), onDrop: (event) => drop(event, id) }; }
  const folders = data.folders || [];
  const items = data.items || [];
  const children = folders.filter((folder) => folder.parent_id === selectedId).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const visible = clientsInFolder(clients, items, 'alumno', selectedId);
  return <div className="client-folder-browser">
    <div className="client-folder-bar"><nav aria-label="Ruta de carpetas"><button type="button" {...dropProps(null)} onClick={() => open(null)}>Todos los clientes</button>{folderPath(folders, selectedId).map((folder) => <span key={folder.id}><ChevronRight /><button type="button" {...dropProps(folder.id)} onClick={() => open(folder.id)}>{folder.name}</button></span>)}</nav><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) void change({ action: 'create', name: name.trim(), parentId: selectedId }).then(() => setName('')); }}><input aria-label="Nombre de nueva carpeta" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Nueva carpeta" /><button type="submit" disabled={busy || !name.trim()}><FolderPlus />Crear carpeta</button></form></div>
    {error && <p role="alert" className="client-folder-error">{error}</p>}
    <div className="client-folder-tiles">{children.map((folder) => <div className="client-folder-tile" key={folder.id} {...dropProps(folder.id)}><button type="button" className="client-folder-open" onClick={() => open(folder.id)}><Folder /><span>{folder.name}</span><small>{items.filter((item) => item.folder_id === folder.id).length} clientes</small></button><button type="button" title="Renombrar" aria-label={`Renombrar ${folder.name}`} onClick={() => { const value = window.prompt('Nombre de la carpeta', folder.name); if (value?.trim()) void change({ action: 'rename', folderId: folder.id, name: value.trim() }); }}><Pencil /></button><button type="button" title="Eliminar carpeta vacía" aria-label={`Eliminar ${folder.name}`} onClick={() => { if (window.confirm(`¿Eliminar la carpeta vacía «${folder.name}»?`)) void change({ action: 'delete', folderId: folder.id }); }}><Trash2 /></button></div>)}</div>
    <div className="client-folder-client-grid">{visible.map((c) => <div className="client-folder-client" key={c.id} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-robin-client', JSON.stringify({ source: 'alumno', id: c.id })); }}><button onClick={() => onSelect(c)} className="admin-client-row w-full flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition text-left"><ClientAvatar nombre={c.nombre} apellidos={c.apellidos} size="lg" /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-900 truncate">{c.nombre} {c.apellidos}</div><div className="text-xs text-slate-400 truncate">{c.email || c.username} · {c.lead_id}</div>{(c.crm_notes || []).length > 0 && <div className="mt-1 text-xs text-slate-600 truncate">Notas comerciales ({c.crm_notes.length}): {c.crm_notes.at(-1)?.body}</div>}</div><Badge tone={c.requires_onboarding ? 'amber' : 'green'}>{c.requires_onboarding ? 'Registro pendiente' : `Paso ${c.application_phase || 1}`}</Badge><ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" /></button><div className="mt-2"><ConvertMentoria client={c} onConverted={onConverted} /></div></div>)}</div>

    {!children.length && !visible.length && <p className="client-folder-empty">{totalCount === 0 ? 'Aún no tienes clientes asignados.' : 'No hay clientes en esta carpeta o búsqueda.'}</p>}
  </div>;
}

export function AdminClientesList({ clients, totalCount, searchQ, onSearch, onSelect, onConverted, loading, loadError, onOpenAssign }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Tus clientes" subtitle={`${totalCount} cliente(s) asignado(s)`} icon={Users}
          right={
            <div className="flex items-center gap-2">
              <Badge tone="navy">{clients.length} mostrando</Badge>
              <Btn size="sm" variant="secondary" onClick={onOpenAssign}>
                <Plus className="h-3.5 w-3.5" /> Asignar cliente
              </Btn>
            </div>
          }
        />
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre, email, username o Lead ID…"
              aria-label="Buscar en mis clientes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition"
            />
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus clientes…
            </div>
          ) : loadError ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-3 text-center">{loadError}</div>
          ) : <FolderedClients clients={clients} totalCount={totalCount} onSelect={onSelect} onConverted={onConverted} />}
        </CardContent>
      </Card>
    </div>
  );
}

export function AssignClientModal({ adminEmail, list, loading, error, busyId, onAssign, onClose }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const visibles = useMemo(() => {
    const s = (dq || "").trim().toLowerCase();
    if (!s) return list;
    return list.filter((c) => `${c.nombre || ""} ${c.apellidos || ""} ${c.email || ""} ${c.username || ""} ${c.lead_id || ""} ${c.assigned_to || ""}`.toLowerCase().includes(s));
  }, [list, dq]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(15,23,42,0.5)" }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>Asignar cliente</div>
            <div className="text-xs text-slate-500">Selecciona un cliente para asignártelo (assigned_to = {adminEmail})</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email, username, Lead ID o asignado…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition" />
          </div>
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>
          )}
          <div className="max-h-[60vh] overflow-auto space-y-2">
            {loading ? (
              <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : visibles.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-10">Sin resultados.</div>
            ) : visibles.map((c) => {
              const mine = (c.assigned_to || "").toLowerCase() === (adminEmail || "").toLowerCase();
              const other = !!c.assigned_to && !mine;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <ClientAvatar nombre={c.nombre} apellidos={c.apellidos} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {c.nombre || "—"} {c.apellidos || ""}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {c.email || c.username} · {c.lead_id}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {c.assigned_to ? `Asignado a: ${c.assigned_to}` : "Sin asignar"}
                    </div>
                  </div>
                  {mine ? (
                    <Badge tone="green">Tuyo</Badge>
                  ) : (
                    <Btn size="sm" variant={other ? "secondary" : "primary"}
                      onClick={() => onAssign(c.id)} disabled={busyId === c.id}>
                      {busyId === c.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</> : (other ? "Reasignar a mí" : "Asignar")}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
