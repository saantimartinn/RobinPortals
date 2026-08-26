import { Badge, Btn, Card, CardContent, CardHeader, Field, TextareaField } from "../../shared/ui.jsx";
import { Clock, HelpCircle, LifeBuoy, Loader2, Mail, Send } from "lucide-react";
import React, { useState } from "react";
import { SUBSCRIBER_FAQ } from "../../shared/constants.js";
import { formatDate } from "../../shared/utils.js";
import { serviceRequestCreate } from "../../api/index.js";

function SubSupport({ requests, onRefresh }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("soporte");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSending(true);
    try {
      await serviceRequestCreate({ category, title: title.trim(), details });
      setTitle(""); setDetails(""); setSent(true);
      await onRefresh();
      setTimeout(() => setSent(false), 3000);
    } catch (_) {}
    finally { setSending(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Solicitar ayuda" subtitle="Cuéntanos qué necesitas, tu asesor te contactará" icon={LifeBuoy} />
        <CardContent className="space-y-3">
          <Field label="Asunto" value={title} onChange={setTitle} placeholder="¿En qué podemos ayudarte?" />
          <TextareaField label="Detalles" value={details} onChange={setDetails} rows={3} placeholder="Añade contexto o detalles..." />
          {sent && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">Solicitud enviada. Te responderemos pronto.</div>}
          <Btn disabled={sending || !title.trim()} onClick={submit}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar solicitud
          </Btn>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Tus solicitudes" icon={Clock} />
        <CardContent className="space-y-2">
          {requests.length === 0 && <div className="text-sm text-slate-400">Todavía no has enviado ninguna solicitud.</div>}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <div className="text-sm text-slate-800 truncate">{r.title}</div>
                <div className="text-xs text-slate-400">{formatDate(r.created_at)}{r.category ? ` · ${r.category}` : ""}</div>
              </div>
              <Badge tone={r.status === "done" ? "green" : r.status === "in_progress" ? "blue" : "amber"}>
                {r.status === "done" ? "Resuelta" : r.status === "in_progress" ? "En curso" : "Abierta"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Preguntas frecuentes" icon={HelpCircle} />
        <CardContent className="space-y-3">
          {SUBSCRIBER_FAQ.map((f, i) => (
            <div key={i}>
              <div className="text-sm font-semibold text-slate-800">{f.q}</div>
              <div className="text-sm text-slate-500 mt-0.5">{f.a}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Contacto directo" icon={Mail} />
        <CardContent>
          <a href="mailto:hello@project-robin.com"><Btn variant="secondary"><Mail className="h-4 w-4" /> hello@project-robin.com</Btn></a>
        </CardContent>
      </Card>
    </div>
  );
}

export { SubSupport };
