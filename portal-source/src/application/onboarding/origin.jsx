import { useState } from "react";
import { FileText, CheckCircle2, ChevronRight, MapPin, Loader2, AlertCircle, ChevronLeft, GraduationCap } from "lucide-react";
import { GOLD, NAVY } from "../../theme.js";
import { Btn, Field } from "../../ui.jsx";
import { originSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';

export function OnboardingOrigin({ user, onLogout, onDone }) {
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
  function back() { setError(""); setScreen((s) => Math.max(0, s - 1)); }

  const Choice = ({ active, onClick, title, desc, icon: Ic }) => (
    <button type="button" onClick={onClick}
      className="flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition w-full"
      style={active ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
      <span className="h-9 w-9 rounded-lg grid place-items-center flex-shrink-0"
        style={active ? { background: GOLD } : { background: "#f1f5f9" }}>
        {Ic && <Ic className="h-4 w-4" style={{ color: active ? NAVY : "#64748b" }} />}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-sm">{title}</span>
        {desc && <span className={"block text-xs mt-0.5 " + (active ? "text-white/70" : "text-slate-400")}>{desc}</span>}
      </span>
    </button>
  );

  const subtitle = screen === 0
    ? "Cuéntanos desde dónde realizas tu solicitud."
    : "Solicitud internacional · " + screen + " de 3";

  return (
    <OnboardingShell title="Bienvenido a Robin" subtitle={subtitle} stepNumber={1} totalSteps={5}
      icon={<MapPin className="h-4 w-4" />} onLogout={onLogout}>
      <div className="space-y-5">
        {screen === 0 && (
          <>
            <div className="text-sm text-slate-500">¿Desde dónde realizas tu solicitud de acceso a la universidad?</div>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={origin === "espana"} onClick={() => { setOrigin("espana"); setError(""); }}
                title="España" desc="Resido en España y solicito plaza desde aquí." icon={MapPin} />
              <Choice active={origin === "otros"} onClick={() => { setOrigin("otros"); setError(""); }}
                title="Otro país" desc="Solicito desde fuera de España (estudiante internacional)." icon={MapPin} />
            </div>
          </>
        )}

        {screen === 1 && (
          <>
            <div className="text-sm text-slate-500">¿A qué tipo de programa universitario vas a aplicar?</div>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={level === "grado"} onClick={() => { setLevel("grado"); setError(""); }}
                title="Grado" desc="Estudios universitarios de grado (Bachelor's)." icon={GraduationCap} />
              <Choice active={level === "maestria"} onClick={() => { setLevel("maestria"); setError(""); }}
                title="Maestría" desc="Programa de máster (Master's)." icon={GraduationCap} />
            </div>
          </>
        )}

        {screen === 2 && (
          <>
            <div className="text-sm text-slate-500">¿Desde qué país realizas tu solicitud?</div>
            <Field label="País" value={pais} onChange={setPais} placeholder="Ej. México, Colombia, Argentina…" />
          </>
        )}

        {screen === 3 && (
          <>
            <div className="text-sm text-slate-500">¿Posees un documento de identidad europeo (DNI o NIE de un país de la UE)?</div>
            <div className="grid grid-cols-1 gap-2.5">
              <Choice active={hasEu === true} onClick={() => { setHasEu(true); setError(""); }}
                title="Sí" desc="Dispongo de un documento de identidad europeo." icon={CheckCircle2} />
              <Choice active={hasEu === false} onClick={() => { setHasEu(false); setError(""); }}
                title="No" desc="Verificaremos tu identidad con el pasaporte." icon={FileText} />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {screen > 0 && (
            <Btn variant="secondary" onClick={back} disabled={busy}>
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Btn>
          )}
          <Btn className="flex-1" size="lg" onClick={next} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
              : isLast ? <>Continuar <ChevronRight className="h-4 w-4" /></>
              : <>Siguiente <ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      </div>
    </OnboardingShell>
  );
}
