import { Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { ChevronLeft, Loader2, MessageCircle, Send } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import React, { useEffect, useRef, useState } from "react";
import { formatDate } from "../../shared/utils.js";
import { messageSend, messagesThread } from "../../api/index.js";

function SubMessageThread({ friend, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const boxRef = useRef(null);

  async function load(scroll) {
    try { const r = await messagesThread(friend.friend_id || friend.id); setMsgs(r.messages || []); }
    catch (_) {}
    finally { setLoading(false); if (scroll) setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, 30); }
  }
  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 8000);
    return () => clearInterval(t);
  }, [friend && (friend.friend_id || friend.id)]);
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs.length]);

  async function send() {
    const body = draft.trim(); if (!body) return;
    setSending(true); setDraft("");
    try { await messageSend(friend.friend_id || friend.id, body); await load(true); } catch (_) { setDraft(body); }
    finally { setSending(false); }
  }
  const meId = null;

  return (
    <Card>
      <CardHeader
        title={friend.name}
        subtitle="Mensajes"
        icon={MessageCircle}
        right={<Btn size="sm" variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4" /> Volver</Btn>} />
      <CardContent>
        <div ref={boxRef} className="h-80 overflow-y-auto space-y-2 pr-1 mb-3">
          {loading && <div className="text-sm text-slate-400 text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
          {!loading && msgs.length === 0 && <div className="text-sm text-slate-400 text-center py-8">Aún no hay mensajes. ¡Saluda a {friend.name}!</div>}
          {msgs.map((m) => {
            const mine = m.recipient_id === (friend.friend_id || friend.id);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "text-white" : "bg-slate-100 text-slate-800"}`}
                  style={mine ? { background: NAVY } : {}}>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`text-[10px] mt-0.5 ${mine ? "text-white/60" : "text-slate-400"}`}>{formatDate(m.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition resize-none" />
          <Btn disabled={sending || !draft.trim()} onClick={send}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Btn>
        </div>
      </CardContent>
    </Card>
  );
}

export { SubMessageThread };
