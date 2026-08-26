import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, CreditCard, HeartHandshake, HelpCircle, Home, LogOut, MessagesSquare, Settings, Users } from "lucide-react";
import { Btn } from "../shared/ui.jsx";
import { CREAM, GOLD, NAVY, NAVY_DARK } from "../shared/theme.js";
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
import { communityEventsList, messagesConversations, partnersList, serviceRequestsList } from "../api/index.js";
import { getRobinLevel, robinLevelDef } from "../shared/utils.js";
import logoRAzul from "../assets/logo-r-azul.png";
import logoRBlanco from "../assets/logo-r-blanco.png";

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
    { key: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <NotificationPopup />
      <header className="sticky top-0 z-20 border-b border-slate-200/60 backdrop-blur-md bg-white/85">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoRAzul} alt="Robin" className="h-8 w-auto flex-shrink-0" />
            <div className="h-5 w-px bg-slate-200" />
            <button type="button" onClick={() => setActive("perfil")} className="min-w-0 text-left" title="Editar tu perfil">
              <div className="text-sm font-semibold text-slate-900 truncate hover:underline">The Robin Plan · {clientName}</div>
              <div className="text-xs text-slate-500 truncate hidden sm:block">{user.email || user.username}</div>
            </button>
          </div>
          <Btn variant="secondary" onClick={onLogout} size="sm"><LogOut className="h-3.5 w-3.5" /> Salir</Btn>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <nav className="space-y-3 sticky top-14 z-10 -mx-4 px-4 py-2 bg-[#FAF8F0] border-b border-slate-200/60 shadow-sm lg:static lg:top-auto lg:z-auto lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:border-0 lg:shadow-none">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setActive("perfil")} title="Ver tu perfil"
              className="hidden lg:block w-full text-left px-4 py-4 border-b border-slate-100 transition hover:brightness-110" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl overflow-hidden border-2 border-white/20 flex-shrink-0 grid place-items-center bg-white/10">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-white font-bold text-sm">{(clientName || "R").charAt(0).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{clientName}</div>
                  <div className="text-white/60 text-xs truncate">Miembro <span className="font-semibold" style={{ color: GOLD }}>{rdefShell.label}</span></div>
                </div>
              </div>
            </button>
            <div className="p-2 flex gap-1.5 overflow-x-auto lg:block lg:gap-0 [-ms-overflow-style:none] [scrollbar-width:none]">
              {navItems.map(({ key, label, icon: Icon }) => {
                const isAct = active === key;
                return (
                  <button key={key} onClick={() => setActive(key)}
                    className="flex-shrink-0 lg:w-full flex items-center gap-2 lg:gap-2.5 rounded-xl px-3 py-2 text-sm transition whitespace-nowrap"
                    style={isAct ? { background: NAVY, color: "white" } : {}}>
                    <Icon className="h-4 w-4 flex-shrink-0" style={!isAct ? { color: NAVY } : {}} />
                    <span className={`truncate font-medium ${!isAct ? "text-slate-700" : ""}`}>{label}</span>
                    {key === "social" && unreadMsgs > 0 && <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5 leading-none flex-shrink-0">{unreadMsgs}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="hidden lg:flex rounded-2xl p-4 items-center gap-3" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
            <img src={logoRBlanco} alt="Robin" className="h-10 w-auto flex-shrink-0" />
            <div>
              <div className="text-white text-xs font-semibold">The Robin Plan</div>
              <div className="text-white/50 text-[11px] mt-0.5">Tu compañero en el extranjero</div>
            </div>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.main key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }} className="space-y-5 min-w-0">

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

            <div className="text-center text-xs text-slate-400 py-2">The Robin Plan · Portal de suscriptores</div>
          </motion.main>
        </AnimatePresence>
      </div>
      {levelUp && <RobinLevelUpToast level={levelUp} onClose={() => setLevelUp(null)} onSee={() => setActive("beneficios")} />}
    </div>
  );
}

export { SubscriberShell };
