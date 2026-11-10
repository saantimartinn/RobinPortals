import { CheckCircle2, ChevronRight } from "lucide-react";
import { Btn } from "../../ui.jsx";
import { OnboardingShell } from "./onboarding-shared.jsx";
import robinBird from "../../../../../../packages/brand/assets/robin-reading.png";

export function OnboardingThanks({ user, onLogout, onDone }) {
  return <OnboardingShell user={user} title="Gracias por compartir tu historia" stepNumber={4} onLogout={onLogout} fullscreen>
    <div className="onboarding-thanks">
      <img src={robinBird} alt="Robin" />
      <div className="onboarding-thanks-copy">
        <span><CheckCircle2 size={18} /> Perfil completado</span>
        <h2>Ahora podemos conocerte mejor</h2>
        <p>Tus respuestas nos ayudarán a entender tus intereses, tus puntos fuertes y lo que esperas de tu futuro. Así podremos brindarte una orientación mucho más personalizada y encontrar las opciones que mejor encajen contigo.</p>
        <p>Gracias por dedicarle este tiempo. Solo queda completar la activación de tu cuenta.</p>
        <Btn variant="gold" size="lg" onClick={onDone}>Continuar al pago <ChevronRight size={18} /></Btn>
      </div>
    </div>
  </OnboardingShell>;
}
