// Onboarding step or helper for questionnaire fields; OnboardingFlow owns the step sequence.
import { CheckCircle2 } from "lucide-react";
import { Q_AREAS, Q_GENERAL, Q_MASTER_BLOCKS, Q_VOCACIONAL } from "../../questionnaire-data.js";
import { GOLD, NAVY } from "../../theme.js";

export function initQuestionnaireAnswers() {
  const a = {};
  const all = [Q_GENERAL, Q_VOCACIONAL, ...Object.keys(Q_AREAS).map((k) => Q_AREAS[k]), ...Q_MASTER_BLOCKS];
  all.forEach((blk) => blk.questions.forEach((q) => {
    if (q.type === "slider") a[q.id] = q.def;
  }));
  return a;
}

export function qOptLabel(options, v) {
  const o = (options || []).find((x) => (typeof x === "string" ? x : x.value) === v);
  if (!o) return v;
  return typeof o === "string" ? o : o.label;
}

export function qFmtSlider(def, val) {
  if (def.suffix) return String(val) + def.suffix;
  if (def.left && def.right) return val + "/" + def.max + " (" + def.left + " ↔ " + def.right + ")";
  return val + "/" + def.max;
}

export function QuestionField({ def, value, onChange }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-slate-700 mb-2">
        {def.q}
        {def.optional && <span className="text-slate-400 font-normal"> (opcional)</span>}
        {def.type === "multi" && def.max && <span className="text-slate-400 font-normal"> · máx. {def.max}</span>}
      </div>
      {def.type === "text" && (
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition" />
      )}
      {def.type === "textarea" && (
        <textarea rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition resize-none" />
      )}
      {def.type === "slider" && (
        <QSlider value={value} min={def.min} max={def.max} step={def.step}
          left={def.left} right={def.right} suffix={def.suffix} onChange={onChange} />
      )}
      {(def.type === "single" || def.type === "multi") && (
        <QChoiceGrid options={def.options} value={value} multi={def.type === "multi"} max={def.max} onChange={onChange} />
      )}
    </div>
  );
}

function QSlider({ value, min, max, step, left, right, suffix, onChange }) {
  const v = value == null ? min : value;
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full" style={{ accentColor: NAVY }} />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-slate-400">{left}</span>
        <span className="text-sm font-bold" style={{ color: NAVY }}>{v}{suffix || ""}</span>
        <span className="text-[11px] text-slate-400">{right}</span>
      </div>
    </div>
  );
}

function QChoiceGrid({ options, value, multi, max, onChange }) {
  const arr = multi ? (Array.isArray(value) ? value : []) : [];
  function pick(val) {
    if (multi) {
      if (arr.includes(val)) onChange(arr.filter((x) => x !== val));
      else { if (max && arr.length >= max) return; onChange([...arr, val]); }
    } else {
      onChange(val);
    }
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {(options || []).map((o) => {
        const ov = typeof o === "string" ? o : o.value;
        const ol = typeof o === "string" ? o : o.label;
        const on = multi ? arr.includes(ov) : value === ov;
        return (
          <button key={ov} type="button" onClick={() => pick(ov)}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium text-left transition"
            style={on ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
            <span className="h-4 w-4 rounded grid place-items-center flex-shrink-0"
              style={on ? { background: GOLD } : { background: "transparent", border: "1.5px solid #cbd5e1" }}>
              {on && <CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />}
            </span>
            <span className="leading-tight">{ol}</span>
          </button>
        );
      })}
    </div>
  );
}
