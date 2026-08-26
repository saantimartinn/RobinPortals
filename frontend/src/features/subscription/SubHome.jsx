import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { Briefcase, CalendarCheck, ChevronRight, HeartHandshake, Tag, Users } from "lucide-react";
import { COMMUNITY_TYPE_LABELS, SUB_STATUS_LABELS } from "../../shared/constants.js";
import { EVENT_TAB_TYPES } from "../community/EVENT_TAB_TYPES.js";
import { GOLD, NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import { RobinProgressBar } from "../levels/RobinProgressBar.jsx";
import { cityVisible } from "../community/cityVisible.js";
import { formatDate, getRobinLevel, robinLevelDef } from "../../shared/utils.js";

function SubHome({ user, events, partners, requests, setActive }) {
  const statusInfo = SUB_STATUS_LABELS[user.subscription_status] || SUB_STATUS_LABELS.none;
  const ciudad = user.ciudad || "";
  const now = Date.now();
  const inCity = (e) => cityVisible(e, ciudad, false);
  const isActive = (e) => e.active === undefined || e.active === null || e.active === true;
  const visibleEvents = events.filter((e) => EVENT_TAB_TYPES.includes(e.type) && isActive(e) && inCity(e));
  const upcomingEvents = visibleEvents
    .filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
  const eventsCount = upcomingEvents.length;
  const homeOffers = events.filter((e) => e.type === "announcement" && (!e.expires_at || new Date(e.expires_at).getTime() >= now) && inCity(e));
  const homeGroups = events.filter((e) => e.type === "group" && inCity(e));

  const startRef = user.subscription_started_at || user.created_at;
  const daysAsRobin = startRef ? Math.max(0, Math.floor((now - new Date(startRef).getTime()) / 86400000)) : null;
  const rlevel = getRobinLevel(user);
  const rdef = robinLevelDef(rlevel.level);

  const tiles = [
    { id: "eventos", target: "comunidad", label: "Mis eventos", icon: CalendarCheck, value: eventsCount, hint: "Próximos para ti" },
    { id: "lifestyle", target: "personal", label: "Lifestyle", icon: HeartHandshake, hint: "Trámites, vivienda y bienestar" },
    { id: "career", target: "profesional", label: "Career Support", icon: Briefcase, hint: "Empleo, CV, mentorías, networking" },
    { id: "community", target: "comunidad", label: "Community", icon: Users, hint: "Eventos, grupos y perks" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none select-none">
          <div className="text-[140px] font-black text-white leading-none" style={{ fontFamily: "'Georgia', serif" }}>R</div>
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">The Robin Plan</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-white text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
                {user.subscription_plan === "annual" ? "Plan Anual" : "Plan Mensual"}
              </div>
              <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
            </div>
            <div className="text-white/60 text-sm mt-2">Bienvenido/a a tu portal de suscriptor.</div>
          </div>
          {daysAsRobin != null && (
            <div className="rounded-2xl px-5 py-4 text-center flex-shrink-0 bg-white/10 border border-white/15">
              <div className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">Robin desde hace</div>
              <div className="text-3xl font-bold mt-1" style={{ fontFamily: "'Georgia', serif", color: GOLD }}>{daysAsRobin}</div>
              <div className="text-white/60 text-[11px] uppercase tracking-widest">{daysAsRobin === 1 ? "día" : "días"}</div>
            </div>
          )}
        </div>
        <div className="relative mt-4 pt-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
          <span className="text-xl leading-none">{rdef.emoji}</span>
          <span className="text-white text-sm font-semibold">Nivel <span style={{ color: GOLD }}>{rdef.label}</span></span>
          <div className="flex-1 min-w-[140px]"><RobinProgressBar value={rlevel.progress} light /></div>
          <span className="text-white/70 text-xs">{rlevel.nextLevel ? `Faltan ${rlevel.daysRemaining} ${rlevel.daysRemaining === 1 ? "día" : "días"} para ${robinLevelDef(rlevel.nextLevel).label}` : "Nivel máximo"}</span>
          <Btn size="sm" variant="secondary" onClick={() => setActive("beneficios")}>Ver beneficios</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const orange = t.id === "eventos";
          const bg = orange ? `linear-gradient(135deg, ${GOLD}, #E08600)` : `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})`;
          return (
            <button key={t.id} onClick={() => setActive(t.target)}
              className="rounded-2xl p-5 shadow-sm text-left transition hover:brightness-110 min-h-[140px] flex flex-col justify-between"
              style={{ background: bg }}>
              <div className="flex items-center gap-2 text-white/85 text-[11px] uppercase tracking-wider font-semibold">
                <Icon className="h-4 w-4" style={orange ? {} : { color: GOLD }} /> {t.label}
              </div>
              {t.value !== undefined ? (
                <div className="text-white text-4xl font-bold leading-none" style={{ fontFamily: "'Georgia', serif" }}>{t.value}</div>
              ) : (
                <div className="text-white text-sm font-semibold inline-flex items-center gap-1">Abrir <ChevronRight className="h-4 w-4" style={orange ? {} : { color: GOLD }} /></div>
              )}
              <div className="text-white/60 text-[11px]">{t.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Próximos eventos" subtitle={ciudad ? `Personalizado para ${ciudad}` : undefined} icon={CalendarCheck} right={<button onClick={() => setActive("comunidad")} className="text-xs font-semibold" style={{ color: GOLD }}>Ver todos</button>} />
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 && <div className="text-sm text-slate-400">No hay eventos próximos por ahora.</div>}
            {upcomingEvents.slice(0, 6).map((e) => (
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

        <Card>
          <CardHeader title="Perks & Partners" subtitle="Ventajas para miembros" icon={Tag} right={<button onClick={() => setActive("comunidad")} className="text-xs font-semibold" style={{ color: GOLD }}>Ver todos</button>} />
          <CardContent className="space-y-2.5">
            {homeOffers.length === 0 && <div className="text-sm text-slate-400">No hay perks activos ahora mismo.</div>}
            {homeOffers.slice(0, 6).map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800 truncate">{(o.meta && o.meta.partner) || o.title}</div>
                  {o.meta && o.meta.tag && <Badge tone="gold">{o.meta.tag}</Badge>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{o.title}</div>
                {o.expires_at && <div className="text-[11px] mt-1 text-slate-400">Hasta {formatDate(o.expires_at)}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { SubHome };
