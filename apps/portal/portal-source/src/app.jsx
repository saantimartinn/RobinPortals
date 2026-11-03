// Resolves the current session and chooses the student or staff portal.
import React, { useEffect, useRef, useState } from "react";
import { loginUrl, ROBIN_LINKS } from "../../../../packages/portal-nav/links.js";
import { AlertCircle, Loader2 } from "lucide-react";
import robinWordmark from "./assets/robin-wordmark.png";
import robinJrArt from "../../../../packages/brand/assets/robin-jr.svg";
import robinStudentArt from "../../../../packages/brand/assets/robin-student.svg";
import robinCommunityArt from "../../../../packages/brand/assets/robin-community.svg";
import "./login.css";
import { SupportDialogs } from "./support/SupportDialogs.jsx";
import { RecoveryRequest, ResetPasswordScreen } from "./support/PasswordRecovery.jsx";

import { isAdminUser } from "./session.js";
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
  issueSsoTicket,
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
  const [subscriptionAccess, setSubscriptionAccess] = useState(false);
  const [checkingSubscriptionAccess, setCheckingSubscriptionAccess] = useState(false);
  const [subscriptionAccessResolved, setSubscriptionAccessResolved] = useState(false);
  const [entryNotice, setEntryNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [resetToken] = useState(() => {
    try { return new URLSearchParams(window.location.hash.slice(1)).get("reset"); } catch (_) { return null; }
  });
  const landingHandled = useRef(false);

  useEffect(() => {
    if (!resetToken) return;
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, [resetToken]);

  useEffect(() => {
    const user = authState.user;
    if (resetToken || !user || isAdminUser(user) || user.auth_source === "external_client") return;
    try {
      if (!window.localStorage.getItem(`robin_portal_update_notice_2026:${user.id}`)) setIntroOpen(true);
    } catch (_) { setIntroOpen(true); }
  }, [authState.user?.id, resetToken]);

  function dismissIntro() {
    try { window.localStorage.setItem(`robin_portal_update_notice_2026:${authState.user?.id}`, "seen"); } catch (_) {}
    setIntroOpen(false);
  }

  function withSupport(content, floatingButton = false) {
    return <>
      {content}
      {floatingButton && <button className="robin-report-floating" type="button" onClick={() => setReportOpen(true)}><AlertCircle size={17} /> Reportar problema</button>}
      <SupportDialogs
        user={authState.user}
        reportOpen={reportOpen}
        onCloseReport={() => setReportOpen(false)}
        introOpen={introOpen}
        onCloseIntro={dismissIntro}
        onOpenReport={() => { if (introOpen) dismissIntro(); setReportOpen(true); }}
      />
    </>;
  }

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
    if (window.location.pathname.replace(/\/+$/, "") === "/portal/logout") {
      (async () => {
        try { await fetch("/therobinplan/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch (_) {}
        try { await apiLogout(); } catch (_) {}
        window.location.replace(loginUrl());
      })();
      return undefined;
    }
    (async () => {
      try {
        setAuthenticatedUser(await apiMe());
      } catch (_error) {
        setAuthState({ loading: false, user: null, needsOnboarding: false, onboardingStep: null });
      }
    })();
  }, []);

  useEffect(() => {
    if (!authState.user || isAdminUser(authState.user)) {
      setSubscriptionAccess(false);
      setCheckingSubscriptionAccess(false);
      setSubscriptionAccessResolved(!!authState.user);
      return undefined;
    }
    let mounted = true;
    setCheckingSubscriptionAccess(true);
    setSubscriptionAccessResolved(false);
    (async () => {
      let allowed = false;
      try {
        const sso = await fetch("/therobinplan/api/auth/sso", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
        });
        if (sso.ok) {
          const response = await fetch("/therobinplan/api/me", { credentials: "same-origin", cache: "no-store" });
          if (response.ok) {
            const subscriber = await response.json();
            allowed = subscriber.subscription_status === "active" || subscriber.subscription_status === "trialing";
          }
        }
      } catch (_) {}
      if (mounted) {
        setSubscriptionAccess(allowed);
        setCheckingSubscriptionAccess(false);
        setSubscriptionAccessResolved(true);
      }
    })();
    return () => { mounted = false; };
  }, [authState.user?.id]);

  useEffect(() => {
    if (resetToken || !authState.user || checkingSubscriptionAccess || !subscriptionAccessResolved || landingHandled.current) return;
    const admin = isAdminUser(authState.user);
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    let next = null;
    try { next = new URLSearchParams(window.location.search).get("next"); } catch (_) {}
    // Admins land in the admin after logging in; on /portal they get the admin view of the student portal.
    if (admin) {
      if (next === "/admin" || pathname === "/login") {
        landingHandled.current = true;
        window.location.replace("/admin");
      }
      return;
    }
    if (next === "robinjr") {
      landingHandled.current = true;
      (async () => {
        try {
          const result = await issueSsoTicket("robinjr");
          window.location.replace(ROBIN_LINKS[1][0] + "?sso_ticket=" + encodeURIComponent(result.ticket));
        } catch (_) {
          setEntryNotice("No se ha podido validar tu acceso a RobinJr.");
          window.history.replaceState({}, "", "/portal/");
          landingHandled.current = false;
        }
      })();
      return;
    }
    if (next === "/therobinplan/" || next === "/therobinplan") {
      if (subscriptionAccess) {
        landingHandled.current = true;
        window.location.replace("/therobinplan/");
      } else {
        setEntryNotice("No tienes una cuenta activa en Robin Community.");
        window.history.replaceState({}, "", "/portal/");
      }
      return;
    }
    if (authState.user.auth_source === "external_client" && !next) {
      if (authState.user.external_source === "robinjr") {
        landingHandled.current = true;
        (async () => {
          try {
            const result = await issueSsoTicket("robinjr");
            window.location.replace(ROBIN_LINKS[1][0] + "?sso_ticket=" + encodeURIComponent(result.ticket));
          } catch (_) {
            setEntryNotice("No se ha podido validar tu acceso a RobinJr.");
          }
        })();
      } else if (authState.user.external_source === "community" && subscriptionAccess) {
        landingHandled.current = true;
        window.location.replace("/therobinplan/");
      } else {
        setEntryNotice("Tu cuenta no tiene acceso activo a Robin Community.");
        if (pathname === "/login") window.history.replaceState({}, "", "/portal/");
      }
      return;
    }
    if (pathname === "/login") {
      landingHandled.current = true;
      window.location.replace("/portal/");
    }
  }, [authState.user?.id, checkingSubscriptionAccess, subscriptionAccess, subscriptionAccessResolved, resetToken]);

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

  async function handleLogin(username, password) {
    const data = await apiLogin(username.trim(), password);
    setAuthenticatedUser(await apiMe());
    setActive("estado");
    return data;
  }

  async function handleLogout() {
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

  if (resetToken) return withSupport(<ResetPasswordScreen token={resetToken} />, true);

  if (authState.loading) {
    return withSupport(
      <div className="min-h-screen grid place-items-center" style={{ background: CANVAS }}>
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando portal…
        </div>
      </div>, true
    );
  }

  if (!authState.user) {
    return withSupport(<LoginScreen onLogin={handleLogin} />, true);
  }
  if (isAdminUser(authState.user)) return withSupport(<>
    <CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} onReportProblem={() => setReportOpen(true)} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} />
    <AdminPortal user={authState.user} />
  </>);
  if (authState.user.auth_source === "external_client") return withSupport(<>
    <CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} onReportProblem={() => setReportOpen(true)} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} />
    <main className="min-h-[50vh] grid place-content-center gap-3 px-6 text-center text-[#2D3A64]" role="status">
      <h1 className="text-2xl font-bold">Portal del Alumno no disponible</h1>
      <p>Esta cuenta no tiene un usuario en la base de datos del Portal del Alumno.</p>
    </main>
  </>);

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
    if (Step) return withSupport(<OnboardingNavContext.Provider value={nav}><Step key={step} {...onboardingProps} /></OnboardingNavContext.Provider>, true);
  }

  const user = authState.user;
  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || user.username || "").trim();
  return withSupport(
    <>
      <CrossPortalNav current="application" user={user} onLogout={handleLogout} onReportProblem={() => setReportOpen(true)} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} />
      <PortalShell
        user={user}
        clientName={clientName}
        active={active}
        setActive={setActive}
        onUserRefresh={refreshUser}
      />
    </>
  );
}

// The common login as a postcard (DESIGN.md, elementos visuales): the message
// side says what this sign-in opens, the address side holds the form and a stamp.
const STAGES = [
  [robinJrArt, "Robin Jr", "Para descubrir qué quieres estudiar."],
  [robinStudentArt, "Portal del alumno", "Tu admisión, paso a paso."],
  [robinCommunityArt, "Robin Community", "Tu vida fuera, con la comunidad."],
];

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (submitError) {
      setError(submitError.status === 401
        ? "Usuario o contraseña incorrectos."
        : submitError.message === "identity_provider_unavailable"
          ? "Ahora mismo no se puede comprobar la cuenta. Inténtalo de nuevo en unos minutos."
          : submitError.message || "No hemos podido iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="robin-login">
      <img className="robin-login-wordmark" src={robinWordmark} alt="Robin" />
      <div className="robin-postcard">
        <section className="robin-postcard-message" aria-labelledby="robin-login-title">
          <h1 id="robin-login-title">Hola de nuevo.</h1>
          <p className="robin-postcard-lead">Con este acceso entras a tu espacio en Robin, estés en la etapa que estés.</p>
          <ul className="robin-postcard-stages">
            {STAGES.map(([art, name, line]) => (
              <li key={name}><img src={art} alt="" /><span><strong>{name}</strong>{line}</span></li>
            ))}
          </ul>
        </section>
        <form className="robin-postcard-address" onSubmit={submit} noValidate>
          <div className="robin-postcard-stamp" aria-hidden="true">
            <img src={robinStudentArt} alt="" />
            <span>52°22′N 4°54′E</span>
          </div>
          <label className="robin-postcard-line">
            <span>Usuario o correo</span>
            <input type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" />
          </label>
          <label className="robin-postcard-line">
            <span>Contraseña</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="robin-postcard-error" role="alert"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</p>}
          <button className="robin-postcard-submit" type="submit" disabled={!email || !password || loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : "Entrar"}
          </button>
          <p className="robin-postcard-hint">Tu espacio Robin en un solo lugar.</p>
          <button className="robin-forgot-password" type="button" onClick={() => setRecoveryOpen(true)}>Recuperar contraseña</button>
        </form>
      </div>
      {recoveryOpen && <RecoveryRequest onClose={() => setRecoveryOpen(false)} />}
    </main>
  );
}
