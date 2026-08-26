import { Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { DEMO_ROBINS } from "./DEMO_ROBINS.js";
import { GOLD } from "../../shared/theme.js";
import React from "react";
import { RobinCard } from "./RobinCard.jsx";
import { Users } from "lucide-react";

function OtrosRobinsCarousel({ onOpen }) {
  return (
    <Card>
      <CardHeader title="Otros Robins" subtitle="Conoce a otros miembros de la comunidad" icon={Users} right={<button onClick={onOpen} className="text-xs font-semibold" style={{ color: GOLD }}>Ver todos</button>} />
      <CardContent>
        <button type="button" onClick={onOpen} className="block w-full overflow-hidden">
          <style>{`@keyframes robinMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
          <div className="flex gap-3 w-max py-1" style={{ animation: "robinMarquee 26s linear infinite" }}>
            {[...DEMO_ROBINS, ...DEMO_ROBINS].map((r, i) => (
              <div key={i} className="w-32 flex-shrink-0"><RobinCard r={r} /></div>
            ))}
          </div>
        </button>
        <div className="text-[11px] text-slate-400 mt-3">Vista previa · el directorio de perfiles está en desarrollo.</div>
      </CardContent>
    </Card>
  );
}

export { OtrosRobinsCarousel };
