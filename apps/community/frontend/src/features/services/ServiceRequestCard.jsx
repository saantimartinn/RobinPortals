// Services feature UI for service request card; the application shell selects this view.
import { Badge, Btn, TextareaField } from "../../shared/ui.jsx";
import { Loader2, Send } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React, { useState } from "react";
import { serviceRequestCreate } from "../../api/index.js";

function ServiceRequestCard({ service, requests = [], onRefresh, section }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const Icon = service.icon;
  const already = requests.some((r) => r.service_key === service.key && (r.status === "open" || r.status === "in_progress"));
  async function submit() {
    setSending(true);
    try {
      await serviceRequestCreate({ service_key: service.key, category: section || "servicio", title: `Solicitud: ${service.title}`, details });
      setOpen(false); setDetails("");
      if (onRefresh) await onRefresh();
    } catch (_) {}
    finally { setSending(false); }
  }
  return (
    <div className="rounded-2xl border border-[#DFDED2] bg-[#F6F3E0] p-5 flex flex-col min-h-[150px]">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: NAVY }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-800">{service.title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{service.desc}</div>
        </div>
      </div>
      {already && (
        <div className="flex items-center gap-2 pt-2">
          <Badge tone="amber">Solicitado</Badge>
        </div>
      )}
      <div className="mt-auto pt-3">
        {!open ? (
          <Btn size="sm" variant="secondary" onClick={() => { setOpen(true); setDetails(""); }}>Solicitar</Btn>
        ) : (
          <div className="space-y-2">
            <TextareaField label="Cuéntanos qué necesitas" value={details} onChange={setDetails} rows={3} placeholder="Detalles de tu solicitud..." />
            <div className="flex gap-2">
              <Btn size="sm" disabled={sending} onClick={submit}>{sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { ServiceRequestCard };
