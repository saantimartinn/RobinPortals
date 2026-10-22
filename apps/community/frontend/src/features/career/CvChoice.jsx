// Career feature UI for cv choice; the application shell selects this view.
import { NAVY } from "../../shared/theme.js";
import React from "react";

function CvChoice({ active, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="text-left rounded-2xl border p-4 transition hover: w-full"
      style={active ? { borderColor: NAVY, background: "#F6F3E0" } : { borderColor: "#EDECDB", background: "#FEFBE5" }}>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
    </button>
  );
}

export { CvChoice };
