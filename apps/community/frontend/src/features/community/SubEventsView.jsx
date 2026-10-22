// Community feature UI for sub events view; the application shell selects this view.
import { Badge, Btn, Card, CardContent } from "../../shared/ui.jsx";
import { COMMUNITY_TYPE_LABELS } from "../../shared/constants.js";
import { Calendar, CheckCircle2, MapPin, Star, Users, XCircle } from "lucide-react";
import { CityFilterBar } from "./CityFilterBar.jsx";
import { EVENT_TAB_TYPES } from "./EVENT_TAB_TYPES.js";
import { NAVY } from "../../shared/theme.js";
import React, { useState } from "react";
import { cityVisible } from "./cityVisible.js";
import { communityRsvp } from "../../api/index.js";
import { formatDate } from "../../shared/utils.js";

function SubEventsView({ events, ciudad, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const evOnly = events.filter((e) => EVENT_TAB_TYPES.includes(e.type) && cityVisible(e, ciudad, showAll));
  const types = ["all", ...EVENT_TAB_TYPES];
  const filtered = filter === "all" ? evOnly : evOnly.filter((e) => e.type === filter);

  async function rsvp(e, status) {
    setBusyId(e.id);
    try { await communityRsvp(e.id, status); await onRefresh(); } catch (_) {}
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {types.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={filter === t ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
                {t === "all" ? "Todos" : (COMMUNITY_TYPE_LABELS[t] || {}).label || t}
              </button>
            ))}
          </div>
          <CityFilterBar ciudad={ciudad} showAll={showAll} setShowAll={setShowAll} />
        </CardContent>
      </Card>

      {filtered.length === 0 && <div className="text-sm text-slate-400 px-2">No hay actividades para tu ciudad por ahora.</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((e) => {
          const t = COMMUNITY_TYPE_LABELS[e.type] || { label: e.type, tone: "slate" };
          return (
            <Card key={e.id}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{e.title}</div>
                  <Badge tone={t.tone}>{t.label}</Badge>
                </div>
                {e.description && <div className="text-sm text-slate-600">{e.description}</div>}
                <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                  {e.starts_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(e.starts_at)}</span>}
                  {(e.city || e.location) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.city || e.location}</span>}
                  {e.capacity && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {e.capacity} plazas</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Btn size="sm" variant={e.my_rsvp === "going" ? "primary" : "secondary"} disabled={busyId === e.id} onClick={() => rsvp(e, "going")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Voy
                  </Btn>
                  <Btn size="sm" variant={e.my_rsvp === "interested" ? "primary" : "secondary"} disabled={busyId === e.id} onClick={() => rsvp(e, "interested")}>
                    <Star className="h-3.5 w-3.5" /> Me interesa
                  </Btn>
                  {e.my_rsvp && (
                    <Btn size="sm" variant="ghost" disabled={busyId === e.id} onClick={() => rsvp(e, "cancelled")}>
                      <XCircle className="h-3.5 w-3.5" /> Quitar
                    </Btn>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { SubEventsView };
