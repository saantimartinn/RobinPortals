import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { Calendar, CheckCircle2, Plane, Users } from "lucide-react";
import { CityFilterBar } from "./CityFilterBar.jsx";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React, { useState } from "react";
import { cityVisible } from "./cityVisible.js";
import { formatDate } from "../../shared/utils.js";

function SubTripsView({ events, ciudad }) {
  const [showAll, setShowAll] = useState(false);
  const trips = events.filter((e) => e.type === "trip" && cityVisible(e, ciudad, showAll));
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Viajes" subtitle="Escapadas y viajes organizados con el grupo Robin" icon={Plane} />
        <CardContent><CityFilterBar ciudad={ciudad} showAll={showAll} setShowAll={setShowAll} /></CardContent>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.length === 0 && <div className="text-sm text-slate-400 px-2">No hay viajes programados para tu ciudad por ahora.</div>}
        {trips.map((t) => {
          const meta = t.meta || {};
          return (
            <Card key={t.id}>
              <CardContent className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                    <Plane className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{t.title}</div>
                    <div className="text-xs text-slate-400">{t.location || t.city || ""}</div>
                  </div>
                </div>
                {t.description && <div className="text-sm text-slate-600">{t.description}</div>}
                <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                  {t.starts_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(t.starts_at)}</span>}
                  {(meta.spots || t.capacity) && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {meta.spots || t.capacity} plazas</span>}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  {meta.price ? <Badge tone="gold">{meta.price}</Badge> : <span />}
                  <Btn size="sm"><CheckCircle2 className="h-3.5 w-3.5" /> Apuntarme</Btn>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { SubTripsView };
