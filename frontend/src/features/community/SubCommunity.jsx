// Community feature UI for sub community; the application shell selects this view.
import { Building2, CalendarCheck, Handshake, Lock, Plane, Sparkles, Tag, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { GOLD } from "../../shared/theme.js";
import { OtrosRobinsCarousel } from "./OtrosRobinsCarousel.jsx";
import { OtrosRobinsPage } from "./OtrosRobinsPage.jsx";
import React, { useState } from "react";
import { RobinLockedNotice } from "../levels/RobinLockedNotice.jsx";
import { SubAssociationsView } from "./SubAssociationsView.jsx";
import { SubEventsView } from "./SubEventsView.jsx";
import { SubGroupsView } from "./SubGroupsView.jsx";
import { SubOffersView } from "./SubOffersView.jsx";
import { SubOverviewView } from "./SubOverviewView.jsx";
import { SubPartners } from "./SubPartners.jsx";
import { SubTripsView } from "./SubTripsView.jsx";
import { robinLockFor } from "../../shared/utils.js";

function SubCommunity({ user, events, partners, loading, onRefresh }) {
  const [tab, setTab] = useState("resumen");
  const [robins, setRobins] = useState(false);
  const ciudad = user.ciudad || "";
  const viajesLock = robinLockFor(user, "trips");
  const tabs = [
    { key: "resumen", label: "Resumen", icon: Sparkles },
    { key: "eventos", label: "Eventos", icon: CalendarCheck },
    { key: "grupos", label: "Grupos", icon: Users },
    { key: "asociaciones", label: "Asociaciones", icon: Building2 },
    { key: "ofertas", label: "Perks", icon: Tag },
    { key: "viajes", label: "Viajes", icon: Plane },
    { key: "partners", label: "Partners", icon: Handshake },
  ];
  if (robins) return <OtrosRobinsPage onBack={() => setRobins(false)} />;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Community" subtitle={ciudad ? `Personalizado para ${ciudad}` : "Resumen, eventos, grupos, perks, viajes y partners"} icon={Users} />
        <CardContent>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={tab === key ? { background: `linear-gradient(135deg, ${GOLD}, #E08600)`, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
                <Icon className="h-3.5 w-3.5" /> {label}
                {key === "viajes" && viajesLock && <Lock className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {tab === "resumen" && <SubOverviewView events={events} partners={partners} ciudad={ciudad} setTab={setTab} />}
      {tab === "eventos" && <SubEventsView events={events} ciudad={ciudad} onRefresh={onRefresh} />}
      {tab === "grupos" && <SubGroupsView events={events} ciudad={ciudad} />}
      {tab === "asociaciones" && <SubAssociationsView events={events} ciudad={ciudad} />}
      {tab === "ofertas" && <SubOffersView events={events} ciudad={ciudad} />}
      {tab === "viajes" && (viajesLock ? <RobinLockedNotice level={viajesLock} label="Viajes" /> : <SubTripsView events={events} ciudad={ciudad} />)}
      {tab === "partners" && <SubPartners partners={partners} loading={loading} />}

      {tab === "resumen" && <OtrosRobinsCarousel onOpen={() => setRobins(true)} />}
    </div>
  );
}

export { SubCommunity };
