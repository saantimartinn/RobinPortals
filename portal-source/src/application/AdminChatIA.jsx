import "./student-portal.css";
import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, RefreshCw, PauseCircle, Send } from "lucide-react";
import { NAVY } from "../theme.js";
import { Btn, Card, CardContent, CardHeader } from "../ui.jsx";
import { formatTime } from "../client-utils.js";
import { adminChatList, adminChatSend, adminChatResume } from "../api.js";

export function AdminChatIA({ client }) {
  const [messages, setMessages] = useState([]);
  const [aiPaused, setAiPaused] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const scrollToEnd = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };

  async function load(initial) {
    try {
      const r = await adminChatList(client.id);
      setMessages(r.messages || []);
      setAiPaused(!!r.ai_paused);
    } catch (e) {
      if (initial) setError("No se pudo cargar la conversación.");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load(true);
    const t = setInterval(() => load(false), 15000);
    return () => clearInterval(t);
  }, [client.id]);
  useEffect(scrollToEnd, [messages, loading]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true); setError("");
    setDraft("");
    try {
      const r = await adminChatSend(client.id, text);
      setMessages(r.messages || []);
      setAiPaused(!!r.ai_paused);
    } catch (e) {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const r = await adminChatResume(client.id);
      setMessages(r.messages || []);
      setAiPaused(!!r.ai_paused);
    } catch (e) {
      setError("No se pudo devolver el control a la IA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={`Chat IA · ${client.nombre || ""} ${client.apellidos || ""}`.trim()}
        subtitle="Lees la conversación del alumno con la IA. Si escribes, la IA se pausa y atiendes tú." icon={Sparkles} />
      <CardContent>
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
          style={aiPaused
            ? { background: "#FFF7E6", borderColor: "#F5C97B", color: "#8a5a00" }
            : { background: "#EAF7F1", borderColor: "#9FE1CB", color: "#0F6E56" }}>
          <span className="flex items-center gap-2">
            {aiPaused ? <PauseCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {aiPaused ? "La IA está en pausa: le respondes tú al alumno." : "La IA está atendiendo al alumno automáticamente."}
          </span>
          {aiPaused && (
            <Btn size="sm" variant="secondary" onClick={resume} disabled={busy}>
              <RefreshCw className="h-3.5 w-3.5" /> Devolver a la IA
            </Btn>
          )}
        </div>
        <div ref={scrollRef} className="h-96 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3 mb-4">
          {loading && <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>}
          {!loading && messages.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8">El alumno aún no ha escrito nada.</div>
          )}
          {messages.map((m) => {
            const mine = m.role === "advisor";     // perspectiva del asesor
            const isStudent = m.role === "user";
            const label = mine ? "Tú (asesor)" : isStudent ? `${client.nombre || "Alumno"}` : "Asistente IA";
            const avatarBg = mine ? "#0F6E56" : isStudent ? NAVY : "#534AB7";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="h-7 w-7 rounded-full flex-shrink-0 mr-2 grid place-items-center text-white text-xs font-bold" style={{ background: avatarBg }}>
                    {isStudent ? (client.nombre || "A").charAt(0).toUpperCase() : <Sparkles className="h-3.5 w-3.5" />}
                  </div>
                )}
                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
                  style={mine ? { background: "#0F6E56", color: "white" } : { background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                  {!mine && <div className="text-[11px] font-semibold mb-0.5" style={{ color: isStudent ? NAVY : "#534AB7" }}>{label}</div>}
                  <div>{m.content}</div>
                  <div className={`text-[11px] mt-1 ${mine ? "text-white/50" : "text-slate-400"}`}>{formatTime(new Date(m.created_at))}</div>
                </div>
              </div>
            );
          })}
        </div>
        {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
        <div className="flex gap-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2} placeholder="Escribe para intervenir (esto pausa la IA)… (Enter para enviar)"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white transition resize-none" />
          <Btn onClick={send} disabled={!draft.trim() || busy} className="self-end">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Btn>
        </div>
      </CardContent>
    </Card>
  );
}
