// Portal view or navigation module for portal assistant; the application shell owns session state.
import { useState, useEffect, useRef } from "react";
import { Shield, Loader2, Sparkles, Send, X, ArrowUpRight, ArrowRight } from "lucide-react";
import { NAVY } from "../theme.js";
import { formatTime } from "../client-utils.js";
import { chatAiList, chatAiSend } from "../api.js";

export function StudentAssistant({ open, onOpenChange, mascot, onOpenFaq }) {
  const launcherRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const panel = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector('button')?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") { event.preventDefault(); onOpenChange(false); }
      if (event.key !== "Tab") return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), textarea, a[href]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; launcherRef.current?.focus(); };
  }, [open, onOpenChange]);
  return <>
    {open && <div className="student-chat-scrim" onClick={() => onOpenChange(false)} aria-hidden="true" />}
    <section ref={dialogRef} hidden={!open} className="student-chat-panel" role="dialog" aria-modal="true" aria-labelledby="robin-assistant-title">
      <header className="student-chat-header"><img src={mascot} alt="" /><div><h2 id="robin-assistant-title">Tu copiloto Robin</h2><p><span />Asistente IA · Tu asesor puede unirse</p></div><button onClick={() => onOpenChange(false)} aria-label="Cerrar asistente"><X size={20} /></button></header>
      <ChatIA active={open} mascot={mascot} onOpenFaq={(number) => { onOpenChange(false); onOpenFaq(number); }} />
    </section>
    <button ref={launcherRef} className="student-chat-launcher" onClick={() => onOpenChange(!open)} aria-label={open ? "Cerrar asistente Robin" : "Abrir asistente Robin"} aria-expanded={open} aria-haspopup="dialog" hidden={open}>
      <span className="student-chat-label"><strong>¿Te echamos una mano?</strong><span>Pregunta a Robin</span></span><span className="student-chat-mascot"><img src={mascot} alt="" /><span className="student-chat-spark"><Sparkles size={12} /></span></span>
    </button>
  </>;
}

export function ChatIA({ active, mascot, onOpenFaq }) {
  const [messages, setMessages] = useState([]);
  const [aiPaused, setAiPaused] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const scrollToEnd = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };

  async function load(initial) {
    try {
      const r = await chatAiList();
      setMessages(r.messages || []);
      setAiPaused(!!r.ai_paused);
    } catch (e) {
      if (initial) setError("No se pudo cargar el chat.");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    if (!active) return;
    load(true);
    const t = setInterval(() => load(false), 15000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(scrollToEnd, [messages, loading]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true); setError("");
    const optimistic = { id: "tmp_" + Date.now(), role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setDraft("");
    try {
      const r = await chatAiSend(text);
      setMessages(r.messages || []);
      setAiPaused(!!r.ai_paused);
    } catch (e) {
      setMessages((m) => m.filter(item => item.id !== optimistic.id));
      setDraft(text);
      setError("No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="student-chat-body">
        {aiPaused && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ background: "#FFF7E6", borderColor: "#F5C97B", color: "#8a5a00" }}>
            <Shield className="h-4 w-4 flex-shrink-0" /> Tu asesor/a está atendiendo esta conversación en persona.
          </div>
        )}
        <div ref={scrollRef} className="student-chat-messages" role="log" aria-label="Conversación con Robin" aria-live="polite" aria-busy={loading}>
          {loading && <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>}
          {!loading && messages.length === 0 && (
            <div className="student-chat-welcome"><img src={mascot} alt="La mascota de Robin" /><span className="student-eyebrow">UN POCO DE AYUDA, UN GRAN PASO</span><h3>¡Hola! Soy tu copiloto.</h3><p>Pregúntame sobre tu proceso, documentos o la vida universitaria.</p><div>{["¿Qué documentos necesito?", "¿Cómo preparo mi llegada?"].map(question => <button key={question} onClick={() => setDraft(question)}>{question}<ArrowUpRight size={15} /></button>)}</div></div>
          )}
          {messages.map((m) => {
            const mine = m.role === "user";
            const isAdvisor = m.role === "advisor";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="h-7 w-7 rounded-full flex-shrink-0 mr-2 grid place-items-center text-white"
                    style={{ background: isAdvisor ? "#0F6E56" : NAVY }}>
                    {isAdvisor ? <Shield className="h-3.5 w-3.5" /> : <img src={mascot} alt="" className="h-7 w-7 rounded-full object-contain bg-white" />}
                  </div>
                )}
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words min-w-0"
                  style={mine ? { background: NAVY, color: "white" } : { background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                  {!mine && <div className="text-[11px] font-semibold mb-0.5" style={{ color: isAdvisor ? "#0F6E56" : NAVY }}>{isAdvisor ? "Tu asesor/a" : "Asistente IA"}</div>}
                  <div>{m.content}</div>
                  {!mine && !isAdvisor && m.faq_citations?.length > 0 && <div className="student-chat-faq-links">{m.faq_citations.map(citation => <button key={citation.number} onClick={() => onOpenFaq(citation.number)} title={citation.question}>FAQ {citation.number}<ArrowRight size={12} /></button>)}</div>}
                  <div className={`text-[11px] mt-1 ${mine ? "text-white/50" : "text-slate-400"}`}>{formatTime(new Date(m.created_at))}</div>
                </div>
              </div>
            );
          })}
          {sending && <div className="student-chat-typing" role="status"><Loader2 size={14} className="animate-spin" />{aiPaused ? "Enviando a tu asesor…" : "Robin está pensando…"}</div>}
        </div>
        {error && <div className="student-chat-error" role="alert">{error}</div>}
        <div className="student-chat-compose">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            rows={2} placeholder="Escribe tu pregunta…" aria-label="Tu mensaje para Robin"
            className="flex-1 min-w-0 resize-none" />
          <button onClick={send} disabled={!draft.trim() || sending || loading} aria-label="Enviar mensaje">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="student-chat-disclaimer">Robin usa IA y puede equivocarse. Confirma lo importante con tu asesor.</p>
    </div>
  );
}
