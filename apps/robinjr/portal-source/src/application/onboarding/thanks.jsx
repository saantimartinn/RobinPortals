import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Btn } from "../../ui.jsx";
import { OnboardingShell } from "./onboarding-shared.jsx";
import robinBird from "../../../../../../packages/brand/assets/robin-reading.png";

export function OnboardingThanks({ user, onLogout, onDone }) {
  useLocale();
  return <OnboardingShell user={user} title={t("Gracias por compartir tu historia")} stepNumber={5} onLogout={onLogout} fullscreen>
    <div className="onboarding-thanks">
      <img src={robinBird} alt="Robin" />
      <div className="onboarding-thanks-copy">
        <span><CheckCircle2 size={18} />{t(" Perfil completado")}</span>
        <h2>{t("Ahora podemos conocerte mejor")}</h2>
        <p>{t("Tus respuestas nos ayudarán a entender tus intereses, tus puntos fuertes y lo que esperas de tu futuro. Así podremos brindarte una orientación mucho más personalizada y encontrar las opciones que mejor encajen contigo.")}</p>
        <p>{t("Gracias por dedicarle este tiempo. Tu perfil está listo: ya puedes entrar al portal y comenzar con tu orientación.")}</p>
        <Btn variant="gold" size="lg" onClick={onDone}>{t("Entrar al portal ")}<ChevronRight size={18} /></Btn>
      </div>
    </div>
  </OnboardingShell>;
}
