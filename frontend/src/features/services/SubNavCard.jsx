import { Badge } from "../../shared/ui.jsx";
import { ChevronRight, ExternalLink, Lock } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";

function SubNavCard({ icon: Icon, title, desc, onClick, href, cta = "Abrir", badge, lock }) {
  const inner = (
    <div className={`rounded-2xl border border-[#D7E1F4] bg-[#EEF3FC] p-5 h-full min-h-[150px] flex flex-col transition ${lock ? "" : "hover:shadow-md hover:border-[#c3d2ee] cursor-pointer"}`} style={lock ? { opacity: 0.7 } : {}}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
          {lock ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-800">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3">
        {lock ? (
          <span className="text-[11px] font-semibold inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-white" style={{ color: NAVY, border: "1px solid #D7E1F4" }}>
            <Lock className="h-3 w-3" /> Disponible en {lock.label}
          </span>
        ) : (
          <>
            {badge && <Badge tone={badge.tone || "slate"}>{badge.label}</Badge>}
            <span className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: NAVY }}>
              {cta} {href ? <ExternalLink className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          </>
        )}
      </div>
    </div>
  );
  if (lock) return <div className="h-full" title={`Disponible en ${lock.label}`}>{inner}</div>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className="block h-full">{inner}</a>;
  return <button type="button" onClick={onClick} className="text-left w-full h-full">{inner}</button>;
}

export { SubNavCard };
