// Community feature UI for robin card; the application shell selects this view.
import { NAVY_DARK } from "../../shared/theme.js";
import React from "react";

function RobinCard({ r }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 flex flex-col items-center gap-2 shadow-sm">
      <div className="h-16 w-16 rounded-2xl grid place-items-center text-white font-bold text-xl" style={{ background: `linear-gradient(135deg, ${r.color}, ${NAVY_DARK})` }}>{r.name.charAt(0)}</div>
      <div className="text-xs font-semibold text-slate-800 text-center truncate w-full">{r.name}</div>
      <div className="text-[10px] text-slate-400 text-center truncate w-full">{r.city}</div>
    </div>
  );
}

export { RobinCard };
