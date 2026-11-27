import { t, useLocale } from "../../../../../packages/i18n/react.jsx";
import { connectNativeSections } from "../../../../../packages/portal-nav/native-sections.js";
// One member layout; product-specific services retain their own access rules.
import { AnimatePresence, motion } from "framer-motion";
import "./subscription-portal.css";
import { BedDouble, Calendar, CreditCard, Handshake, HelpCircle, Home, Settings } from "lucide-react";
import { NotificationPopup } from "../shared/NotificationPopup.jsx";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Btn } from '../shared/ui.jsx';
import { SubHome } from "../features/subscription/SubHome.jsx";
import { serviceRequestsList } from "../api/index.js";
import productAccess from '../../../shared/product-access.cjs';
const SubPayments = lazy(() => import('../features/subscription/SubPayments.jsx').then(module => ({ default: module.SubPayments })));
const SubSupport = lazy(() => import('../features/subscription/SubSupport.jsx').then(module => ({ default: module.SubSupport })));
const SubFaqs = lazy(() => import('../features/subscription/SubFaqs.jsx').then(module => ({ default: module.SubFaqs })));
const ArrivalCalls = lazy(() => import('../features/arrival/ArrivalCalls.jsx').then(module => ({ default: module.ArrivalCalls })));
const ArrivalPayments = lazy(() => import('../features/arrival/ArrivalPayments.jsx').then(module => ({ default: module.ArrivalPayments })));
const ArrivalSettings = lazy(() => import('../features/arrival/ArrivalSettings.jsx').then(module => ({ default: module.ArrivalSettings })));
const ArrivalPartners = lazy(() => import('../features/arrival/ArrivalPartners.jsx').then(module => ({ default: module.ArrivalPartners })));
const { isArrivalOnly, canOpenTab } = productAccess;
const NAV_ITEMS = [
  { key: 'home', label: 'Inicio', icon: Home },
  { key: 'llamadas', label: 'Llamadas', icon: Calendar },
  { key: 'habitacion', label: 'Tu habitación', icon: BedDouble },
  { key: 'partners', label: 'Partners', icon: Handshake },
  { key: 'pagos', label: 'Pagos', icon: CreditCard },
  { key: 'soporte', label: 'Soporte', icon: HelpCircle },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
  { key: 'ajustes', label: 'Ajustes', icon: Settings },
];

function SubscriberShell({ user, onLogout, onUserRefresh }) {
  useLocale();
  const arrival = isArrivalOnly(user);
  const roomDialogRef = useRef(null);
  const navigationRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    if (user.arrival_pack && params.get('payment_attempt')) return 'pagos';
    if (params.get('session_id')) return 'pagos';
    return canOpenTab(user, params.get('tab')) ? params.get('tab') : 'home';
  });
  const active = canOpenTab(user, activeTab) ? activeTab : 'home';
  const setActive = tab => setActiveTab(canOpenTab(user, tab) ? tab : 'home');
  useEffect(() => connectNativeSections({
    items: NAV_ITEMS, active,
    onSelect: key => key === 'habitacion' ? roomDialogRef.current?.showModal() : setActive(key),
  }), [active, user.id]);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    navigationRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState('');
  const clientName = [user.nombre, user.apellidos].filter(Boolean).join(' ') || user.email || user.username || '';
  const productName = user.arrival_pack ? 'Pack Llegada' : user.subscription_plan === 'annual' ? 'Plan Anual' : 'Plan Mensual';

  async function refreshRequests() {
    setLoadingRequests(true); setRequestError('');
    try { const data = await serviceRequestsList(!!user.arrival_pack && !arrival); setRequests(data.requests || []); }
    catch (_) { setRequestError('No se han podido cargar tus solicitudes de soporte.'); }
    finally { setLoadingRequests(false); }
  }
  useEffect(() => { if (active === 'soporte') void refreshRequests(); }, [active, user.id, arrival]);

  return <div className="student-portal arrival-portal">
    {!arrival && <NotificationPopup />}
    <a className="student-skip" href="#subscription-content">{t('Saltar al contenido')}</a>
    <div className="student-layout">
      <nav className="student-sidebar" aria-label={t('Navegación de Robin Community')}>
        <button type="button" className="student-identity w-full text-left" onClick={() => setActive('ajustes')} title={t('Ver tu perfil')}>
          <div className="student-avatar">{user.avatar_url ? <img src={user.avatar_url} alt={t('Tu foto de perfil')} /> : (clientName || 'R').charAt(0).toUpperCase()}</div>
          <div><strong>{user.nombre?.trim() || clientName.split(' ')[0]}</strong><span>{t(productName)}</span></div>
        </button>
        <p className="student-nav-caption">{user.arrival_pack ? t('Tu Pack Llegada') : t('Tu espacio')}</p>
        <div ref={navigationRef} className="student-nav-items">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => <button key={key}
            onClick={() => key === 'habitacion' ? roomDialogRef.current?.showModal() : setActive(key)}
            aria-haspopup={key === 'habitacion' ? 'dialog' : undefined} aria-current={active === key ? 'page' : undefined}
            className={`student-nav-item ${active === key ? 'is-active' : ''}${key === 'pagos' ? ' arrival-management-start' : ''}`}>
            <Icon size={19} /><span>{t(label)}</span>
          </button>)}
        </div>
      </nav>
      <AnimatePresence mode="wait">
        <motion.main key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }} className="student-main" id="subscription-content" tabIndex={-1}>
          <Suspense fallback={<p role="status">{t('Cargando sección…')}</p>}>
          {active === 'home' && <SubHome user={user} setActive={setActive} />}
          {active === 'llamadas' && <ArrivalCalls user={user} onSupport={() => setActive('soporte')} />}
          {active === 'partners' && <ArrivalPartners />}
          {active === 'pagos' && <>{!arrival && <SubPayments user={user} onUserRefresh={onUserRefresh} />}{user.arrival_pack && <ArrivalPayments />}</>}
          {active === 'soporte' && <>
            {loadingRequests && <p role="status">{t('Cargando solicitudes…')}</p>}
            {requestError && <div role="alert"><p>{t(requestError)}</p><Btn variant="secondary" onClick={refreshRequests}>{t('Reintentar')}</Btn></div>}
            <SubSupport requests={requests} onRefresh={refreshRequests} />
          </>}
          {active === 'faqs' && <SubFaqs arrival={arrival} includeArrival={!!user.arrival_pack} />}
          {active === 'ajustes' && <ArrivalSettings user={user} onUserRefresh={onUserRefresh} onLogout={onLogout} />}
          </Suspense>
          <footer className="student-footer"><span>Project Robin</span><span>The world is your campus.</span></footer>
        </motion.main>
      </AnimatePresence>
    </div>
    <dialog ref={roomDialogRef} className="robin-info-dialog" aria-labelledby="arrival-room-title" aria-describedby="arrival-room-message" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="px-6 py-5">
        <h2 id="arrival-room-title" className="text-2xl font-semibold" style={{ fontFamily: 'var(--robin-font-display)' }}>{t('Tu habitación')}</h2>
        <p id="arrival-room-message" className="text-sm leading-relaxed mt-3">{t('Tu habitación aún no está disponible. Te avisaremos en cuanto sea posible.')}</p>
        <div className="flex justify-end mt-5"><Btn onClick={() => roomDialogRef.current?.close()}>{t('Entendido')}</Btn></div>
      </div>
    </dialog>
  </div>;
}

export { SubscriberShell };
