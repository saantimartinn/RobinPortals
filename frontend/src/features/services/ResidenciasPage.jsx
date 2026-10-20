// Services feature UI for residencias page; the application shell selects this view.
import { Badge } from "../../shared/ui.jsx";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { ComingSoon } from "./ComingSoon.jsx";
import { GOLD, NAVY, NAVY_DARK } from "../../shared/theme.js";
import { RESIDENCE_PARTNERS } from "../../shared/constants.js";
import React, { useState } from "react";
import { SubIntro } from "./SubIntro.jsx";

function ResidenciasPage({ onBack }) {
  const [sel, setSel] = useState(null);
  if (sel) {
    const r = RESIDENCE_PARTNERS.find((x) => x.id === sel);
    return (
      <ComingSoon title={r ? r.name : "Residencia"} onBack={() => setSel(null)}
        subtitle="Ficha de la residencia — en desarrollo."
        bullets={["Ficha completa con fotos, ubicación, tipos de habitación y precios.", "Contacto y reserva directa desde el portal.", "Opiniones y experiencias de otros miembros Robin."]} />
    );
  }
  return (
    <div className="space-y-5">
      <SubIntro title="Residencias" subtitle="Partners de residencias verificados. Pulsa en cualquiera para ver su ficha." onBack={onBack} />
      <div className="space-y-3">
        {RESIDENCE_PARTNERS.map((r) => (
          <button key={r.id} onClick={() => setSel(r.id)}
            className="w-full text-left rounded-2xl border p-5 flex items-center gap-4 bg-white transition hover:shadow-md"
            style={r.featured ? { borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}` } : { borderColor: "#e2e8f0" }}>
            <div className="h-14 w-14 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: r.featured ? `linear-gradient(135deg, ${GOLD}, #E08600)` : `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-base font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{r.name}</div>
                {r.featured && <Badge tone="gold">Destacado</Badge>}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{r.tagline}</div>
              {r.city && <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {r.city}</div>}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold flex-shrink-0" style={{ color: NAVY }}>
              Ver <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { ResidenciasPage };
