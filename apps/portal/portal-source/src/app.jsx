// Resolves the current session and chooses the student or staff portal.
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import robinLogoTransparent from "./assets/robin-logo-transparent.png";

import { isAdminUser } from "./session.js";
import { CREAM, NAVY, NAVY_DARK } from "./theme.js";
import { Btn, Field } from "./ui.jsx";
import { reportClientError } from "./client-utils.js";
import { PortalShell } from "./application/ApplicationPortals.jsx";
import { CrossPortalNav } from "./application/CrossPortalNav.jsx";
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
  const [active, setActive] = useState("estado");
  const [subscriptionAccess, setSubscriptionAccess] = useState(false);
  const [checkingSubscriptionAccess, setCheckingSubscriptionAccess] = useState(false);
  const [subscriptionAccessResolved, setSubscriptionAccessResolved] = useState(false);
  const [entryNotice, setEntryNotice] = useState("");
  const landingHandled = useRef(false);

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
        window.location.replace("/login");
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
    if (!authState.user || checkingSubscriptionAccess || !subscriptionAccessResolved || landingHandled.current) return;
    const admin = isAdminUser(authState.user);
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    let next = null;
    try { next = new URLSearchParams(window.location.search).get("next"); } catch (_) {}
    if (admin) {
      if (pathname !== "/admin") {
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
          window.location.replace("https://robinjr.netlify.app/portal/?sso_ticket=" + encodeURIComponent(result.ticket));
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
            window.location.replace("https://robinjr.netlify.app/portal/?sso_ticket=" + encodeURIComponent(result.ticket));
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
  }, [authState.user?.id, checkingSubscriptionAccess, subscriptionAccess, subscriptionAccessResolved]);

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

  if (authState.loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: CREAM }}>
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando portal…
        </div>
      </div>
    );
  }

  if (authState.user && isAdminUser(authState.user)) {
    return <div className="min-h-screen grid place-items-center" style={{ background: CREAM }}><Loader2 className="h-5 w-5 animate-spin" aria-label="Abriendo el portal del administrador" /></div>;
  }

  if (!authState.user) return <LoginScreen onLogin={handleLogin} onBack={() => window.location.assign("/login")} />;
  if (authState.user.auth_source === "external_client") return <>
    <CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} />
    <main className="min-h-[50vh] grid place-content-center gap-3 px-6 text-center text-[#263b6a]" role="status">
      <h1 className="text-2xl font-bold">Portal del Alumno no disponible</h1>
      <p>Esta cuenta no tiene un usuario en la base de datos del Portal del Alumno.</p>
    </main>
  </>;

  const onboardingProps = { user: authState.user, onLogout: handleLogout, onDone: refreshState };
  if (authState.needsOnboarding && authState.onboardingStep === "origin") return <><CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} /><OnboardingOrigin {...onboardingProps} /></>;
  if (authState.needsOnboarding && authState.onboardingStep === "dni") return <><CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} /><OnboardingDNI {...onboardingProps} /></>;
  if (authState.needsOnboarding && authState.onboardingStep === "contract") return <><CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} /><OnboardingContract {...onboardingProps} /></>;
  if (authState.needsOnboarding && authState.onboardingStep === "payment") return <><CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} /><OnboardingPayment {...onboardingProps} /></>;
  if (authState.needsOnboarding && authState.onboardingStep === "profile") return <><CrossPortalNav current="application" user={authState.user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} /><OnboardingProfile {...onboardingProps} /></>;

  const user = authState.user;
  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || user.username || "").trim();
  return (
    <>
      <CrossPortalNav current="application" user={user} onLogout={handleLogout} hasSubscriptionAccess={subscriptionAccess} checkingSubscriptionAccess={checkingSubscriptionAccess} entryNotice={entryNotice} />
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

function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex bg-[#f4f5f7]" style={{ fontFamily: "'system-ui', sans-serif" }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[min(39vw,480px)] flex-shrink-0 px-11 py-11 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 60%, #2a4a8e 100%)` }}
      >
        <div className="absolute inset-0 opacity-5">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="absolute rounded-full border border-white"
              style={{ width: (index + 1) * 180, height: (index + 1) * 180, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-3" aria-label="Robin">
          <img src={robinLogoTransparent} alt="Robin" className="h-[94px] w-28 object-contain" />
        </div>
        <div className="relative">
          <div className="text-[clamp(36px,3.6vw,46px)] font-bold text-white mb-5 tracking-[-.03em]" style={{ fontFamily: "'Georgia', serif", lineHeight: 1.1 }}>
            Tu futuro<br />empieza aquí.
          </div>
          <div className="max-w-[300px] text-[13px] text-white/60 leading-relaxed">
            Project Robin te acompaña en cada paso del proceso de admisión a las mejores universidades.
          </div>
        </div>
        <div className="relative text-white/30 text-xs">
          <a
            href="/admin"
            className="transition-colors hover:text-white/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/70"
          >
            © Project Robin · Portal de Cliente
          </a>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-7 py-12 bg-[radial-gradient(circle_at_75%_15%,#fff_0,transparent_34%)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8 text-[#29395f]">
            <img src={robinLogoTransparent} alt="Robin" className="h-20 w-24 rounded-2xl bg-[#29395f] p-2 object-contain" />
          </div>
          {children}
          <div className="mt-8 text-center text-xs text-[#29395f]/40 lg:hidden">
            <a
              href="/admin"
              className="transition-colors hover:text-[#29395f]/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#29395f]/70"
            >
              © Project Robin · Portal de Cliente
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
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
    <AuthShell>
      <div className="bg-white rounded-3xl shadow-[0_24px_70px_rgba(31,48,83,.10)] border border-slate-200/80 overflow-hidden">
        <div className="p-7 sm:p-8 space-y-5">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Volver al portal
          </button>
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Georgia', serif" }}>Bienvenido de vuelta</div>
            <div className="text-sm text-slate-500">Accede a tu portal personalizado</div>
          </div>
          <Field label="Usuario o correo" value={email} onChange={setEmail} placeholder="tu@correo.com" />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          <Btn onClick={submit} disabled={!email || !password || loading} className="w-full" size="lg">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : <>Entrar <ChevronRight className="h-4 w-4" /></>}
          </Btn>
          <div className="text-xs text-slate-400 text-center">
            Si acabas de unirte, tu usuario es el número de ID que te enviamos.
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
