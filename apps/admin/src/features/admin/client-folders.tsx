import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder as FolderIcon, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { clientFolderKey, clientFolders } from "@/services/client-folders";
import type { Folder, FolderSource, FolderState } from "@/services/client-folders";
import "../../../../../packages/client-folders/folders.css";

export type FolderClient = { source: FolderSource; id: string; lead_id?: string | null; name: string; content: React.ReactNode };
const storageKey = "robin_client_folder_open";

export function ClientFolderBrowser({ clients }: { clients: FolderClient[] }) {
  const [state, setState] = useState<FolderState>({ folders: [], items: [] });
  const [currentId, setCurrentId] = useState<string | null>(() => sessionStorage.getItem(storageKey));
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);

  async function refresh() {
    const next = await clientFolders.list();
    setState(next);
    setLoading(false);
    if (currentId && !next.folders.some((folder) => folder.id === currentId)) openFolder(null);
  }
  useEffect(() => { let active = true; clientFolders.list().then((next) => { if (active) { setState(next); setLoading(false); } }).catch((cause) => { if (active) { setError(cause.message); setLoading(false); } }); return () => { active = false; }; }, []);
  function openFolder(id: string | null) { setCurrentId(id); if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); }
  const folderById = useMemo(() => new Map(state.folders.map((folder) => [folder.id, folder])), [state.folders]);
  const path: Folder[] = [];
  for (let folder = currentId ? folderById.get(currentId) : undefined; folder && path.length < 30; folder = folder.parent_id ? folderById.get(folder.parent_id) : undefined) path.unshift(folder);
  const children = state.folders.filter((folder) => folder.parent_id === currentId).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const assigned = new Map(state.items.map((item) => [item.client_key, item.folder_id]));
  const visible = clients.filter((client) => (assigned.get(clientFolderKey(client.source, client)) || null) === currentId);

  async function change(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la carpeta"); }
    finally { setBusy(false); }
  }
  async function submitName(event: React.FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    await change(() => editing ? clientFolders.rename(editing, value) : clientFolders.create(value, currentId));
    setName(""); setEditing(null);
  }
  function beginRename(folder: Folder) { setEditing(folder.id); setName(folder.name); }
  function dragStart(event: React.DragEvent, client: FolderClient) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-robin-client", JSON.stringify({ source: client.source, id: client.id }));
  }
  function drop(event: React.DragEvent, folderId: string | null) {
    event.preventDefault(); setDragOver(null);
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/x-robin-client"));
      if (clients.some((client) => client.source === payload.source && client.id === payload.id)) void change(() => clientFolders.moveClient(payload.source, payload.id, folderId));
    } catch { /* Ignorar archivos y elementos externos. */ }
  }
  function dropProps(id: string | null) {
    const marker = id || "root";
    return {
      "data-drop-active": dragOver === marker ? "true" : undefined,
      onDragOver: (event: React.DragEvent) => { if (event.dataTransfer.types.includes("application/x-robin-client")) { event.preventDefault(); setDragOver(marker); } },
      onDragLeave: () => setDragOver(null),
      onDrop: (event: React.DragEvent) => drop(event, id),
    };
  }

  return <section className="client-folder-browser" aria-label="Carpetas de clientes">
    <div className="client-folder-bar">
      <nav aria-label="Ruta de carpetas"><button type="button" {...dropProps(null)} onClick={() => openFolder(null)}>Todos los clientes</button>{path.map((folder) => <span key={folder.id}><ChevronRight aria-hidden="true" /><button type="button" {...dropProps(folder.id)} onClick={() => openFolder(folder.id)}>{folder.name}</button></span>)}</nav>
      <form onSubmit={(event) => void submitName(event)}><input aria-label={editing ? "Nuevo nombre de carpeta" : "Nombre de nueva carpeta"} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={editing ? "Renombrar carpeta" : "Nueva carpeta"} /><button type="submit" disabled={busy || !name.trim()}><FolderPlus aria-hidden="true" />{editing ? "Guardar" : "Crear carpeta"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setName(""); }}>Cancelar</button>}</form>
    </div>
    {error && <p className="client-folder-error" role="alert">{error}</p>}
    {loading ? <p className="client-folder-empty">Cargando carpetas…</p> : <>
      <div className="client-folder-tiles">{children.map((folder) => <div className="client-folder-tile" key={folder.id} {...dropProps(folder.id)}><button type="button" className="client-folder-open" onClick={() => openFolder(folder.id)}><FolderIcon aria-hidden="true" /><span>{folder.name}</span><small>{state.items.filter((item) => item.folder_id === folder.id).length} clientes</small></button><button type="button" aria-label={`Renombrar ${folder.name}`} title="Renombrar" onClick={() => beginRename(folder)}><Pencil aria-hidden="true" /></button><button type="button" aria-label={`Eliminar ${folder.name}`} title="Eliminar carpeta vacía" onClick={() => { if (window.confirm(`¿Eliminar la carpeta vacía «${folder.name}»?`)) void change(() => clientFolders.remove(folder.id)); }}><Trash2 aria-hidden="true" /></button></div>)}</div>
      <div className="client-folder-client-grid">{visible.map((client) => <div className="client-folder-client" key={`${client.source}:${client.id}`} data-client-source={client.source} data-client-id={client.id} draggable onDragStart={(event) => dragStart(event, client)} title="Arrastra este cliente a una carpeta"><div className="client-folder-client-content">{client.content}</div></div>)}</div>
      {!children.length && !visible.length && <p className="client-folder-empty">Esta carpeta está vacía. Arrastra aquí clientes o crea una subcarpeta.</p>}
    </>}
  </section>;
}
