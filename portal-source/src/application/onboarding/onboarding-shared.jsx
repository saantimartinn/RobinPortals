import { FileText, CheckCircle2, CreditCard, Mail } from "lucide-react";
import logoRBlanco from "../../assets/logo-r-blanco.png";
import { NAVY, NAVY_DARK } from "../../theme.js";

export function OnboardingShell({ title, subtitle, stepNumber, totalSteps = 5, icon, onLogout, children }) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'system-ui', sans-serif" }}>
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 60%, #2a4a8e 100%)` }}>
        <div className="absolute inset-0 opacity-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: (i + 1) * 180, height: (i + 1) * 180, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="relative">
          <img src={logoRBlanco} alt="Robin" className="h-16 w-auto" />
        </div>
        <div className="relative">
          <div className="text-white/60 text-xs uppercase tracking-widest mb-2">Paso {stepNumber} de {totalSteps} · Onboarding</div>
          <div className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Georgia', serif", lineHeight: 1.2 }}>
            Activamos<br />tu cuenta<br />Robin.
          </div>
          <div className="text-white/60 text-sm leading-relaxed">Solo unos minutos y ya podrás acceder a documentos, llamadas y el chat con tu asesor.</div>
        </div>
        <button onClick={onLogout} className="relative text-white/40 text-xs hover:text-white/80 underline self-start">Cerrar sesión</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl grid place-items-center text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                  {icon || (stepNumber === 1 ? <CreditCard className="h-4 w-4" />
                    : stepNumber === 2 ? <FileText className="h-4 w-4" />
                    : stepNumber === 3 ? <Mail className="h-4 w-4" />
                    : <CreditCard className="h-4 w-4" />)}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-slate-900 truncate" style={{ fontFamily: "'Georgia', serif" }}>{title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</div>
                </div>
              </div>
              <Stepper current={stepNumber} total={totalSteps} />
            </div>
            <div className="p-6">{children}</div>
          </div>
          <button onClick={onLogout} className="mt-4 text-xs text-slate-400 hover:text-slate-700 underline w-full text-center lg:hidden">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

export function Stepper({ current, total = 3 }) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      {steps.map((n) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
            style={n < current ? { background: "#10b981", color: "white" } : n === current ? { background: NAVY, color: "white" } : { background: "#e2e8f0", color: "#64748b" }}>
            {n < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
          </div>
          {n < total && <div className="h-px w-6" style={{ background: "#e2e8f0" }} />}
        </div>
      ))}
    </div>
  );
}
