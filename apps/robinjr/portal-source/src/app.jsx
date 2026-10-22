// Resolves the current session and chooses the student or staff portal.
import React, { useEffect, useState } from "react";
import { loginUrl } from "../../../../packages/portal-nav/links.js";
import { Loader2 } from "lucide-react";

import { isAdminUser } from "./session.js";
import { canAdminSee, firstAllowedAdminUrl } from "./admin-permissions.js";
import { CANVAS } from "./theme.js";
import { reportClientError } from "./client-utils.js";
import { AdminPortal } from "./application/AdminPortal.jsx";
import { PortalShell } from "./application/ApplicationPortals.jsx";
import { CrossPortalNav } from "./application/CrossPortalNav.jsx";
import { ONBOARDING_ORDER, OnboardingNavContext } from "./application/onboarding/onboarding-nav.js";
import {
  OnboardingContract,
  OnboardingDNI,
  OnboardingOrigin,
  OnboardingPayment,
  OnboardingProfile,
} from "./application/onboarding/OnboardingFlow.jsx";
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  exchangeApplicationSession,
  onboardingState,
  paymentsVerify,
} from "./api.js";

function nextOnboardingStep(user) {
  if (!user.requires_onboarding) return null;
  if (!user.origin) return "origin";
  if (!user.dni_completed) return "dni";
  if (!user.contract_signed) return "contract";
  if (!user.profile_completed) return "profile";
  if (!user.pago_completed) return "payment";
  return null;
}

export default function PortalRobin() {
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    needsOnboarding: false,
    onboardingStep: null,
  });
  // A completed onboarding step the user went back to (null: the next pending step).
  const [onboardingOverride, setOnboardingOverride] = useState(null);
  const [active, setActive] = useState("estado");
  const [entryError, setEntryError] = useState("");

  function setAuthenticatedUser(user) {
    const onboardingStep = nextOnboardingStep(user);
    setAuthState({
      loading: false,
      user,
      needsOnboarding: !!onboardingStep,
      onboardingStep,
    });
  }

  useEffect(() => {
    (async () => {
      let ticket = null;
      try {
        const params = new URLSearchParams(window.location.search);
        ticket = params.get("sso_ticket");
        if (ticket) {
          window.history.replaceState({}, "", window.location.pathname);
          await exchangeApplicationSession(ticket);
        }
        setAuthenticatedUser(await apiMe());
      } catch (error) {
        if (ticket || error?.data?.error === "robinjr_account_required" || error?.data?.error === "invalid_ticket" || error?.data?.error === "ambiguous_identity") {
          setEntryError(error?.data?.error === "robinjr_account_required"
            ? "Esta cuenta no tiene usuario en la base de RobinJr."
            : "No se ha podido validar el acceso. Vuelve a iniciar sesión.");
          setAuthState({ loading: false, user: null, needsOnboarding: false, onboardingStep: null });
          return;
        }
        window.location.replace(loginUrl("robinjr"));
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    const refreshPermissions = () => {
      if (document.visibilityState !== "visible") return;
      void apiMe().then((user) => { if (active) setAuthenticatedUser(user); }).catch(() => undefined);
    };
    window.addEventListener("focus", refreshPermissions);
    document.addEventListener("visibilitychange", refreshPermissions);
    return () => { active = false; window.removeEventListener("focus", refreshPermissions); document.removeEventListener("visibilitychange", refreshPermissions); };
  }, []);

  useEffect(() => {
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (_error) { return; }
    const attemptId = params.get("payment_attempt");
    if (!attemptId) return;
    (async () => {
      try { await paymentsVerify({ attemptId }); } catch (error) { reportClientError("optional_operation", error); }
      try { setAuthenticatedUser(await apiMe()); } catch (error) { reportClientError("optional_operation", error); }
      setActive("pagos");
      try { window.history.replaceState({}, "", window.location.pathname); } catch (error) { reportClientError("optional_operation", error); }
    })();
  }, []);

  async function handleLogout() {
    await apiLogout();
    window.location.replace("/portal/logout");
  }

  async function refreshUser() {
    try {
      const user = await apiMe();
      setAuthState((previous) => ({ ...previous, user }));
      return user;
    } catch (_error) {
      return null;
    }
  }

  async function refreshState() {
    const state = await onboardingState();
    const user = await apiMe();
    setAuthState({
      loading: false,
      user,
      needsOnboarding: !!state.requires_onboarding && !!state.next_step,
      onboardingStep: state.next_step,
    });
  }

  if (authState.loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: CANVAS }}>
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando portal…
        </div>
      </div>
    );
  }

  if (!authState.user) return <main className="min-h-screen grid place-content-center gap-4 px-6 text-center text-[#2D3A64]" role="alert"><h1 className="text-2xl font-bold">Acceso a RobinJr</h1><p>{entryError || "Redirigiendo al inicio de sesión común…"}</p>{entryError && <a className="underline" href="/login?next=robinjr">Volver al inicio de sesión</a>}</main>;
  if (isAdminUser(authState.user)) return <>
    <CrossPortalNav current="robinjr" user={authState.user} onLogout={handleLogout} />
    <AdminPortal user={authState.user} />
  </>;

  if (authState.needsOnboarding) {
    // The server says which step is next; the user may go back to any earlier one.
    const furthest = ONBOARDING_ORDER.indexOf(authState.onboardingStep);
    const overrideIndex = ONBOARDING_ORDER.indexOf(onboardingOverride);
    const step = overrideIndex >= 0 && overrideIndex < furthest ? onboardingOverride : authState.onboardingStep;
    const index = ONBOARDING_ORDER.indexOf(step);
    const nav = {
      furthest,
      goTo: (key) => setOnboardingOverride(ONBOARDING_ORDER.indexOf(key) < furthest ? key : null),
      goBack: index > 0 ? () => setOnboardingOverride(ONBOARDING_ORDER[index - 1]) : null,
    };
    // After redoing an earlier step, continue with the one right after it.
    const onDone = async () => { await refreshState(); setOnboardingOverride(ONBOARDING_ORDER[index + 1] || null); };
    const onboardingProps = { user: authState.user, onLogout: handleLogout, onDone };
    const Step = { origin: OnboardingOrigin, dni: OnboardingDNI, contract: OnboardingContract, profile: OnboardingProfile, payment: OnboardingPayment }[step];
    if (Step) return <OnboardingNavContext.Provider value={nav}><Step key={step} {...onboardingProps} /></OnboardingNavContext.Provider>;
  }

  const user = authState.user;
  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || user.username || "").trim();
  return (
    <>
      <CrossPortalNav current="robinjr" user={user} onLogout={handleLogout} />
      <PortalShell
        user={user}
        clientName={clientName}
        onLogout={handleLogout}
        active={active}
        setActive={setActive}
        onUserRefresh={refreshUser}
      />
    </>
  );
}
