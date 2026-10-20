import { CREAM } from "./shared/theme.js";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SubscriberAdmin } from "./features/admin/SubscriberAdmin.jsx";
import { SubscriberAuthScreen } from "./features/auth/SubscriberAuthScreen.jsx";
import { SubscriberPortal } from "./application/SubscriberPortal.jsx";
import { login as apiLogin, logout as apiLogout, me as apiMe, exchangeApplicationSession, subscriberSignup } from "./api/index.js";
import { isSubscriberAdmin, isSubscriberUser } from "./shared/utils.js";
import { CrossPortalNav } from "./application/CrossPortalNav.jsx";
import { canAdminSee, firstAllowedAdminUrl } from "./admin-permissions.js";

function PortalRobin() {
  const [state, setState] = useState({ loading: true, user: null });
  const [applicationIdentity, setApplicationIdentity] = useState(null);
  const [checkingAdminPermission, setCheckingAdminPermission] = useState(true);
  useEffect(() => {
    let mounted = true;
    apiMe().catch(async error => {
      if (error?.status !== 401) throw error;
      await exchangeApplicationSession();
      return apiMe();
    }).then(user => { if (mounted) setState({ loading: false, user }); })
      .catch(() => { if (mounted) setState({ loading: false, user: null }); });
    return () => { mounted = false; };
  }, []);
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
  async function handleLogin(username, password) {
    await apiLogin(username.trim(), password);
    setCheckingAdminPermission(true);
    return refreshUser();
  }
  async function handleSignup(...args) {
    await subscriberSignup(...args);
    return refreshUser();
  }
  async function handleLogout() {
    await apiLogout();
    setState({ loading: false, user: null });
  }
  if (state.loading || (isSubscriberAdmin(state.user) && checkingAdminPermission)) return <div className="min-h-screen grid place-items-center" style={{ background: CREAM }}><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando portal" /></div>;
  if (!state.user) return <SubscriberAuthScreen onLogin={handleLogin} onSignup={handleSignup} onBack={() => window.location.assign("/login")} />;
  if (isSubscriberAdmin(state.user)) return <>
    <CrossPortalNav current="subscriptions" user={applicationIdentity} onLogout={handleLogout} />
    {canAdminSee(applicationIdentity, 'platform.robin_plan') ? <SubscriberAdmin applicationIdentity={applicationIdentity} /> : <main role="alert" className="min-h-[50vh] grid place-content-center gap-4 px-6 text-center text-[#263b6a]"><h1 className="text-2xl font-bold">The Robin Plan no disponible</h1><p>Tu perfil no tiene acceso a este portal.</p><a className="underline" href={firstAllowedAdminUrl(applicationIdentity)}>Ir a una sección disponible</a></main>}
  </>;
  if (isSubscriberUser(state.user)) return <SubscriberPortal user={state.user} onLogout={handleLogout} onUserRefresh={refreshUser} />;
  return <div role="alert">Esta cuenta no pertenece a The Robin Plan. <button onClick={handleLogout}>Cerrar sesión</button></div>;
}

export { PortalRobin };
export default PortalRobin;
