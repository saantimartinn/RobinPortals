import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Community feature UI for city filter bar; the application shell selects this view.
import { NAVY } from "../../shared/theme.js";
import React from "react";

function CityFilterBar({ ciudad, showAll, setShowAll }) {
  useLocale();
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="text-slate-400">{t("Mostrando:")}</span>
      <button onClick={() => setShowAll(false)}
        className="rounded-full px-3 py-1 font-semibold transition"
        style={!showAll ? { background: NAVY, color: "#FEFBE5" } : { background: "#F6F3E0", color: "#4E5979" }}>
        {ciudad ? t("{0} + Nacional", [ciudad]) : t("Mi ciudad")}
      </button>
      <button onClick={() => setShowAll(true)}
        className="rounded-full px-3 py-1 font-semibold transition"
        style={showAll ? { background: NAVY, color: "#FEFBE5" } : { background: "#F6F3E0", color: "#4E5979" }}>{t("Todas las ciudades")}</button>
    </div>
  );
}

export { CityFilterBar };
