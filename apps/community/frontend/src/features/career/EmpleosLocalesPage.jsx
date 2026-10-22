// Career feature UI for empleos locales page; the application shell selects this view.
import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { Briefcase, ExternalLink } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import React, { useState } from "react";
import { SubIntro } from "../services/SubIntro.jsx";
import { cityVisible } from "../community/cityVisible.js";
import { studentJobUrl } from "../../shared/utils.js";

function EmpleosLocalesPage({ events = [], ciudad = "", onBack }) {
  const [showAll, setShowAll] = useState(false);
  const jobs = events
    .filter((e) => e.type === "job" && (e.active === undefined || e.active))
    .filter((e) => cityVisible(e, ciudad, showAll))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return (
    <div className="space-y-5">
      <SubIntro title="Empleos Locales" subtitle="Ofertas de empleo compatibles con tus estudios, cerca de ti." onBack={onBack} />

      <Card>
        <CardHeader title="Ofertas para ti" subtitle="Publicadas por Robin y partners" icon={Briefcase} />
        <CardContent className="space-y-3">
          <div className="flex gap-1.5">
            <button onClick={() => setShowAll(false)} className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={!showAll ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
              {ciudad ? `${ciudad} + Nacional` : "Mi ciudad + Nacional"}
            </button>
            <button onClick={() => setShowAll(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={showAll ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
              Todas las ciudades
            </button>
          </div>
          {jobs.length === 0 && <div className="text-sm text-slate-400">No hay ofertas propias para este filtro por ahora. Revisa las de StudentJob abajo.</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            {jobs.map((j) => {
              const m = j.meta || {};
              return (
                <div key={j.id} className="rounded-xl border border-slate-100 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{j.title}</div>
                    <Badge tone="navy">{j.city || "Nacional"}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{[m.company, m.job_type, m.salary].filter(Boolean).join(" · ")}</div>
                  {j.description && <div className="text-sm text-slate-600 line-clamp-3">{j.description}</div>}
                  {m.url && <a href={m.url.startsWith("http") ? m.url : `https://${m.url}`} target="_blank" rel="noreferrer"><Btn size="sm"><ExternalLink className="h-3.5 w-3.5" /> Aplicar</Btn></a>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">Más ofertas en inglés · StudentJob</div>
            <div className="text-xs text-slate-500">Miles de ofertas para estudiantes internacionales{ciudad ? ` en ${ciudad}` : ""}.</div>
          </div>
          <a href={studentJobUrl(ciudad)} target="_blank" rel="noreferrer" className="flex-shrink-0"><Btn size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> Ver en StudentJob</Btn></a>
        </CardContent>
      </Card>
    </div>
  );
}

export { EmpleosLocalesPage };
