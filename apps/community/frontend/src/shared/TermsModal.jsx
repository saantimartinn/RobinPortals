// Shared terms modal values or helpers used across this runtime.
import { Btn } from "./ui.jsx";
import { CheckCircle2, FileText } from "lucide-react";
import { NAVY, NAVY_DARK } from "./theme.js";
import React from "react";
import { TERMS_SECTIONS } from "./constants.js";

function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ background: NAVY }}>
          <div className="h-9 w-9 rounded-xl grid place-items-center bg-white/10 flex-shrink-0"><FileText className="h-5 w-5 text-white" /></div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/60 font-semibold">The Robin Plan</div>
            <div className="text-white font-semibold truncate">Términos y Condiciones</div>
          </div>
        </div>
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
          {TERMS_SECTIONS.map((sec, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-sm font-bold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>{sec.h}</div>
              {sec.ps.map((t, j) => <p key={j} className="text-[13px] text-slate-600 leading-relaxed">{t}</p>)}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <Btn variant="primary" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Cerrar</Btn>
        </div>
      </div>
    </div>
  );
}

export { TermsModal };
