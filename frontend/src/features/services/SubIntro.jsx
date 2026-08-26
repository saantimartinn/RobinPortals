import { ChevronLeft } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import logoRBlanco from "../../assets/logo-r-blanco.png";

function SubIntro({ title, subtitle, onBack }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {onBack && (
            <button onClick={onBack} className="inline-flex items-center gap-1 text-white/70 hover:text-white text-xs font-semibold mb-2">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
          )}
          <div className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">The Robin Plan</div>
          <div className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>{title}</div>
          {subtitle && <div className="text-white/60 text-sm mt-1">{subtitle}</div>}
        </div>
        <img src={logoRBlanco} alt="Robin" className="h-11 w-auto flex-shrink-0 opacity-90 hidden sm:block" />
      </div>
    </div>
  );
}

export { SubIntro };
