import { ChevronLeft } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import robinPlanHeaderLogo from "../../assets/robin-plan-header-logo.png";

function SubIntro({ title, onBack }) {
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
          <div className="text-white text-lg font-bold" style={{ fontFamily: "'Georgia', serif" }}>{title}</div>
        </div>
        <img src={robinPlanHeaderLogo} alt="Robin" className="h-14 w-24 object-contain flex-shrink-0 hidden sm:block" />
      </div>
    </div>
  );
}

export { SubIntro };
