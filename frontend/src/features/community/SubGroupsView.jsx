import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CityFilterBar } from "./CityFilterBar.jsx";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import { Plus, Users } from "lucide-react";
import React, { useState } from "react";
import { cityVisible } from "./cityVisible.js";

function SubGroupsView({ events, ciudad }) {
  const [showAll, setShowAll] = useState(false);
  const groups = events.filter((e) => e.type === "group" && cityVisible(e, ciudad, showAll));
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Grupos Robin" subtitle="Conecta con otros miembros por ciudad, estudios o intereses" icon={Users} />
        <CardContent><CityFilterBar ciudad={ciudad} showAll={showAll} setShowAll={setShowAll} /></CardContent>
      </Card>
      {groups.length === 0 && <div className="text-sm text-slate-400 px-2">No hay grupos para tu ciudad por ahora.</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const meta = g.meta || {};
          return (
            <Card key={g.id}>
              <CardContent className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{g.title}</div>
                    <div className="text-xs text-slate-400">{g.city || "Nacional"}{meta.members ? ` · ${meta.members} miembros` : ""}</div>
                  </div>
                </div>
                {g.description && <div className="text-sm text-slate-600">{g.description}</div>}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {meta.category ? <Badge tone="navy">{meta.category}</Badge> : <span />}
                  <Btn size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" /> Unirme</Btn>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { SubGroupsView };
