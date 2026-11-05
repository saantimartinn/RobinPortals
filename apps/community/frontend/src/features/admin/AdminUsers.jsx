// Admin feature UI for admin users; the application shell selects this view.
import { AdminUserDetail } from "./AdminUserDetail.jsx";
import { Badge, Btn, Card, CardContent, CardHeader, Field, SelectField } from "../../shared/ui.jsx";
import { ChevronRight, Users, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { ROBIN_CITIES, SUB_STATUS_LABELS } from "../../shared/constants.js";
import React, { useEffect, useState } from "react";
import { api } from "../../api/index.js";
import { clientsInFolder, folderPath } from "../../../../../../packages/client-folders/model.mjs";
import "../../../../../../packages/client-folders/folders.css";

function AdminUsers({ users, requests, onChanged }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [openId, setOpenId] = useState(null);
  const [foldersData, setFoldersData] = useState({ folders: [], items: [] });
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem('robin_client_folder_open'));
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [dragOver, setDragOver] = useState(null);
  useEffect(() => { let active = true; api.get('/api/sub-admin/client-folders').then((data) => { if (active) setFoldersData(data); }).catch((error) => { if (active) setFolderError(error.message); }); return () => { active = false; }; }, []);
  function openFolder(id) { setSelectedId(id); if (id) sessionStorage.setItem('robin_client_folder_open', id); else sessionStorage.removeItem('robin_client_folder_open'); }
  async function change(payload) {
    setBusy(true); setFolderError('');
    try { await api.post('/api/sub-admin/client-folders', payload); setFoldersData(await api.get('/api/sub-admin/client-folders')); }
    catch (error) { setFolderError(error.message || 'No se pudo guardar la carpeta'); }
    finally { setBusy(false); }
  }
  function drop(event, id) { event.preventDefault(); setDragOver(null); try { const payload = JSON.parse(event.dataTransfer.getData('application/x-robin-client')); if (payload.source === 'community' && users.some((user) => user.id === payload.id)) void change({ action: 'moveClient', source: 'community', clientId: payload.id, folderId: id }); } catch (_) {} }
  function dropProps(id) { return { 'data-drop-active': dragOver === (id || 'root') ? 'true' : undefined, onDragOver: (event) => { if (event.dataTransfer.types.includes('application/x-robin-client')) { event.preventDefault(); setDragOver(id || 'root'); } }, onDragLeave: () => setDragOver(null), onDrop: (event) => drop(event, id) }; }
  const folders = foldersData.folders || [];
  const items = foldersData.items || [];
  const filtered = clientsInFolder(users
    .filter((u) => !city || String(u.ciudad || "").toLowerCase() === city.toLowerCase())
    .filter((u) => { const t = (q || "").toLowerCase(); return !t || `${u.name} ${u.email}`.toLowerCase().includes(t); }), items, 'community', selectedId);
  const open = users.find((u) => u.id === openId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Usuarios" subtitle={`${users.length} suscriptores`} icon={Users} />
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Buscar" value={q} onChange={setQ} placeholder="Nombre o correo…" />
          <SelectField label="Ciudad" value={city} onChange={setCity} options={ROBIN_CITIES} placeholder="Todas" />
        </CardContent>
      </Card>

      <div className="client-folder-browser">
        <div className="client-folder-bar"><nav aria-label="Ruta de carpetas"><button type="button" {...dropProps(null)} onClick={() => openFolder(null)}>Todos los clientes</button>{folderPath(folders, selectedId).map((folder) => <span key={folder.id}><ChevronRight /><button type="button" {...dropProps(folder.id)} onClick={() => openFolder(folder.id)}>{folder.name}</button></span>)}</nav><form onSubmit={(event) => { event.preventDefault(); if (newName.trim()) void change({ action: 'create', name: newName.trim(), parentId: selectedId }).then(() => setNewName('')); }}><input aria-label="Nombre de nueva carpeta" placeholder="Nueva carpeta" value={newName} maxLength={80} onChange={(event) => setNewName(event.target.value)} /><button type="submit" disabled={busy || !newName.trim()}><FolderPlus />Crear carpeta</button></form></div>
        {folderError && <p role="alert" className="client-folder-error">{folderError}</p>}
        <div className="client-folder-tiles">{folders.filter((folder) => folder.parent_id === selectedId).sort((a, b) => a.name.localeCompare(b.name, 'es')).map((folder) => <div className="client-folder-tile" key={folder.id} {...dropProps(folder.id)}><button type="button" className="client-folder-open" onClick={() => openFolder(folder.id)}><Folder /><span>{folder.name}</span><small>{items.filter((item) => item.folder_id === folder.id).length} clientes</small></button><button type="button" title="Renombrar" aria-label={`Renombrar ${folder.name}`} onClick={() => { const name = window.prompt('Nombre de la carpeta', folder.name); if (name?.trim()) void change({ action: 'rename', folderId: folder.id, name: name.trim() }); }}><Pencil /></button><button type="button" title="Eliminar carpeta vacía" aria-label={`Eliminar ${folder.name}`} onClick={() => { if (window.confirm(`¿Eliminar la carpeta vacía «${folder.name}»?`)) void change({ action: 'delete', folderId: folder.id }); }}><Trash2 /></button></div>)}</div>
      </div>

      {open && <AdminUserDetail u={open} requests={requests} onChanged={onChanged} onClose={() => setOpenId(null)} />}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Ciudad</th><th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Solicitudes</th><th className="px-4 py-3">Eventos</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const st = SUB_STATUS_LABELS[u.subscription_status] || SUB_STATUS_LABELS.none;
                return (
                  <tr key={u.id} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-robin-client', JSON.stringify({ source: 'community', id: u.id })); }} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>{(u.crm_notes || []).length > 0 && <div className="text-xs text-slate-600 truncate max-w-xs">Notas comerciales ({u.crm_notes.length}): {u.crm_notes.at(-1)?.body}</div>}
                    </td>
                    <td className="px-4 py-3">{u.ciudad || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-3">{u.requests_open}<span className="text-slate-300"> / {u.requests_total}</span></td>
                    <td className="px-4 py-3">{u.rsvps_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Btn size="sm" variant="secondary" onClick={() => setOpenId(u.id === openId ? null : u.id)}>
                        {u.id === openId ? "Cerrar" : "Gestionar"} <ChevronRight className="h-3.5 w-3.5" />
                      </Btn>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Sin clientes en esta carpeta o búsqueda.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export { AdminUsers };
