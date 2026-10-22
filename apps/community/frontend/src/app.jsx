// Resolves the local subscriber session and selects the subscriber or admin shell.
import { CANVAS } from "./shared/theme.js";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { loginUrl } from "../../../../packages/portal-nav/links.js";
import { SubscriberAdmin } from "./features/admin/SubscriberAdmin.jsx";
import { SubscriberPortal } from "./application/SubscriberPortal.jsx";
import { logout as apiLogout, me as apiMe, exchangeApplicationSession } from "./api/index.js";
import { isSubscriberAdmin, isSubscriberUser } from "./shared/utils.js";
import { CrossPortalNav } from "./application/CrossPortalNav.jsx";

function PortalRobin() {
  const [state, setState] = useState({ loading: true, user: null });
  const [applicationIdentity, setApplicationIdentity] = useState(null);
  const [checkingAdminPermission, setCheckingAdminPermission] = useState(true);
  useEffect(() => {
    let mounted = true;
    exchangeApplicationSession().then(() => apiMe()).then(user => { if (mounted) setState({ loading: false, user }); })
      .catch(() => { if (mounted) setState({ loading: false, user: null }); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!state.loading && !state.user) window.location.replace(loginUrl("/therobinplan/"));
  }, [state.loading, state.user]);
  useEffect(() => {
    if (!isSubscriberAdmin(state.user)) { setApplicationIdentity(null); setCheckingAdminPermission(false); return undefined; }
    let active = true;
    setCheckingAdminPermission(true);
    const refresh = async () => {
      try {
        const response = await fetch('/portal/api/me', { credentials: 'same-origin', cache: 'no-store' });
        const identity = response.ok ? await response.json() : null;
        if (active) setApplicationIdentity(identity);
      } catch (_error) { if (active) setApplicationIdentity(null); }
      finally { if (active) setCheckingAdminPermission(false); }
    };
    void refresh();
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [state.user?.id]);
  async function refreshUser() {
    const user = await apiMe();
    setState({ loading: false, user });
    return user;
  }
  async function handleLogout() {
    await apiLogout();
    window.location.replace("/portal/logout");
  }
  if (state.loading || (isSubscriberAdmin(state.user) && checkingAdminPermission)) return <div className="min-h-screen grid place-items-center" style={{ background: CANVAS }}><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando portal" /></div>;
  if (!state.user) {
    return <div className="min-h-screen grid place-items-center" style={{ background: CANVAS }}><Loader2 className="h-5 w-5 animate-spin" aria-label="Redirigiendo al acceso común" /></div>;
  }
  if (isSubscriberAdmin(state.user)) return <>
    <CrossPortalNav current="subscriptions" user={applicationIdentity} onLogout={handleLogout} />
    {applicationIdentity?.is_application_admin ? <SubscriberAdmin applicationIdentity={applicationIdentity} /> : <main role="alert" className="min-h-[50vh] grid place-content-center gap-4 px-6 text-center text-[#2D3A64]"><h1 className="text-2xl font-bold">Robin Community no disponible</h1><p>No se ha podido validar la cuenta de administrador.</p><a className="underline" href="/admin">Volver al portal del administrador</a></main>}
  </>;
  if (isSubscriberUser(state.user)) return <>
    <CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} />
    <SubscriberPortal user={state.user} onLogout={handleLogout} onUserRefresh={refreshUser} />
  </>;
  return <div role="alert">Esta cuenta no pertenece a The Robin Plan. <button onClick={handleLogout}>Cerrar sesión</button></div>;
}

export { PortalRobin };
export default PortalRobin;
