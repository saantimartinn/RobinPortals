import { t, useLocale, LanguageSelector } from "../../../../../../packages/i18n/react.jsx";
// Shared onboarding frame; each step retains its own fields and save behavior.
import { Check, ChevronLeft, LogOut } from "lucide-react";
import { ONBOARDING_ORDER, ONBOARDING_STEPS as STEPS, onboardingOrder, useOnboardingNav } from "./onboarding-nav.js";
import robinLogo from "../../assets/robin-wordmark.png";
import robinStudent from "../../../../../../packages/brand/assets/robin-student.svg";



export function OnboardingShell({ user, title, subtitle, question, questionMeta, questionHint, stepNumber, totalSteps, onLogout, fullscreen = false, conversation = false, children }) {
  useLocale();
  const nav = useOnboardingNav();
  const firstName = user?.nombre?.trim().split(" ")[0];
  const order = onboardingOrder(user).slice(0, totalSteps);
  const currentStepNumber = order.indexOf(ONBOARDING_ORDER[stepNumber - 1]) + 1;
  const progress = Math.round(((currentStepNumber - 1) / order.length) * 100);

  return (
    <div className={`student-portal is-onboarding guided-onboarding${conversation ? " is-profile-conversation" : ""}`}>
      <header className="guided-topbar">
        <a className="guided-brand" href="#onboarding-content" aria-label={t("Robin · Portal del Alumno")}><img src={robinLogo} alt="Robin" /><span>{t("Portal del Alumno")}</span></a>
        <LanguageSelector />
        <button type="button" className="guided-signout" onClick={onLogout}><LogOut size={15} />{t(" Cerrar sesión")}</button>
      </header>
      <div className="guided-layout">
        <aside className="guided-sidebar">
          <div className="guided-welcome"><img src={robinStudent} alt="" /><div><p>{t("Empezamos contigo")}</p><h2>{firstName ? t("Hola, {0}", [firstName]) : t("Bienvenido a Robin")}</h2></div></div>
          <p className="guided-intro">{t("Vamos a preparar tu cuenta, paso a paso.")}</p>
          <nav aria-label={t("Pasos para activar tu cuenta")}>
            <ol className="guided-steps">
              {order.map((key, index) => {
                const { label, detail } = STEPS[ONBOARDING_ORDER.indexOf(key)];
                const active = index === currentStepNumber - 1;
                const done = nav ? index < nav.furthest : index < currentStepNumber - 1;
                const canOpen = nav && index <= nav.furthest && !active && (!nav.canOpen || nav.canOpen(key));
                const content = <><span className="guided-step-number">{done && !active ? <Check size={16} /> : index + 1}</span><span><strong>{t(label)}</strong><small>{t(detail)}</small></span></>;
                return <li key={label} className={active ? "is-active" : done ? "is-done" : "is-next"}>
                  {canOpen ? <button type="button" onClick={() => nav.goTo(key)}>{content}</button>
                    : <span className="guided-step" aria-current={active ? "step" : undefined}>{content}</span>}
                </li>;
              })}
            </ol>
          </nav>
          <div className="guided-overall-progress"><div><span>{t("Tu cuenta")}</span><strong>{t("Paso ")}{currentStepNumber}{t(" de ")}{order.length}</strong></div><div className="guided-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div></div>
        </aside>
        <main className={`student-main guided-main${fullscreen ? " is-questionnaire" : ""}`} id="onboarding-content" tabIndex={-1}>
          {!fullscreen && nav?.goBack && <button type="button" className="onboarding-back-step" onClick={nav.goBack}><ChevronLeft size={16} />{t(" Paso anterior")}</button>}
          <header className="guided-prompt" key={question || title}>
            {!conversation && questionMeta && <p className="guided-question-meta">{t(questionMeta)}</p>}
            <h1>{conversation ? t(title) : question || t(title)}</h1>
            {conversation ? <p className="guided-subtitle">{t("Conversa con Robin para que podamos conocerte y preparar tu orientación.")}</p>
              : (questionHint || subtitle) && <p className="guided-subtitle">{questionHint || t(subtitle)}</p>}
          </header>
          <section className="guided-content" aria-label={t(title)}>{children}</section>
        </main>
      </div>
    </div>
  );
}
