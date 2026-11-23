import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Onboarding step or helper for origin; OnboardingFlow owns the step sequence.
import { useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Btn, Field } from "../../ui.jsx";
import { originSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';

export function OnboardingOrigin({ user, onLogout, onDone }) {
  useLocale();
  const [origin, setOrigin] = useState(user.origin || "");
  const [level, setLevel]   = useState(user.application_level || "");
  const [pais, setPais]     = useState(user.pais || "");
  const [hasEu, setHasEu]   = useState(user.has_eu_id == null ? null : !!user.has_eu_id);
  const [screen, setScreen] = useState(0);
  const [error, setError]   = useState("");
  const [busy, setBusy]     = useState(false);

  const esOtros = origin === "otros";
  const totalScreens = esOtros ? 4 : 1;
  const isLast = screen === totalScreens - 1;

  async function save() {
    setBusy(true); setError("");
    try {
      const payload = esOtros
        ? { origin, application_level: level, pais: pais.trim(), has_eu_id: hasEu }
        : { origin };
      await originSave(payload);
      await onDone();
    } catch (e) {
      setError(e.message || "No se pudo guardar. Inténtalo de nuevo.");
      setBusy(false);
    }
  }

  function next() {
    setError("");
    if (screen === 0) {
      if (!origin) { setError("Selecciona una opción para continuar."); return; }
      if (origin === "espana") { save(); return; }
      setScreen(1); return;
    }
    if (screen === 1) {
      if (!level) { setError("Indica a qué tipo de programa vas a aplicar."); return; }
      setScreen(2); return;
    }
    if (screen === 2) {
      if (!pais.trim()) { setError("Indica tu país."); return; }
      setScreen(3); return;
    }
    if (hasEu == null) { setError("Indica si posees un documento de identidad europeo."); return; }
    save();
  }

  const Choice = ({ active, onClick, title, desc }) => { useLocale(); return (<button type="button" onClick={onClick} aria-pressed={active} className="q-choice portal-origin-choice w-full text-left">
      <span className="portal-origin-label"><strong>{t(title)}</strong>{desc && <small>{t(desc)}</small>}</span>
      <span className="portal-origin-tick" aria-hidden="true">{active && <CheckCircle2 size={15} />}</span>
    </button>); };

  const subtitle = screen === 0
    ? "Cuéntanos desde dónde realizas tu solicitud."
    : "Solicitud internacional · " + screen + " de 3";
  const questions = [
    "¿Desde dónde realizas tu solicitud de acceso a la universidad?",
    "¿A qué tipo de programa universitario vas a aplicar?",
    "¿Desde qué país realizas tu solicitud?",
    "¿Posees un documento de identidad europeo (DNI o NIE de un país de la UE)?",
  ];

  return (
    <OnboardingShell user={user} title={t("Bienvenido a Robin")} subtitle={t(subtitle)} question={questions[screen]} questionMeta={t("ORIGEN · PREGUNTA {0} DE {1}", [screen + 1, totalScreens])} stepNumber={1} onLogout={onLogout} fullscreen>
      <div className="onboarding-question-flow" onKeyDown={(event) => { if (event.key === "Enter" && event.target.tagName === "INPUT" && !busy) { event.preventDefault(); next(); } }}>
        <div className="onboarding-question-body">
        {screen === 0 && (
          <>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={origin === "espana"} onClick={() => { setOrigin("espana"); setError(""); }}
                title={t("España")} desc={t("Resido en España y solicito plaza desde aquí.")} />
              <Choice active={origin === "otros"} onClick={() => { setOrigin("otros"); setError(""); }}
                title={t("Otro país")} desc={t("Solicito desde fuera de España (estudiante internacional).")} />
            </div>
          </>
        )}

        {screen === 1 && (
          <>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={level === "grado"} onClick={() => { setLevel("grado"); setError(""); }}
                title={t("Grado")} desc={t("Estudios universitarios de grado (Bachelor's).")} />
              <Choice active={level === "maestria"} onClick={() => { setLevel("maestria"); setError(""); }}
                title={t("Maestría")} desc={t("Programa de máster (Master's).")} />
            </div>
          </>
        )}

        {screen === 2 && (
          <>
            <Field label={t("País")} value={pais} onChange={setPais} placeholder={t("Ej. México, Colombia, Argentina…")} />
          </>
        )}

        {screen === 3 && (
          <>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={hasEu === true} onClick={() => { setHasEu(true); setError(""); }}
                title={t("Sí")} desc={t("Dispongo de un documento de identidad europeo.")} />
              <Choice active={hasEu === false} onClick={() => { setHasEu(false); setError(""); }}
                title={t("No")} desc={t("Verificaremos tu identidad con el pasaporte.")} />
            </div>
          </>
        )}

        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{t(error)}</span>
          </div>
        )}

        <div className="onboarding-question-nav onboarding-origin-nav flex items-center gap-3">
          <Btn className="flex-1" size="lg" onClick={next} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t(" Guardando…")}</>
              : isLast ? <>{t("Continuar ")}<ChevronRight className="h-4 w-4" /></>
              : <>{t("Siguiente ")}<ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      </div>
    </OnboardingShell>
  );
}
