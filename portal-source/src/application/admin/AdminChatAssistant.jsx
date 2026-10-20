import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, UploadCloud } from "lucide-react";
import { Btn } from "../../ui.jsx";
import { NAVY, NAVY_DARK } from "../../theme.js";
import { adminAssistant, adminHistorialAdd } from "../../api.js";

export function AdminChatAssistant({ user, activeClientId, clients, mascot }) {
  const [mode, setMode] = useState("closed"); // 'closed' | 'panel' | 'full'
  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: "Hola 👋 Soy el asistente de tu panel. Pregúntame por un alumno (\"¿En qué fase está Lucía?\"), pagos, documentos, carreras, o dudas sobre universidades en Holanda. También puedes pegar notas de una reunión y las añadiré al historial." },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [notesUserId, setNotesUserId] = useState(activeClientId || "");
  const [notesTitle, setNotesTitle] = useState("");
  const [notesBusy, setNotesBusy] = useState(false);
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const launcherRef = useRef(null);
  const focusedClient = clients.find(c => c.id === activeClientId);
  const contextLabel = focusedClient ? `${focusedClient.nombre} ${focusedClient.apellidos || ""} · ID: ${focusedClient.lead_id || focusedClient.id}` : "Vista general · Tus clientes asignados";
  useEffect(() => {
    if (mode === "closed") return;
    panelRef.current?.querySelector("button")?.focus();
    function escape(event) { if (event.key === "Escape") setMode("closed"); }
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("keydown", escape); launcherRef.current?.focus(); };
  }, [mode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, mode]);

  async function send() {
    const t = draft.trim();
    if (!t || busy) return;
    setError("");
    const next = [...messages, { role: "user", content: t }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await adminAssistant(next.map((m) => ({ role: m.role, content: m.content })), activeClientId || null);
      setMessages([...next, { role: "assistant", content: res.reply || "Sin respuesta." }]);
    } catch (e) {
      setError(e.message || "Error en la IA.");
      setMessages([...next, { role: "assistant", content: "(error al contactar el asistente)" }]);
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!notesUserId || !notesText.trim()) {
      setError("Selecciona alumno y pega notas.");
      return;
    }
    setNotesBusy(true); setError("");
    try {
      const res = await adminHistorialAdd({
        user_id: notesUserId,
        raw_notes: notesText,
        meeting_title: notesTitle || "Reunión",
        meeting_date: new Date().toISOString().slice(0, 10),
      });
      setNotesText(""); setNotesTitle("");
      setNotesOpen(false);
      setMessages((m) => [
        ...m,
        { role: "user", content: `(Pegué notas de reunión para ${(clients.find(c=>c.id===notesUserId) || {}).nombre || "alumno"})` },
        { role: "assistant", content: "Historial actualizado ✅\n\n" + (res.historial || "").slice(0, 600) + ((res.historial || "").length > 600 ? "…" : "") },
      ]);
    } catch (e) {
      setError(e.message || "Error guardando historial.");
    } finally {
      setNotesBusy(false);
    }
  }

  // ---------- COLLAPSED ----------
  if (mode === "closed") {
    return (
      <button ref={launcherRef} aria-label="Abrir asistente del equipo" aria-haspopup="dialog"
        onClick={() => setMode("panel")}
        className="admin-assistant-launcher">
        <span>Tu copiloto de equipo</span><img src={mascot} alt="" />
      </button>
    );
  }

  const isFull = mode === "full";
  const panelClass = isFull
    ? "fixed inset-4 z-50"
    : "fixed bottom-5 left-5 z-40 w-[400px] max-w-[95vw] h-[560px] max-h-[80vh]";

  return (
    <div ref={panelRef} role="dialog" aria-label="Asistente del equipo Robin" className={`${panelClass} ${isFull ? "" : "admin-assistant-panel"}`}>
      <div className="h-full w-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
          <img src={mascot} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Copiloto del equipo</div>
            <div className="text-[11px] text-white/80 break-words">
              {contextLabel}
            </div>
          </div>
          <button onClick={() => setNotesOpen((v) => !v)}
            title="Pegar notas de reunión"
            className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-white/10">
            <UploadCloud className="h-3.5 w-3.5 inline-block mr-1" /> Notas
          </button>
          <button onClick={() => setMode(isFull ? "panel" : "full")}
            title={isFull ? "Reducir" : "Expandir"}
            className="text-white/80 hover:text-white text-xs px-1.5 py-1 rounded-md hover:bg-white/10">
            {isFull ? "⤢" : "⤡"}
          </button>
          <button onClick={() => setMode("closed")} aria-label="Cerrar asistente del equipo" className="text-white/80 hover:text-white text-xs px-1.5 py-1 rounded-md hover:bg-white/10">✕</button>
        </div>

        {/* Notas panel */}
        {notesOpen && (
          <div className="px-3 py-2 border-b border-slate-100 bg-amber-50/40 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-800">Añadir notas de reunión</div>
            <select aria-label="Alumno destinatario de las notas" disabled={!!activeClientId} value={notesUserId} onChange={(e) => setNotesUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
              <option value="">— Selecciona alumno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellidos} · {c.email}</option>
              ))}
            </select>
            <input value={notesTitle} onChange={(e) => setNotesTitle(e.target.value)}
              placeholder="Título / contexto (ej. 'Sesión orientación carreras')"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
            <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={4}
              placeholder="Pega aquí el resumen o la transcripción de la reunión…"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs resize-none" />
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="primary" onClick={saveNotes} disabled={notesBusy || !notesUserId || !notesText.trim()}>
                {notesBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Resumir y añadir al historial
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setNotesOpen(false); setNotesText(""); }}>Cancelar</Btn>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === "user" ? "text-white" : "bg-white border border-slate-200 text-slate-800"
                }`}
                style={m.role === "user" ? { background: NAVY } : {}}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
              </div>
            </div>
          )}
        </div>

        {error && <div className="px-3 py-1.5 text-[11px] text-rose-700 bg-rose-50 border-t border-rose-100">{error}</div>}

        {/* Input */}
        <div className="border-t border-slate-200 p-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            aria-label="Mensaje al asistente del equipo" placeholder="Pregunta por un alumno, pago, documento…"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white"
          />
          <Btn size="sm" variant="primary" onClick={send} disabled={busy || !draft.trim()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />} Enviar
          </Btn>
        </div>
      </div>
    </div>
  );
}
