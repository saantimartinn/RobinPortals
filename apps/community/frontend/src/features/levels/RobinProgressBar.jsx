// Levels feature UI for robin progress bar; the application shell selects this view.
import { GOLD } from "../../shared/theme.js";
import React from "react";

function RobinProgressBar({ value, light }) {
  return (
    <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: light ? "rgba(255,255,255,0.2)" : "#EDECDB" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((value || 0) * 100)}%`, background: GOLD }} />
    </div>
  );
}

export { RobinProgressBar };
