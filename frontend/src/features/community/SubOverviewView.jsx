import { Badge, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { COMMUNITY_TYPE_LABELS } from "../../shared/constants.js";
import { CalendarCheck, Tag, Users } from "lucide-react";
import { EVENT_TAB_TYPES } from "./EVENT_TAB_TYPES.js";
import { NAVY } from "../../shared/theme.js";
import React from "react";
import { cityVisible } from "./cityVisible.js";
import { formatDate } from "../../shared/utils.js";

function SubOverviewView({ events = [], partners = [], ciudad, setTab }) {
  const now = Date.now();
  const inCity = (e) => cityVisible(e, ciudad, false);
  const upcomingEvents = events
    .filter((e) => EVENT_TAB_TYPES.includes(e.type) && inCity(e))
    .filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0))
    .slice(0, 3);
  const groups = events.filter((e) => e.type === "group" && inCity(e)).slice(0, 3);
  const perks = events
    .filter((e) => e.type === "announcement" && (!e.expires_at || new Date(e.expires_at).getTime() >= now) && inCity(e))
    .slice(0, 3);

  const empty = upcomingEvents.length === 0 && groups.length === 0 && perks.length === 0;

  return (
    <div className="space-y-5">
      {empty && (
        <Card><CardContent className="py-8 text-center text-sm text-slate-400">
          Todavía no hay contenido para tu ciudad. En cuanto el equipo publique eventos, grupos o perks, aparecerán aquí.
        </CardContent></Card>
      )}

      <Card>
        <CardHeader title="Eventos para ti" subtitle={ciudad ? `Personalizado para ${ciudad}` : undefined} icon={CalendarCheck}
          right={<button onClick={() => setTab("eventos")} className="text-xs font-semibold" style={{ color: NAVY }}>Ver todos</button>} />
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 && <div className="text-sm text-slate-400">No hay eventos próximos por ahora.</div>}
          {upcomingEvents.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{e.title}</div>
                <div className="text-xs text-slate-400">{formatDate(e.starts_at)} · {e.location || "Por confirmar"}</div>
              </div>
              <Badge tone={(COMMUNITY_TYPE_LABELS[e.type] || {}).tone || "slate"}>{(COMMUNITY_TYPE_LABELS[e.type] || {}).label || e.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Grupos para ti" subtitle="Conecta con miembros de tu ciudad" icon={Users}
            right={<button onClick={() => setTab("grupos")} className="text-xs font-semibold" style={{ color: NAVY }}>Ver todos</button>} />
          <CardContent className="space-y-2.5">
            {groups.length === 0 && <div className="text-sm text-slate-400">Aún no hay grupos para tu ciudad.</div>}
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{g.title}</div>
                  <div className="text-xs text-slate-400">{g.city || "Nacional"}{g.meta && g.meta.members ? ` · ${g.meta.members} miembros` : ""}</div>
                </div>
                {g.meta && g.meta.category && <Badge tone="navy">{g.meta.category}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Perks para ti" subtitle="Ventajas y descuentos para miembros" icon={Tag}
            right={<button onClick={() => setTab("ofertas")} className="text-xs font-semibold" style={{ color: NAVY }}>Ver todos</button>} />
          <CardContent className="space-y-2.5">
            {perks.length === 0 && <div className="text-sm text-slate-400">No hay perks activos ahora mismo.</div>}
            {perks.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-100 p-3">
                <div className="text-sm font-semibold text-slate-800">{(o.meta && o.meta.partner) || o.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.title}</div>
                <div className="text-[11px] mt-2 flex items-center gap-2">
                  {o.meta && o.meta.tag && <Badge tone="gold">{o.meta.tag}</Badge>}
                  {o.expires_at && <span className="text-slate-400">Hasta {formatDate(o.expires_at)}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { SubOverviewView };
