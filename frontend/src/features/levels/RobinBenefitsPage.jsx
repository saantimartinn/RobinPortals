// Levels feature UI for robin benefits page; the application shell selects this view.
import { Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CheckCircle2, ChevronLeft, Lock, Sparkles, Star } from "lucide-react";
import { GOLD, NAVY, NAVY_DARK } from "../../shared/theme.js";
import { ROBIN_BENEFITS, ROBIN_LEVEL_ORDER } from "../../shared/constants.js";
import React from "react";
import { RobinProgressBar } from "./RobinProgressBar.jsx";
import { getRobinLevel, robinLevelDef } from "../../shared/utils.js";

function RobinBenefitsPage({ user, setActive }) {
  const r = getRobinLevel(user);
  const curIdx = ROBIN_LEVEL_ORDER[r.level];
  const def = robinLevelDef(r.level);
  const nextDef = r.nextLevel ? robinLevelDef(r.nextLevel) : null;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
        <button onClick={() => setActive("home")} className="inline-flex items-center gap-1 text-white/70 hover:text-white text-xs font-semibold mb-2"><ChevronLeft className="h-4 w-4" /> Volver</button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-4xl leading-none flex-shrink-0">{def.emoji}</div>
            <div className="min-w-0">
              <div className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Tu Nivel Robin</div>
              <div className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>{def.label}</div>
            </div>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => setActive("acelerar")}><Sparkles className="h-3.5 w-3.5" /> Acelerar progreso</Btn>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-white/70 text-xs gap-2">
            <span>Llevas <span className="text-white font-semibold">{r.daysActive}</span> {r.daysActive === 1 ? "día" : "días"} en Robin</span>
            {nextDef && <span className="flex-shrink-0">Próximo: {nextDef.emoji} {nextDef.label}</span>}
          </div>
          <RobinProgressBar value={r.progress} light />
          <div className="text-white/70 text-xs">{r.nextLevel ? <>Te faltan <span className="font-semibold" style={{ color: GOLD }}>{r.daysRemaining}</span> {r.daysRemaining === 1 ? "día" : "días"} para desbloquear {nextDef.label}.</> : <>Has desbloqueado todos los beneficios. 🎉</>}</div>
        </div>
      </div>

      <Card>
        <CardHeader title="Qué incluye tu plan" subtitle="Beneficios que desbloqueas según tu nivel Robin" icon={Star} />
        <CardContent className="space-y-4">
          {ROBIN_BENEFITS.map((g) => (
            <div key={g.group}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{g.group}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {g.items.map((b) => {
                  const locked = ROBIN_LEVEL_ORDER[b.level] > curIdx;
                  const lvlDef = robinLevelDef(b.level);
                  if (locked) return (
                    <div key={b.key} className="rounded-xl border p-3 flex items-center justify-between gap-2" style={{ background: "#EEF3FC", borderColor: "#D7E1F4", opacity: 0.6 }}>
                      <div className="flex items-center gap-2 min-w-0"><Lock className="h-4 w-4 flex-shrink-0 text-slate-400" /><span className="text-sm text-slate-600 truncate">{b.label}</span></div>
                      <span className="text-[10px] font-semibold flex-shrink-0 rounded-full px-2 py-0.5 bg-white" style={{ color: NAVY, border: "1px solid #D7E1F4" }}>Disponible en {lvlDef.label}</span>
                    </div>
                  );
                  return (
                    <div key={b.key} className="rounded-xl p-3 flex items-center gap-2 text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
                      <span className="text-sm font-medium truncate">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export { RobinBenefitsPage };
