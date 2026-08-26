import { AdminChallengeManager } from "./AdminChallengeManager.jsx";
import { AdminDiscountManager } from "./AdminDiscountManager.jsx";
import { AdminEventManager } from "./AdminEventManager.jsx";
import { AdminMentorManager } from "./AdminMentorManager.jsx";
import { AdminPanelOverview } from "./AdminPanelOverview.jsx";
import { AdminPartnerManager } from "./AdminPartnerManager.jsx";
import { AdminSubNotifications } from "./AdminSubNotifications.jsx";
import { AdminUsers } from "./AdminUsers.jsx";
import { Bell, Briefcase, Building2, CalendarCheck, GraduationCap, Handshake, LayoutDashboard, Loader2, LogOut, Percent, Plane, RefreshCw, Sparkles, Tag, Users } from "lucide-react";
import { Btn } from "../../shared/ui.jsx";
import { CREAM, NAVY, NAVY_DARK } from "../../shared/theme.js";
import React, { useEffect, useState } from "react";
import logoRAzul from "../../assets/logo-r-azul.png";
import { subAdminData } from "../../api/index.js";

function SubscriberAdmin({ user, onLogout }) {
  const [section, setSection] = useState("panel");
  const [data, setData] = useState({ users: [], events: [], partners: [], requests: [], discount_codes: [], notifications: [], challenges: [], submissions: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const d = await subAdminData();
      setData({ users: d.users || [], events: d.events || [], partners: d.partners || [], requests: d.requests || [], discount_codes: d.discount_codes || [], notifications: d.notifications || [], challenges: d.challenges || [], submissions: d.submissions || [] });
    } catch (e) { setErr(e.message || "No se pudieron cargar los datos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const nav = [
    { key: "panel", label: "Panel general", icon: LayoutDashboard },
    { key: "usuarios", label: "Usuarios", icon: Users },
    { key: "eventos", label: "Eventos", icon: CalendarCheck },
    { key: "grupos", label: "Grupos", icon: Users },
    { key: "asociaciones", label: "Asociaciones", icon: Building2 },
    { key: "empleos", label: "Empleos", icon: Briefcase },
    { key: "ofertas", label: "Ofertas", icon: Tag },
    { key: "viajes", label: "Viajes", icon: Plane },
    { key: "mentores", label: "Mentores", icon: GraduationCap },
    { key: "partners", label: "Partners", icon: Handshake },
    { key: "codigos", label: "Códigos", icon: Percent },
    { key: "notificaciones", label: "Notificaciones", icon: Bell },
    { key: "retos", label: "Retos", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <header className="sticky top-0 z-20 border-b border-slate-200/60 backdrop-blur-md bg-white/85">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoRAzul} alt="Robin" className="h-8 w-auto flex-shrink-0" />
            <div className="h-5 w-px bg-slate-200" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">The Robin Plan · Administración</div>
              <div className="text-xs text-slate-500 truncate hidden sm:block">{user.email || user.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /> Recargar</Btn>
            <Btn variant="secondary" size="sm" onClick={onLogout}><LogOut className="h-3.5 w-3.5" /> Salir</Btn>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <nav className="space-y-3 sticky top-14 z-10 -mx-4 px-4 py-2 bg-[#FAF8F0] border-b border-slate-200/60 shadow-sm lg:static lg:top-auto lg:z-auto lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:border-0 lg:shadow-none">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="hidden lg:block px-4 py-4 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
              <div className="text-white text-sm font-semibold">Panel de control</div>
              <div className="text-white/60 text-xs">Portal de suscriptores</div>
            </div>
            <div className="p-2 flex gap-1.5 overflow-x-auto lg:block lg:gap-0 [-ms-overflow-style:none] [scrollbar-width:none]">
              {nav.map(({ key, label, icon: Icon }) => {
                const isAct = section === key;
                return (
                  <button key={key} onClick={() => setSection(key)}
                    className="flex-shrink-0 lg:w-full flex items-center gap-2 lg:gap-2.5 rounded-xl px-3 py-2 text-sm transition whitespace-nowrap"
                    style={isAct ? { background: NAVY, color: "white" } : {}}>
                    <Icon className="h-4 w-4 flex-shrink-0" style={!isAct ? { color: NAVY } : {}} />
                    <span className={`truncate font-medium ${!isAct ? "text-slate-700" : ""}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <main className="space-y-5 min-w-0">
          {loading && <div className="flex items-center gap-2 text-slate-500 text-sm px-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando panel…</div>}
          {err && !loading && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{err}</div>}
          {!loading && !err && (
            <>
              {section === "panel" && <AdminPanelOverview users={data.users} events={data.events} partners={data.partners} requests={data.requests} setSection={setSection} />}
              {section === "usuarios" && <AdminUsers users={data.users} requests={data.requests} onChanged={load} />}
              {section === "eventos" && <AdminEventManager kind="eventos" events={data.events} onChanged={load} />}
              {section === "grupos" && <AdminEventManager kind="grupos" events={data.events} onChanged={load} />}
              {section === "asociaciones" && <AdminEventManager kind="asociaciones" events={data.events} onChanged={load} />}
              {section === "empleos" && <AdminEventManager kind="empleos" events={data.events} onChanged={load} />}
              {section === "ofertas" && <AdminEventManager kind="ofertas" events={data.events} onChanged={load} />}
              {section === "viajes" && <AdminEventManager kind="viajes" events={data.events} onChanged={load} />}
              {section === "mentores" && <AdminMentorManager events={data.events} onChanged={load} />}
              {section === "partners" && <AdminPartnerManager partners={data.partners} onChanged={load} />}
              {section === "codigos" && <AdminDiscountManager codes={data.discount_codes} onChanged={load} />}
              {section === "notificaciones" && <AdminSubNotifications notifications={data.notifications} users={data.users} onChanged={load} />}
              {section === "retos" && <AdminChallengeManager challenges={data.challenges} submissions={data.submissions} onChanged={load} />}
            </>
          )}
          <div className="text-center text-xs text-slate-400 py-2">The Robin Plan · Panel de administración</div>
        </main>
      </div>
    </div>
  );
}

export { SubscriberAdmin };
