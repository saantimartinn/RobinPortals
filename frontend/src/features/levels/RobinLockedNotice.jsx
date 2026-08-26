import { Card, CardContent } from "../../shared/ui.jsx";
import { Lock } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";

function RobinLockedNotice({ level, label }) {
  return (
    <Card>
      <CardContent className="py-10 text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl grid place-items-center text-white mx-auto" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}><Lock className="h-6 w-6" /></div>
        <div className="text-lg font-bold text-slate-800" style={{ fontFamily: "'Georgia', serif" }}>{label} · bloqueado</div>
        <div className="text-sm text-slate-500 max-w-md mx-auto">Este beneficio se desbloquea al alcanzar el nivel {level.emoji} {level.label}. ¡Sigue en Robin para desbloquearlo!</div>
      </CardContent>
    </Card>
  );
}

export { RobinLockedNotice };
