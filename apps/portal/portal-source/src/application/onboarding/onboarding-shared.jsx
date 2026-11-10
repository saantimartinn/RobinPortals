// Shared onboarding frame; each step retains its own fields and save behavior.
import { Check, ChevronLeft, LogOut } from "lucide-react";
import { ONBOARDING_ORDER, useOnboardingNav } from "./onboarding-nav.js";
import robinLogo from "../../assets/robin-wordmark.png";
import robinStudent from "../../../../../../packages/brand/assets/robin-student.svg";

const STEPS = [
  { label: "Tu solicitud", detail: "Desde dónde y qué quieres estudiar" },
  { label: "Identidad", detail: "Verifica tus datos personales" },
  { label: "Contrato", detail: "Revisa y firma el acuerdo" },
  { label: "Perfil académico", detail: "Cuéntanos tus intereses" },
  { label: "Primer pago", detail: "Completa la activación" },
];

export function OnboardingShell({ user, title, subtitle, question, questionMeta, questionHint, stepNumber, totalSteps = STEPS.length, onLogout, fullscreen = false, conversation = false, children }) {
  const nav = useOnboardingNav();
  const firstName = user?.nombre?.trim().split(" ")[0];
  const progress = Math.round(((stepNumber - 1) / totalSteps) * 100);

  return (
    <div className="student-portal is-onboarding guided-onboarding">
      <header className="guided-topbar">
        <a className="guided-brand" href="#onboarding-content" aria-label="Robin · Portal del Alumno"><img src={robinLogo} alt="Robin" /><span>Portal del Alumno</span></a>
        <button type="button" className="guided-signout" onClick={onLogout}><LogOut size={15} /> Cerrar sesión</button>
      </header>
      <div className="guided-layout">
        <aside className="guided-sidebar">
          <div className="guided-welcome"><img src={robinStudent} alt="" /><div><p>Empezamos contigo</p><h2>{firstName ? `Hola, ${firstName}` : "Bienvenido a Robin"}</h2></div></div>
          <p className="guided-intro">Vamos a preparar tu cuenta, paso a paso.</p>
          <nav aria-label="Pasos para activar tu cuenta">
            <ol className="guided-steps">
              {STEPS.slice(0, totalSteps).map(({ label, detail }, index) => {
                const active = index === stepNumber - 1;
                const done = nav ? index < nav.furthest : index < stepNumber - 1;
                const canOpen = nav && index <= nav.furthest && !active && (!nav.canOpen || nav.canOpen(ONBOARDING_ORDER[index]));
                const content = <><span className="guided-step-number">{done && !active ? <Check size={16} /> : index + 1}</span><span><strong>{label}</strong><small>{detail}</small></span></>;
                return <li key={label} className={active ? "is-active" : done ? "is-done" : "is-next"}>
                  {canOpen ? <button type="button" onClick={() => nav.goTo(ONBOARDING_ORDER[index])}>{content}</button>
                    : <span className="guided-step" aria-current={active ? "step" : undefined}>{content}</span>}
                </li>;
              })}
            </ol>
          </nav>
          <div className="guided-overall-progress"><div><span>Tu cuenta</span><strong>Paso {stepNumber} de {totalSteps}</strong></div><div className="guided-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div></div>
        </aside>
        <main className={`student-main guided-main${fullscreen ? " is-questionnaire" : ""}`} id="onboarding-content" tabIndex={-1}>
          {!fullscreen && nav?.goBack && <button type="button" className="onboarding-back-step" onClick={nav.goBack}><ChevronLeft size={16} /> Paso anterior</button>}
          <header className="guided-prompt" key={question || title}>
            {!conversation && questionMeta && <p className="guided-question-meta">{questionMeta}</p>}
            <h1>{conversation ? title : question || title}</h1>
            {conversation ? <p className="guided-subtitle">Conversa con Robin para que podamos conocerte y preparar tu orientación.</p>
              : (questionHint || subtitle) && <p className="guided-subtitle">{questionHint || subtitle}</p>}
          </header>
          <section className="guided-content" aria-label={title}>{children}</section>
        </main>
      </div>
    </div>
  );
}
