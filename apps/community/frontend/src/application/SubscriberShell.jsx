// Shell or navigation module for subscriber shell; local authentication state stays in the application layer.
import { AnimatePresence, motion } from "framer-motion";
import "./subscription-portal.css";
import { Briefcase, CreditCard, HeartHandshake, HelpCircle, Home, MessagesSquare, Settings, Users } from "lucide-react";
import { NotificationPopup } from "../shared/NotificationPopup.jsx";
import { ROBIN_LEVEL_ORDER } from "../shared/constants.js";
import React, { useEffect, useState } from "react";
import { RobinBenefitsPage } from "../features/levels/RobinBenefitsPage.jsx";
import { RobinLevelUpToast } from "../features/levels/RobinLevelUpToast.jsx";
import { SubChallenges } from "../features/community/SubChallenges.jsx";
import { SubCommunity } from "../features/community/SubCommunity.jsx";
import { SubHome } from "../features/subscription/SubHome.jsx";
import { SubPayments } from "../features/subscription/SubPayments.jsx";
import { SubPersonal } from "../features/services/SubPersonal.jsx";
import { SubProfesional } from "../features/career/SubProfesional.jsx";
import { SubProfile } from "../features/profile/SubProfile.jsx";
import { SubSettings } from "../features/profile/SubSettings.jsx";
import { SubSocial } from "../features/community/SubSocial.jsx";
import { SubSupport } from "../features/subscription/SubSupport.jsx";
import { SubFaqs } from "../features/subscription/SubFaqs.jsx";
import { communityEventsList, messagesConversations, partnersList, serviceRequestsList } from "../api/index.js";
import { getRobinLevel, robinLevelDef } from "../shared/utils.js";

function SubscriberShell({ user, onLogout, onUserRefresh }) {
  const initialTab = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("session_id")) return "ajustes";
    } catch (_) {}
    return "home";
  })();
  const [active, setActive] = useState(initialTab);
  const [levelUp, setLevelUp] = useState(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  useEffect(() => {
    let stop = false;
    async function poll() { try { const r = await messagesConversations(); if (!stop) setUnreadMsgs(r.unread_total || 0); } catch (_) {} }
    poll();
    const t = setInterval(poll, 25000);
    return () => { stop = true; clearInterval(t); };
  }, []);
  useEffect(() => {
    try {
      const r = getRobinLevel(user);
      const k = `robin_level_seen_${user.email || user.id || ""}`;
      const seen = localStorage.getItem(k);
      const seenIdx = seen != null && ROBIN_LEVEL_ORDER[seen] != null ? ROBIN_LEVEL_ORDER[seen] : -1;
      if (seenIdx >= 0 && ROBIN_LEVEL_ORDER[r.level] > seenIdx) setLevelUp(r.level);
      localStorage.setItem(k, r.level);
    } catch (_) {}
  }, [user]);
  const [events, setEvents] = useState([]);
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || user.username || "").trim();
  const rdefShell = robinLevelDef(getRobinLevel(user).level);

  async function refreshRequests() {
    try { const r = await serviceRequestsList(); setRequests(r.requests || []); } catch (_) {}
  }
  async function refreshEvents() {
    try { const r = await communityEventsList(); setEvents(r.events || []); } catch (_) {}
  }

  useEffect(() => {
    (async () => {
      try {
        const [ev, pa, rq] = await Promise.all([
          communityEventsList().catch(() => ({ events: [] })),
          partnersList().catch(() => ({ partners: [] })),
          serviceRequestsList().catch(() => ({ requests: [] })),
        ]);
        setEvents(ev.events || []);
        setPartners(pa.partners || []);
        setRequests(rq.requests || []);
      } finally { setLoadingData(false); }
    })();
  }, []);

  const navItems = [
    { key: "home", label: "Inicio", icon: Home },
    { key: "personal", label: "Lifestyle", icon: HeartHandshake },
    { key: "profesional", label: "Career Support", icon: Briefcase },
    { key: "comunidad", label: "Community", icon: Users },
    { key: "social", label: "Social", icon: MessagesSquare },
    { key: "pagos", label: "Pagos", icon: CreditCard },
    { key: "soporte", label: "Soporte", icon: HelpCircle },
    { key: "faqs", label: "FAQs", icon: HelpCircle },
    { key: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="student-portal">
      <NotificationPopup />
      <a className="student-skip" href="#subscription-content">Saltar al contenido</a>
      <div className="student-layout">
        <nav className="student-sidebar" aria-label="Navegación de Robin Community">
          <button type="button" className="student-identity w-full text-left" onClick={() => setActive("perfil")} title="Ver tu perfil">
            <div className="student-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="Tu foto de perfil" /> : (clientName || "R").charAt(0).toUpperCase()}</div>
            <div><strong>{user?.nombre?.trim() || clientName.split(" ")[0]}</strong><span>Miembro {rdefShell.label}</span></div>
          </button>
          <p className="student-nav-caption">Tu espacio</p>
          <div className="student-nav-items">
            {navItems.map(({ key, label, icon: Icon }) => {
              const isAct = active === key;
              return <button key={key} onClick={() => setActive(key)} aria-current={isAct ? "page" : undefined} className={`student-nav-item ${isAct ? "is-active" : ""}`}>
                <Icon size={19} /><span>{label}</span>
                {key === "social" && unreadMsgs > 0 ? <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5">{unreadMsgs}</span> : isAct && <span className="student-nav-dot" />}
              </button>;
            })}
          </div>
          <div className="student-support">
            <span className="student-eyebrow">Vamos contigo</span>
            <h3>Tu vida fuera, un poco más fácil.</h3>
            <p>Servicios, comunidad y apoyo cuando los necesites.</p>
            <button onClick={() => setActive("soporte")}>Pedir ayuda <HelpCircle size={16} /></button>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.main key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }} className="student-main" id="subscription-content" tabIndex={-1}>

            {active === "home" && (
              <SubHome user={user} events={events} partners={partners} requests={requests} setActive={setActive} />
            )}
            {active === "personal" && (
              <SubPersonal requests={requests} onRefresh={refreshRequests} partners={partners} loadingPartners={loadingData} user={user} />
            )}
            {active === "profesional" && (
              <SubProfesional requests={requests} onRefresh={refreshRequests} events={events} ciudad={user.ciudad || ""} user={user} />
            )}
            {active === "comunidad" && (
              <SubCommunity user={user} events={events} partners={partners} loading={loadingData} onRefresh={refreshEvents} />
            )}
            {active === "social" && (
              <SubSocial user={user} onActivity={(n) => setUnreadMsgs(n)} />
            )}
            {active === "pagos" && (
              <SubPayments user={user} />
            )}
            {active === "soporte" && (
              <SubSupport requests={requests} onRefresh={refreshRequests} />
            )}
            {active === "faqs" && <SubFaqs />}
            {active === "perfil" && (
              <SubProfile user={user} onUserRefresh={onUserRefresh} setActive={setActive} />
            )}
            {active === "beneficios" && (
              <RobinBenefitsPage user={user} setActive={setActive} />
            )}
            {active === "acelerar" && (
              <SubChallenges user={user} onUserRefresh={onUserRefresh} onBack={() => setActive("beneficios")} />
            )}
            {active === "ajustes" && (
              <SubSettings user={user} requests={requests} onUserRefresh={onUserRefresh} onLogout={onLogout} />
            )}

            <footer className="student-footer"><span>Project Robin</span><span>The world is your campus.</span></footer>
          </motion.main>
        </AnimatePresence>
      </div>
      {levelUp && <RobinLevelUpToast level={levelUp} onClose={() => setLevelUp(null)} onSee={() => setActive("beneficios")} />}
    </div>
  );
}

export { SubscriberShell };
