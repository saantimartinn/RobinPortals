// Admin workspace module for notifications; AdminPortal composes these views.
import { useMemo, useState, useEffect } from "react";
import { FileText, CheckCircle2, Search, Loader2, AlertCircle, RefreshCw, ChevronDown, Clock, Send, Bell } from "lucide-react";
import { NAVY } from "../../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader, Field, TextareaField } from "../../ui.jsx";
import { statusLabel } from "../documents/document-utils.js";
import { formatDate } from "../../client-utils.js";
import { adminListAllClients, adminNotificationsList, adminNotificationCreate } from "../../api.js";

export function AdminNotificaciones({ adminId, clients }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info"); // 'info' | 'terms'
  const [scope, setScope] = useState("assigned"); // 'assigned' | 'all'
  const [selected, setSelected] = useState(() => new Set());
  const [allClients, setAllClients] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState([]);
  const [loadingSent, setLoadingSent] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [q, setQ] = useState("");

  const pool = scope === "all" ? (allClients || []) : (clients || []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return pool;
    return pool.filter((c) => `${c.nombre || ""} ${c.apellidos || ""} ${c.email || ""} ${c.lead_id || ""}`.toLowerCase().includes(t));
  }, [pool, q]);

  useEffect(() => { reloadSent(); }, []);
  async function reloadSent() {
    setLoadingSent(true);
    try { const r = await adminNotificationsList(); setSent(r.notifications || []); }
    catch (_) { setSent([]); }
    finally { setLoadingSent(false); }
  }

  async function switchScope(next) {
    setScope(next); setSelected(new Set());
    if (next === "all" && allClients === null) {
      setLoadingAll(true);
      try { const r = await adminListAllClients(); setAllClients(r.clients || []); }
      catch (_) { setAllClients([]); }
      finally { setLoadingAll(false); }
    }
  }

  function toggle(id) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAllVisible() {
    const ids = filtered.map((c) => c.id);
    setSelected((s) => {
      const allSel = ids.length && ids.every((id) => s.has(id));
      const n = new Set(s);
      if (allSel) ids.forEach((id) => n.delete(id)); else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  async function submit() {
    setError(""); setFeedback("");
    if (!title.trim()) { setError("Añade un título."); return; }
    if (!content.trim()) { setError("Añade un contenido."); return; }
    if (!selected.size) { setError("Selecciona al menos un cliente."); return; }
    setBusy(true);
    try {
      const r = await adminNotificationCreate({ title: title.trim(), content: content.trim(), type, user_ids: Array.from(selected) });
      setFeedback(`Notificación enviada a ${r.recipients} cliente(s).`);
      setTitle(""); setContent(""); setSelected(new Set());
      await reloadSent();
    } catch (e) {
      setError(e.message || "No se pudo crear la notificación.");
    } finally { setBusy(false); }
  }

  function statusLabel(rec, ntype) {
    if (rec.status === "accepted") return <Badge tone="green">Aceptada</Badge>;
    if (rec.status === "seen") return <Badge tone="blue">Vista</Badge>;
    return <Badge tone="amber">Pendiente</Badge>;
  }

  return (
    <div className="space-y-5">
      {/* Crear notificación */}
      <Card>
        <CardHeader title="Nueva notificación" subtitle="Aparece como pop-up al cliente la próxima vez que inicie sesión" icon={Bell} />
        <CardContent className="space-y-4">
          {/* Tipo */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo de notificación</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => setType("info")}
                className="text-left rounded-xl border px-4 py-3 transition"
                style={type === "info" ? { borderColor: NAVY, background: "#f5f8ff" } : { borderColor: "#e2e8f0" }}>
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800"><Bell className="h-4 w-4" style={{ color: NAVY }} /> Informativa</div>
                <div className="text-xs text-slate-500 mt-1">El cliente solo la lee y confirma. Se muestra una vez.</div>
              </button>
              <button type="button" onClick={() => setType("terms")}
                className="text-left rounded-xl border px-4 py-3 transition"
                style={type === "terms" ? { borderColor: NAVY, background: "#f5f8ff" } : { borderColor: "#e2e8f0" }}>
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800"><FileText className="h-4 w-4" style={{ color: NAVY }} /> Cambio de términos</div>
                <div className="text-xs text-slate-500 mt-1">Implica un cambio en los términos del contrato. El cliente debe aceptarlo y recibe email de confirmación.</div>
              </button>
            </div>
          </div>

          <Field label="Título" value={title} onChange={setTitle} placeholder="p. ej. Actualización de tu proceso" />
          <TextareaField label="Contenido" value={content} onChange={setContent} rows={5}
            placeholder={type === "terms" ? "Describe el cambio en los términos y condiciones que el cliente debe aceptar…" : "Escribe el mensaje que verá el cliente…"} />

          {type === "terms" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800">
              Al ser un cambio de términos, el cliente deberá pulsar <strong>«Acepto los nuevos términos»</strong>. La aceptación queda registrada con fecha y hora y se envía una confirmación por correo (al cliente y al equipo), aplicándose sobre el contrato firmado originalmente.
            </div>
          )}

          {/* Destinatarios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Destinatarios ({selected.size} seleccionado(s))</div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                <button type="button" onClick={() => switchScope("assigned")}
                  className="px-3 py-1 rounded-md text-xs font-medium transition"
                  style={scope === "assigned" ? { background: NAVY, color: "white" } : { color: "#475569" }}>Mis clientes</button>
                <button type="button" onClick={() => switchScope("all")}
                  className="px-3 py-1 rounded-md text-xs font-medium transition"
                  style={scope === "all" ? { background: NAVY, color: "white" } : { color: "#475569" }}>Todos</button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:bg-white transition" />
              </div>
              <button type="button" onClick={toggleAllVisible} className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50" style={{ color: NAVY }}>
                Seleccionar visibles
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {loadingAll && scope === "all" ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando clientes…</div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">No hay clientes.</div>
              ) : filtered.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition">
                    <div className="h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0"
                      style={on ? { background: NAVY, borderColor: NAVY } : { borderColor: "#cbd5e1" }}>
                      {on && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{c.nombre || "—"} {c.apellidos || ""}</div>
                      <div className="text-[11px] text-slate-400 truncate">{c.email || ""}{c.lead_id ? " · " + c.lead_id : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="text-sm text-rose-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
          {feedback && <div className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{feedback}</div>}

          <div className="flex justify-end">
            <Btn variant="primary" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar notificación
            </Btn>
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones enviadas + seguimiento */}
      <Card>
        <CardHeader title="Notificaciones enviadas" subtitle="Estado de lectura y aceptación por cliente" icon={Clock}
          right={<button onClick={reloadSent} className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY }}><RefreshCw className="h-3.5 w-3.5" />Actualizar</button>} />
        <CardContent className="space-y-3">
          {loadingSent ? (
            <div className="py-6 text-center text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando…</div>
          ) : sent.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">Aún no has enviado notificaciones.</div>
          ) : sent.map((n) => {
            const open = expanded === n.id;
            return (
              <div key={n.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setExpanded(open ? null : n.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition">
                  {n.type === "terms" ? <FileText className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} /> : <Bell className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{n.title}</div>
                    <div className="text-[11px] text-slate-400">{formatDate(n.created_at)} · {n.type === "terms" ? "Cambio de términos" : "Informativa"}</div>
                  </div>
                  <Badge tone={n.done >= n.total && n.total > 0 ? "green" : "amber"}>{n.done}/{n.total}</Badge>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2">
                    <div className="text-[13px] text-slate-600 whitespace-pre-wrap mb-2">{n.content}</div>
                    <div className="divide-y divide-slate-100">
                      {(n.recipients || []).map((r) => (
                        <div key={r.user_id} className="flex items-center gap-2 py-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-slate-700 truncate">{r.nombre || "—"} {r.apellidos || ""}</div>
                            <div className="text-[10px] text-slate-400 truncate">{r.email || r.lead_id || ""}</div>
                          </div>
                          {statusLabel(r, n.type)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
