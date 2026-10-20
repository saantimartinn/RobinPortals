// Portal view or navigation module for student status; the application shell owns session state.
import { motion } from "framer-motion";
import { Calendar, FileText, CheckCircle2, GraduationCap, Compass, ArrowUpRight } from "lucide-react";
import { APP_STEPS } from "../application-steps.js";
import { CREAM, GOLD, NAVY } from "../theme.js";
import { Card, CardContent, CardHeader } from "../ui.jsx";

export function Estado({ step, onNavigate, docsPendingCount, bookingsCount }) {
  const current = APP_STEPS.find((s) => s.key === step);
  const pct = Math.round(((step - 1) / (APP_STEPS.length - 1)) * 100);

  return (
    <div className="space-y-5 student-overview">
      <div className="student-page-heading"><h1 className="student-eyebrow student-page-title">Mi camino</h1></div>
      <div className="student-progress-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none select-none">
          <div className="text-[140px] font-black text-white leading-none" style={{ fontFamily: "'Georgia', serif" }}>R</div>
        </div>
        <div className="relative">
          <div className="student-step-pill"><span />PASO {step} DE {APP_STEPS.length} · EN CURSO</div>
          <h2 className="text-white text-2xl font-bold mb-2">{current?.label}</h2>
          <div className="text-white/60 text-sm">{current?.desc}</div>
          <div className="mt-5">
            <div className="flex justify-between text-white/80 text-xs mb-2"><span>Tu progreso hasta el destino</span><strong>{pct}%</strong></div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: GOLD }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="student-quick-actions">
        {[
          { label: "Documentos pendientes", value: docsPendingCount ?? "—", hint: "Revisar mis documentos", key: "documentos", icon: FileText },
          { label: "Próximas llamadas", value: bookingsCount ?? "—", hint: "Ver disponibilidad", key: "reservas", icon: Calendar },
          { label: "Tu futuro académico", value: "Mis carreras", hint: "Explorar mis opciones", key: "carreras", icon: GraduationCap },
        ].map(({ label, value, hint, key, icon: Icon }) => (
          <button key={key} onClick={() => onNavigate(key)} className="student-quick-action"><span className="student-quick-icon"><Icon size={20} /></span><span className="student-quick-label">{label}</span><strong>{value}</strong><span className="student-quick-link">{hint}<ArrowUpRight size={16} /></span></button>
        ))}
      </div>

      <Card className="student-roadmap">
        <CardHeader title="Tu hoja de ruta" subtitle="Un paso a la vez. Nosotros te acompañamos." icon={Compass} />
        <CardContent className="space-y-2">
          {APP_STEPS.map((s) => {
            const done = s.key < step;
            const act = s.key === step;
            return (
              <div key={s.key} className={`student-roadmap-step flex items-center gap-4 rounded-xl border px-4 py-3 ${act ? "is-current" : ""}`} aria-current={act ? "step" : undefined}
                style={act ? { borderColor: NAVY, background: CREAM } : { borderColor: "#f1f5f9", background: "white" }}>
                <div className="h-8 w-8 rounded-full flex-shrink-0 grid place-items-center font-bold text-sm border-2"
                  style={done ? { background: "#10b981", borderColor: "#10b981", color: "white" }
                    : act ? { background: GOLD, borderColor: GOLD, color: "white" }
                    : { background: "white", borderColor: "#e2e8f0", color: "#94a3b8" }}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : s.key}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${act ? "text-slate-900" : done ? "text-slate-400 line-through" : "text-slate-500"}`}>{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                </div>
                {act && <span className="student-current-label">Estás aquí</span>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
