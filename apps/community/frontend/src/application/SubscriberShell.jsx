import { t, useLocale } from "../../../../../packages/i18n/react.jsx";
// Shell or navigation module for subscriber shell; local authentication state stays in the application layer.
import { AnimatePresence, motion } from "framer-motion";
import "./subscription-portal.css";
import { BedDouble, Briefcase, Calendar, CreditCard, Handshake, HeartHandshake, HelpCircle, Home, MessagesSquare, Settings, Users } from "lucide-react";
import { NotificationPopup } from "../shared/NotificationPopup.jsx";
import { ROBIN_LEVEL_ORDER } from "../shared/constants.js";
import React, { useEffect, useRef, useState } from "react";
import { Btn } from '../shared/ui.jsx';
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
import productAccess from '../../../shared/product-access.cjs';
import { ArrivalHome } from '../features/arrival/ArrivalHome.jsx';
import { ArrivalCalls } from '../features/arrival/ArrivalCalls.jsx';
import { ArrivalPayments } from '../features/arrival/ArrivalPayments.jsx';
import { ArrivalSettings } from '../features/arrival/ArrivalSettings.jsx';
import { ArrivalPartners } from '../features/arrival/ArrivalPartners.jsx';
const { ARRIVAL_TABS, isArrivalOnly, canOpenTab } = productAccess;

function SubscriberShell({ user, onLogout, onUserRefresh }) {
  useLocale();
  const arrival = isArrivalOnly(user);
  const roomDialogRef = useRef(null);
  const initialTab = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (user.arrival_pack && p.get('payment_attempt')) return 'pagos';
      if (arrival && p.get('tab') && canOpenTab(user, p.get('tab'))) return p.get('tab');
      if (p.get("session_id")) return "ajustes";
    } catch (_) {}
    return "home";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const active = canOpenTab(user, activeTab) ? activeTab : 'home';
  const setActive = tab => setActiveTab(canOpenTab(user, tab) ? tab : 'home');
  const [levelUp, setLevelUp] = useState(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  useEffect(() => {
    if (arrival) return;
    let stop = false;
    async function poll() { try { const r = await messagesConversations(); if (!stop) setUnreadMsgs(r.unread_total || 0); } catch (_) {} }
    poll();
    const timer = setInterval(poll, 25000);
    return () => { stop = true; clearInterval(timer); };
  }, [arrival]);
  useEffect(() => {
    if (arrival) return;
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
  const [dataError, setDataError] = useState('');

  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || user.username || "").trim();
  const rdefShell = robinLevelDef(getRobinLevel(user).level);

  async function refreshRequests() {
    setDataError('');
    try { const r = await serviceRequestsList(!!user.arrival_pack && !arrival); setRequests(r.requests || []); }
    catch (_) { if (arrival) setDataError('No se han podido cargar tus solicitudes de soporte.'); }
  }
  async function refreshEvents() {
    try { const r = await communityEventsList(); setEvents(r.events || []); } catch (_) {}
  }

  useEffect(() => {
    (async () => {
      try {
        const [ev, pa, rq] = await Promise.all([
          arrival ? { events: [] } : communityEventsList().catch(() => ({ events: [] })),
          arrival ? { partners: [] } : partnersList().catch(() => ({ partners: [] })),
          serviceRequestsList(!!user.arrival_pack && !arrival).catch(() => { if (arrival) setDataError('No se han podido cargar tus solicitudes de soporte.'); return { requests: [] }; }),
        ]);
        setEvents(ev.events || []);
        setPartners(pa.partners || []);
        setRequests(rq.requests || []);
      } finally { setLoadingData(false); }
    })();
  }, [arrival]);

  const fullNavItems = [
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
  const callNav = { key: 'llamadas', label: 'Llamadas', icon: Calendar };
  const roomNav = { key: 'habitacion', label: 'Tu habitación', icon: BedDouble };
  const partnerNav = { key: 'partners', label: 'Partners', icon: Handshake };
  const arrivalNavItems = ARRIVAL_TABS.map(key => key === 'llamadas' ? callNav : key === 'partners' ? partnerNav : fullNavItems.find(item => item.key === key));
  const navItems = arrival ? [...arrivalNavItems.slice(0, 2), roomNav, ...arrivalNavItems.slice(2)]
    : user.arrival_pack ? [fullNavItems[0], callNav, roomNav, ...fullNavItems.slice(1)] : fullNavItems;

  return (
    <div className={`student-portal${arrival ? ' arrival-portal' : ''}`}>
      {!arrival && <NotificationPopup />}
      <a className="student-skip" href="#subscription-content">{t("Saltar al contenido")}</a>
      <div className="student-layout">
        <nav className="student-sidebar" aria-label={t("Navegación de Robin Community")}>
          <button type="button" className="student-identity w-full text-left" onClick={() => setActive(arrival ? 'ajustes' : "perfil")} title={t("Ver tu perfil")}>
            <div className="student-avatar">{user.avatar_url ? <img src={user.avatar_url} alt={t("Tu foto de perfil")} /> : (clientName || "R").charAt(0).toUpperCase()}</div>
            <div><strong>{user?.nombre?.trim() || clientName.split(" ")[0]}</strong><span>{arrival ? t('Pack Llegada') : t("Miembro {0}", [rdefShell.label])}</span></div>
          </button>
          <p className="student-nav-caption">{arrival ? t('Tu Pack Llegada') : t('Tu espacio')}</p>
          <div className="student-nav-items">
            {navItems.map(({ key, label, icon: Icon }) => {
              const isAct = active === key;
              return <button key={key} onClick={() => key === 'habitacion' ? roomDialogRef.current?.showModal() : setActive(key)} aria-haspopup={key === 'habitacion' ? 'dialog' : undefined} aria-current={isAct ? "page" : undefined} className={`student-nav-item ${isAct ? "is-active" : ""}${arrival && key === 'pagos' ? ' arrival-management-start' : ''}`}>
                <Icon size={19} /><span>{t(label)}</span>
                {key === "social" && unreadMsgs > 0 && <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5">{unreadMsgs}</span>}
              </button>;
            })}
          </div>
          {!arrival && <div className="student-support">
            <span className="student-eyebrow">{t("Vamos contigo")}</span>
            <h3>{t("Tu vida fuera, un poco más fácil.")}</h3>
            <p>{t("Servicios, comunidad y apoyo cuando los necesites.")}</p>
            <button onClick={() => setActive("soporte")}>{t("Pedir ayuda ")}<HelpCircle size={16} /></button>
          </div>}
        </nav>

        <AnimatePresence mode="wait">
          <motion.main key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }} className="student-main" id="subscription-content" tabIndex={-1}>

            {active === "home" && arrival && <ArrivalHome user={user} setActive={setActive} />}
            {active === 'llamadas' && user.arrival_pack && <ArrivalCalls user={user} />}
            {active === 'partners' && arrival && <ArrivalPartners />}
            {active === "home" && !arrival && (
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
              <>{!arrival && <SubPayments user={user} />}{user.arrival_pack && <ArrivalPayments />}</>
            )}
            {active === "soporte" && (
              <>{arrival && loadingData && <p role="status">{t("Cargando solicitudes…")}</p>}{dataError && <div role="alert"><p>{t(dataError)}</p><button className="underline" onClick={refreshRequests}>{t("Reintentar")}</button></div>}<SubSupport requests={requests} onRefresh={refreshRequests} /></>
            )}
            {active === "faqs" && <SubFaqs arrival={arrival} includeArrival={!!user.arrival_pack} />}
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
              arrival ? <ArrivalSettings user={user} /> : <SubSettings user={user} requests={requests} onUserRefresh={onUserRefresh} onLogout={onLogout} />
            )}

            <footer className="student-footer"><span>Project Robin</span><span>The world is your campus.</span></footer>
          </motion.main>
        </AnimatePresence>
      </div>
      {user.arrival_pack && <dialog ref={roomDialogRef} className="robin-info-dialog" aria-labelledby="arrival-room-title" aria-describedby="arrival-room-message" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className="px-6 py-5">
          <h2 id="arrival-room-title" className="text-2xl font-semibold" style={{ fontFamily: 'var(--robin-font-display)' }}>{t("Tu habitación")}</h2>
          <p id="arrival-room-message" className="text-sm leading-relaxed mt-3">{t("Tu habitación aún no está disponible. Te avisaremos en cuanto sea posible.")}</p>
          <div className="flex justify-end mt-5"><Btn onClick={() => roomDialogRef.current?.close()}>{t("Entendido")}</Btn></div>
        </div>
      </dialog>}
      {levelUp && <RobinLevelUpToast level={levelUp} onClose={() => setLevelUp(null)} onSee={() => setActive("beneficios")} />}
    </div>
  );
}

export { SubscriberShell };
