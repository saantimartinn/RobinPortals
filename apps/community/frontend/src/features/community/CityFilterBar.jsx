// Community feature UI for city filter bar; the application shell selects this view.
import { NAVY } from "../../shared/theme.js";
import React from "react";

function CityFilterBar({ ciudad, showAll, setShowAll }) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="text-slate-400">Mostrando:</span>
      <button onClick={() => setShowAll(false)}
        className="rounded-full px-3 py-1 font-semibold transition"
        style={!showAll ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
        {ciudad ? `${ciudad} + Nacional` : "Mi ciudad"}
      </button>
      <button onClick={() => setShowAll(true)}
        className="rounded-full px-3 py-1 font-semibold transition"
        style={showAll ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
        Todas las ciudades
      </button>
    </div>
  );
}

export { CityFilterBar };
