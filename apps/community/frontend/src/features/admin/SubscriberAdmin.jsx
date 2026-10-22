// Admin feature UI for subscriber admin; the application shell selects this view.
import { AdminChallengeManager } from "./AdminChallengeManager.jsx";
import { AdminDiscountManager } from "./AdminDiscountManager.jsx";
import { AdminEventManager } from "./AdminEventManager.jsx";
import { AdminMentorManager } from "./AdminMentorManager.jsx";
import { AdminPanelOverview } from "./AdminPanelOverview.jsx";
import { AdminPartnerManager } from "./AdminPartnerManager.jsx";
import { AdminSubNotifications } from "./AdminSubNotifications.jsx";
import { AdminUsers } from "./AdminUsers.jsx";
import { AdminFaqManager } from "./AdminFaqManager.jsx";
import { Bell, Briefcase, Building2, CalendarCheck, Database, GraduationCap, Handshake, HelpCircle, LayoutDashboard, Loader2, Percent, Plane, Sparkles, Tag, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { subAdminData } from "../../api/index.js";
import { isDeveloperAdminEmail } from "../../admin-permissions.js";
import { RobinPlanDeveloperDatabase } from "./RobinPlanDeveloperDatabase.jsx";
import "../../application/subscription-portal.css";

function SubscriberAdmin({ applicationIdentity }) {
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
  useEffect(() => {
    const refreshAdminData = () => { load(); };
    window.addEventListener("robin:refresh-subscriptions-admin", refreshAdminData);
    return () => window.removeEventListener("robin:refresh-subscriptions-admin", refreshAdminData);
  }, []);

  const isDeveloper = isDeveloperAdminEmail(applicationIdentity?.email);
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
    { key: "faqs", label: "FAQs", icon: HelpCircle },
    ...(isDeveloper ? [{ key: "database", label: "Base de datos", icon: Database }] : []),
  ];

  return (
    <div className="student-portal subscription-admin">
      <a className="student-skip" href="#subscription-admin-content">Saltar al contenido</a>
      <div className="student-layout">
        <nav className="student-sidebar" aria-label="Navegación de administración">
          <div className="student-identity">
            <div className="student-avatar">A</div>
            <div><strong>Equipo Robin</strong><span>Panel de suscriptores</span></div>
          </div>
          <p className="student-nav-caption">GESTIÓN</p>
          <div className="student-nav-items">
            {nav.map(({ key, label, icon: Icon }) => {
              const isAct = section === key;
              return <button key={key} onClick={() => setSection(key)} aria-current={isAct ? "page" : undefined} className={`student-nav-item ${isAct ? "is-active" : ""}`}>
                <Icon size={19} /><span>{label}</span>{isAct && <span className="student-nav-dot" />}
              </button>;
            })}
          </div>
          <div className="student-support"><span className="student-eyebrow">CONTROL ROBIN</span><h3>Todo el plan, bien organizado.</h3><p>Usuarios, comunidad, partners y contenido desde un mismo espacio.</p></div>
        </nav>

        <main className="student-main" id="subscription-admin-content" tabIndex={-1}>
          <div className="student-page-heading"><span className="student-eyebrow">THE ROBIN PLAN</span><h1>{nav.find((item) => item.key === section)?.label || "Panel general"}</h1></div>
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
              {section === "faqs" && <AdminFaqManager />}
              {section === "database" && isDeveloper && <RobinPlanDeveloperDatabase />}
            </>
          )}
          <footer className="student-footer"><span>PROJECT ROBIN</span><span>Panel de administración</span></footer>
        </main>
      </div>
    </div>
  );
}

export { SubscriberAdmin };
