import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import logoRBlanco from "../../assets/logo-r-blanco.png";
import logoRobinAzul from "../../assets/logo-robin-azul.png";

function AuthShell({ children }) {
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
          <div className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Georgia', serif", lineHeight: 1.2 }}>
            Tu futuro<br />empieza aquí.
          </div>
          <div className="text-white/60 text-sm leading-relaxed">
            The Robin Plan te acompaña en tu vida internacional: comunidad, bienestar y desarrollo profesional.
          </div>
        </div>
        <div className="relative text-white/30 text-xs">© Project Robin · The Robin Plan</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoRobinAzul} alt="Project Robin" className="h-12 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export { AuthShell };
