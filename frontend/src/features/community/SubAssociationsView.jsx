import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { Building2, ExternalLink } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import React, { useState } from "react";
import { cityVisible } from "./cityVisible.js";

function SubAssociationsView({ events = [], ciudad }) {
  const [showAll, setShowAll] = useState(false);
  const list = events
    .filter((e) => e.type === "association" && (e.active === undefined || e.active))
    .filter((e) => cityVisible(e, ciudad, showAll));
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Asociaciones" subtitle="Asociaciones de estudiantes y locales para conectar" icon={Building2} />
        <CardContent>
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
        </CardContent>
      </Card>

      {list.length === 0 && <div className="text-sm text-slate-400 px-2">No hay asociaciones para este filtro por ahora.</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((a) => {
          const m = a.meta || {};
          return (
            <Card key={a.id}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{a.title}</div>
                  <Badge tone="navy">{a.city || "Nacional"}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.assoc_type && <Badge tone="slate">{m.assoc_type}</Badge>}
                  {m.university ? <Badge tone="gold">Universitaria</Badge> : <Badge tone="slate">Externa</Badge>}
                </div>
                {a.description && <div className="text-sm text-slate-600">{a.description}</div>}
                {m.url && <a href={m.url.startsWith("http") ? m.url : `https://${m.url}`} target="_blank" rel="noreferrer"><Btn size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> Web de la asociación</Btn></a>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { SubAssociationsView };
