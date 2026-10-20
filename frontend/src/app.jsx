import { CREAM } from "./shared/theme.js";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SubscriberAdmin } from "./features/admin/SubscriberAdmin.jsx";
import { SubscriberAuthScreen } from "./features/auth/SubscriberAuthScreen.jsx";
import { SubscriberPortal } from "./application/SubscriberPortal.jsx";
import { login as apiLogin, logout as apiLogout, me as apiMe, exchangeApplicationSession, subscriberSignup } from "./api/index.js";
import { isSubscriberAdmin, isSubscriberUser } from "./shared/utils.js";
import { CrossPortalNav } from "./application/CrossPortalNav.jsx";

function PortalRobin() {
  const [state, setState] = useState({ loading: true, user: null });
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
  async function refreshUser() {
    const user = await apiMe();
    setState({ loading: false, user });
    return user;
  }
  async function handleLogin(username, password) {
    await apiLogin(username.trim(), password);
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
  if (state.loading) return <><CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} /><div className="min-h-screen grid place-items-center" style={{ background: CREAM }}><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando portal" /></div></>;
  if (!state.user) return <><CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} /><SubscriberAuthScreen onLogin={handleLogin} onSignup={handleSignup} onBack={() => window.location.assign("/login")} /></>;
  if (isSubscriberAdmin(state.user)) return <><CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} onRefresh={() => window.dispatchEvent(new Event("robin:refresh-subscriptions-admin"))} /><SubscriberAdmin /></>;
  if (isSubscriberUser(state.user)) return <><CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} /><SubscriberPortal user={state.user} onLogout={handleLogout} onUserRefresh={refreshUser} /></>;
  return <><CrossPortalNav current="subscriptions" user={state.user} onLogout={handleLogout} /><div role="alert">Esta cuenta no pertenece a The Robin Plan. <button onClick={handleLogout}>Cerrar sesión</button></div></>;
}

export { PortalRobin };
export default PortalRobin;
