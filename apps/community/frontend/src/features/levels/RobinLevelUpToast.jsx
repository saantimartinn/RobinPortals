// Levels feature UI for robin level up toast; the application shell selects this view.
import { Btn } from "../../shared/ui.jsx";
import React from "react";
import { robinLevelDef } from "../../shared/utils.js";

function RobinLevelUpToast({ level, onClose, onSee }) {
  const def = robinLevelDef(level);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-2 leading-none">{def.emoji}</div>
        <div className="text-lg font-bold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>🎉 ¡Has desbloqueado {def.label}!</div>
        <div className="text-sm text-slate-500 mt-1">Ahora tienes acceso a nuevos beneficios.</div>
        <div className="flex gap-2 justify-center mt-4">
          <Btn onClick={() => { onClose(); if (onSee) onSee(); }}>Ver mis beneficios</Btn>
          <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </div>
  );
}

export { RobinLevelUpToast };
