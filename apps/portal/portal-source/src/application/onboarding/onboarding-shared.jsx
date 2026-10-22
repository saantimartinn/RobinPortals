// Onboarding step or helper for onboarding shared; OnboardingFlow owns the step sequence.
// The shell reuses the student portal layout (student-portal.css + packages/portal-nav/robin-shell.css):
// navy sidebar with the stamp and the steps, page heading and the step inside a paper card.
// It has no top bar: the logo sits at the top of the sidebar.
import { Check, ChevronLeft } from "lucide-react";
import { ONBOARDING_ORDER, useOnboardingNav } from "./onboarding-nav.js";
import robinLogo from "../../assets/robin-logo-transparent.png";

const STEPS = ["Tu destino", "Identidad", "Contrato", "Perfil académico", "Primer pago"];

// fullscreen: one question per screen, filling the main area (questionnaires).
export function OnboardingShell({ user, title, subtitle, stepNumber, totalSteps = STEPS.length, onLogout, fullscreen = false, children }) {
  const firstName = user?.nombre?.trim() || String(user?.email || user?.username || "").split("@")[0];
  const nav = useOnboardingNav();
  return (
    <div className="student-portal is-onboarding">
      <div className="student-layout">
        <nav className="student-sidebar" aria-label="Pasos para activar tu cuenta">
          <img className="onboarding-logo" src={robinLogo} alt="Robin" />
          <div className="student-identity">
            <div className="student-avatar">{(firstName || "R").charAt(0).toUpperCase()}</div>
            <div><strong>{firstName}</strong><span>Activando tu cuenta</span></div>
          </div>
          <p className="student-nav-caption">Pasos</p>
          <ol className="student-nav-items onboarding-steps">
            {STEPS.slice(0, totalSteps).map((label, index) => {
              const n = index + 1;
              // Completed steps and the pending one can be opened from any earlier step.
              const done = nav ? index < nav.furthest : n < stepNumber;
              const state = n === stepNumber ? "is-active" : done ? "is-done" : "is-next";
              const content = <><span className="onboarding-step-mark">{done && n !== stepNumber ? <Check size={14} strokeWidth={2.5} /> : n}</span><span>{label}</span></>;
              return (
                <li key={label}>
                  {nav && index <= nav.furthest && n !== stepNumber
                    ? <button type="button" className={`student-nav-item ${state}`} onClick={() => nav.goTo(ONBOARDING_ORDER[index])}>{content}</button>
                    : <span className={`student-nav-item ${state}`} aria-current={n === stepNumber ? "step" : undefined}>{content}</span>}
                </li>
              );
            })}
          </ol>
          <div className="student-support">
            <h3>Solo unos minutos.</h3>
            <p>Después tendrás tus documentos, tus llamadas y el chat con tu asesor.</p>
            <button type="button" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </nav>
        <main className="student-main" id="onboarding-content" tabIndex={-1}>
          <div className="student-page-heading">
            {nav?.goBack && <button type="button" className="onboarding-back-step" onClick={nav.goBack}><ChevronLeft size={16} /> Paso anterior</button>}
            <span className="student-eyebrow">Paso {stepNumber} de {totalSteps}</span>
            <h1>{title}</h1>
            {subtitle && <p className="onboarding-subtitle">{subtitle}</p>}
          </div>
          <section className={`ui-card onboarding-card${fullscreen ? " is-fullscreen" : ""}`}>{children}</section>
          <button type="button" onClick={onLogout} className="onboarding-logout">Cerrar sesión</button>
        </main>
      </div>
    </div>
  );
}
