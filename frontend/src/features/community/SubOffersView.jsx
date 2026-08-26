import { Badge, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CityFilterBar } from "./CityFilterBar.jsx";
import { Clock, MapPin, Tag } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React, { useState } from "react";
import { cityVisible } from "./cityVisible.js";
import { formatDate } from "../../shared/utils.js";

function SubOffersView({ events, ciudad }) {
  const [showAll, setShowAll] = useState(false);
  const now = Date.now();
  const offers = events.filter((e) => e.type === "announcement"
    && (!e.expires_at || new Date(e.expires_at).getTime() >= now)
    && cityVisible(e, ciudad, showAll));
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Ofertas" subtitle="Ventajas temporales de nuestros partners. Aprovéchalas antes de que caduquen." icon={Tag} />
        <CardContent><CityFilterBar ciudad={ciudad} showAll={showAll} setShowAll={setShowAll} /></CardContent>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.length === 0 && <div className="text-sm text-slate-400 px-2">No hay ofertas activas para tu ciudad ahora mismo.</div>}
        {offers.map((o) => {
          const meta = o.meta || {};
          const daysLeft = o.expires_at ? Math.ceil((new Date(o.expires_at).getTime() - now) / 86400000) : null;
          return (
            <Card key={o.id}>
              <CardContent className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="font-semibold text-slate-900 truncate" style={{ fontFamily: "'Georgia', serif" }}>{meta.partner || o.title}</div>
                  </div>
                  {meta.tag && <Badge tone="gold">{meta.tag}</Badge>}
                </div>
                <div className="text-sm text-slate-700 font-medium">{o.title}</div>
                {o.description && <div className="text-xs text-slate-500">{o.description}</div>}
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.city || "Nacional"}</span>
                  {o.expires_at && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Hasta {formatDate(o.expires_at)}</span>}
                </div>
                {daysLeft != null && daysLeft <= 14 && (
                  <div><Badge tone="rose">{daysLeft <= 0 ? "Último día" : `Quedan ${daysLeft} días`}</Badge></div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { SubOffersView };
