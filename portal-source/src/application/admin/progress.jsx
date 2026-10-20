// Admin workspace module for progress; AdminPortal composes these views.
import { useState, useEffect } from "react";
import { LayoutDashboard, CheckCircle2 } from "lucide-react";
import { CREAM, GOLD, NAVY, NAVY_DARK } from "../../theme.js";
import { Card, CardContent, CardHeader } from "../../ui.jsx";
import { APP_PHASE_LABELS } from "../documents/document-utils.js";
import { adminPhaseSet } from "../../api.js";
import { ClientAvatar } from "./ClientAvatar.jsx";

export function AdminEstadoFases({ client, onChangedPhase }) {
  const [phase, setPhase] = useState(client.application_phase || 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setPhase(client.application_phase || 1); }, [client?.id, client?.application_phase]);

  async function setP(n) {
    setBusy(true); setError("");
    try {
      await adminPhaseSet(client.id, n);
      setPhase(n);
      if (onChangedPhase) onChangedPhase(n);
    } catch (e) { setError(e.message || "Error."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
        <div className="relative flex items-center gap-4">
          <ClientAvatar nombre={client.nombre} apellidos={client.apellidos} size="lg" />
          <div className="min-w-0">
            <div className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Fase actual de la aplicación</div>
            <div className="text-white text-xl font-bold truncate" style={{ fontFamily: "'Georgia', serif" }}>
              {APP_PHASE_LABELS.find((p) => p.key === phase)?.label}
            </div>
            <div className="text-white/60 text-sm truncate">{APP_PHASE_LABELS.find((p) => p.key === phase)?.desc}</div>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}

      <Card>
        <CardHeader title="Selecciona la fase del alumno" subtitle="El alumno verá esta fase reflejada en su portal" icon={LayoutDashboard} />
        <CardContent className="space-y-2">
          {APP_PHASE_LABELS.map((p) => {
            const done = p.key < phase;
            const act = p.key === phase;
            return (
              <button key={p.key} onClick={() => setP(p.key)} disabled={busy}
                className="w-full flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition"
                style={act ? { borderColor: NAVY, background: CREAM } : { borderColor: "#f1f5f9", background: "white" }}>
                <div className="h-8 w-8 rounded-full flex-shrink-0 grid place-items-center font-bold text-sm border-2"
                  style={done ? { background: "#10b981", borderColor: "#10b981", color: "white" }
                    : act ? { background: GOLD, borderColor: GOLD, color: "white" }
                    : { background: "white", borderColor: "#e2e8f0", color: "#94a3b8" }}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : p.key}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${act ? "text-slate-900" : done ? "text-slate-400" : "text-slate-500"}`}>{p.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
