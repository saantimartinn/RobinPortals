import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CalendarCheck, ExternalLink, Handshake, ImageIcon, MapPin, Percent } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import { PARTNER_CATEGORY_LABELS } from "../../shared/constants.js";
import React, { useState } from "react";

function SubPartners({ partners, loading }) {
  const [cat, setCat] = useState("all");
  const cats = ["all", ...Object.keys(PARTNER_CATEGORY_LABELS)];
  const filtered = cat === "all" ? partners : partners.filter((p) => p.category === cat);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Partners y descuentos" subtitle="Beneficios exclusivos para suscriptores de The Robin Plan" icon={Handshake} />
        <CardContent>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={cat === c ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
                {c === "all" ? "Todos" : PARTNER_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-slate-400 px-2">Cargando partners…</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-slate-400 px-2">No hay partners en esta categoría todavía.</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2.5">
              <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {p.logo_url ? <img src={p.logo_url} alt={`Logo de ${p.name}`} loading="lazy" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" aria-hidden="true" />}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{p.name}</div>
                <Badge tone="slate">{PARTNER_CATEGORY_LABELS[p.category] || p.category}</Badge>
              </div>
              {p.city && <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</div>}
              {p.description && <div className="text-sm text-slate-600">{p.description}</div>}
              {p.benefits && <div className="text-xs text-slate-500"><span className="font-semibold">Beneficios: </span>{p.benefits}</div>}
              {p.discount && <div><Badge tone="gold"><Percent className="h-3 w-3 mr-1 inline" />{p.discount}</Badge></div>}
              {p.eligibility && <div className="text-[11px] text-slate-400">Elegibilidad: {p.eligibility}</div>}
              <div className="flex gap-2 pt-1">
                {p.contact_url && <a href={p.contact_url} target="_blank" rel="noreferrer"><Btn size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> Contactar</Btn></a>}
                {p.booking_url && <a href={p.booking_url} target="_blank" rel="noreferrer"><Btn size="sm"><CalendarCheck className="h-3.5 w-3.5" /> Reservar</Btn></a>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { SubPartners };
