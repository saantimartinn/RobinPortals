import { useMemo, useState, useEffect } from "react";
import { MessageCircle, Calendar, LayoutDashboard, Shield, CheckCircle2, Users, Plus, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { GOLD, NAVY } from "../../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader, Divider } from "../../ui.jsx";
import { APP_PHASE_LABELS } from "../documents/document-utils.js";
import { KpiCard, Row } from "../../shared/PortalWidgets.jsx";
import { adminDashboard, adminTaskCreate } from "../../api.js";
import { dashboardAlerts, dashboardClientMetrics, dashboardFinancialSummary, dashboardPhaseMetrics } from "./dashboard-utils.js";

export function AdminDashboard({ user, onOpenClient, onOpenAssign, onGotoTab }) {
  const adminId = (user.email || user.username || "").toLowerCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [alertSort, setAlertSort] = useState("urgency"); // 'urgency' | 'name' | 'days'
  const [taskTitle, setTaskTitle] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskComposerOpen, setTaskComposerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await adminDashboard();
        if (!cancel) setData(res);
      } catch (e) {
        if (!cancel) setError(e.message || "No se pudo cargar el dashboard.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [refreshKey, adminId]);

  const clients   = (data && data.clients)   || [];
  const payments  = (data && data.payments)  || [];
  const documents = (data && data.documents) || [];
  const activity  = (data && data.activity)  || [];
  const tasks     = (data && data.tasks)     || [];
  const team      = (data && data.team)      || [];
  const onboardingClients = clients.filter((c) => c.requires_onboarding);
  const upcomingBookings = useMemo(() => {
    const arr = (data && data.bookings) || [];
    const now = Date.now() - 30 * 60_000; // tolerancia 30 min hacia atrás
    return arr.filter((b) => b.status !== "cancelled" && new Date(b.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  }, [data]);

  const phaseMetrics = useMemo(() => dashboardPhaseMetrics(clients), [clients]);
  const { phaseCounts, avgPhaseDays, bottleneck } = phaseMetrics;
  const fin = useMemo(() => dashboardFinancialSummary(payments), [payments]);
  const alerts = useMemo(() => dashboardAlerts({ clients, payments, documents, sort: alertSort }), [clients, payments, documents, alertSort]);
  const mgmt = useMemo(() => dashboardClientMetrics(clients, alerts), [clients, alerts]);

  // ----- Acciones quick -----
  async function quickAddTask() {
    const t = taskTitle.trim();
    if (!t) return;
    setTaskBusy(true);
    try {
      await adminTaskCreate({ title: t });
      setTaskTitle("");
      setTaskComposerOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      alert("Error creando tarea: " + (e.message || ""));
    } finally {
      setTaskBusy(false);
    }
  }
  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando dashboard…
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="text-rose-700 text-sm">
          <AlertCircle className="h-4 w-4 inline-block mr-2" /> {error}
          <div className="mt-3">
            <Btn size="sm" variant="secondary" onClick={() => setRefreshKey((k) => k + 1)}>Reintentar</Btn>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* ───── TOP: KPIs ───── */}
      <div className="admin-dashboard-kpis grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Clientes activos" value={mgmt.total} tone="navy"
          sub={`+${mgmt.new7} en 7d · +${mgmt.new30} en 30d`} />
        <KpiCard icon={AlertCircle} label="Requieren atención" value={mgmt.highPriority} tone="rose"
          sub={alerts.filter(a => a.kind==="fuego" || a.kind==="impago").length + " alertas críticas"} />
        <KpiCard icon={CreditCard} label="Cobrado" value={`${Math.round(fin.collected)}€`} tone="gold"
          sub={`${fin.pct}% de ${Math.round(fin.total)}€`} />
        <KpiCard icon={LayoutDashboard} label="Cuello de botella" value={bottleneck ? `Fase ${bottleneck}` : "—"}
          tone="slate" sub={bottleneck ? (APP_PHASE_LABELS.find(p=>p.key===bottleneck)?.label || "") : "Sin datos"} />
      </div>

      {/* ───── MIDDLE: Alerts (left) · Pipeline (center) · Activity+Tasks (right) ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr_1fr] gap-5">
        {/* ALERTS */}
        <Card>
          <CardHeader title="Alertas / Prioridades" icon={AlertCircle}
            subtitle={`${alerts.length} elemento(s)`}
            right={
              <select value={alertSort} onChange={(e) => setAlertSort(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1">
                <option value="urgency">Urgencia</option>
                <option value="days">Días en fase</option>
                <option value="name">Nombre</option>
              </select>
            } />
          <CardContent className="space-y-2 max-h-[480px] overflow-auto">
            {alerts.length === 0 && <div className="text-xs text-slate-500">Sin alertas. ¡Buen trabajo!</div>}
            {alerts.map((a, i) => (
              <button key={i}
                onClick={() => onOpenClient && onOpenClient(a.client)}
                className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3 py-2.5 flex items-center gap-3 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {a.client.nombre || a.client.email || a.client.lead_id || "—"} {a.client.apellidos || ""}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{a.label}</div>
                </div>
                <Badge tone={a.kind==="fuego" ? "rose" : a.kind==="impago" ? "amber" : a.kind==="docs" ? "blue" : "slate"}>
                  {a.kind==="fuego" ? "Fuego" : a.kind==="impago" ? "Impago" : a.kind==="docs" ? "Docs" : "Plazo"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* PIPELINE */}
        <Card>
          <CardHeader title="Mapa de progreso" icon={LayoutDashboard} subtitle="Clientes por fase" />
          <CardContent className="space-y-2.5">
            {APP_PHASE_LABELS.map((p) => {
              const count = phaseCounts[p.key] || 0;
              const max = Math.max(1, ...Object.values(phaseCounts));
              const pct = Math.round((count / max) * 100);
              const isBottleneck = bottleneck === p.key && count > 0;
              const avg = avgPhaseDays[p.key];
              return (
                <div key={p.key} className="rounded-xl border border-slate-200 px-3 py-2.5 bg-white">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Fase {p.key}</div>
                      <div className="text-sm font-semibold text-slate-800 truncate">{p.label}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {avg != null && <span className="text-[11px] text-slate-500">⌀ {avg}d</span>}
                      {isBottleneck && <Badge tone="amber">Cuello</Badge>}
                      <Badge tone="navy">{count}</Badge>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: isBottleneck ? GOLD : NAVY }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ONBOARDING + ACTIVITY */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Clientes onboarding" icon={Users} subtitle={`${onboardingClients.length} sin terminar`} />
            <CardContent className="space-y-2 max-h-[320px] overflow-auto">
              {onboardingClients.length === 0 && <div className="text-xs text-slate-500">Nadie en onboarding ahora mismo.</div>}
              {onboardingClients.map((c) => {
                const nm = [c.nombre, c.apellidos].filter(Boolean).join(" ") || c.email || c.lead_id || "—";
                const step = !c.dni_completed ? "DNI" : !c.profile_completed ? "Perfil" : !c.pago_completed ? "Pago" : "Onboarding";
                const days = c.created_at ? Math.max(0, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)) : null;
                return (
                  <button key={c.id}
                    onClick={() => onOpenClient && onOpenClient(c)}
                    className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3 py-2.5 flex items-center gap-3 transition">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{nm}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {days != null ? `${days}d en onboarding` : "En onboarding"}{c.lead_id ? ` · ${c.lead_id}` : ""}
                      </div>
                    </div>
                    <Badge tone="amber">{step}</Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Actividad reciente" icon={MessageCircle} subtitle="Últimos 40 eventos" />
            <CardContent className="space-y-2 max-h-[300px] overflow-auto">
              {activity.length === 0 && <div className="text-xs text-slate-500">Sin actividad reciente.</div>}
              {activity.map((ev, i) => {
                const cl = clients.find((c) => c.id === ev.user_id);
                return (
                  <button key={i}
                    onClick={() => cl && onOpenClient && onOpenClient(cl)}
                    className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-50 flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ background:
                        ev.type==="document_upload"   ? "#0ea5e9" :
                        ev.type==="document_validate" ? "#10b981" :
                        ev.type==="document_reject"   ? "#f43f5e" :
                        ev.type==="payment_paid"      ? "#10b981" :
                        ev.type==="payment_unlock"    ? "#f59e0b" :
                        "#94a3b8" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-700 truncate">
                        <span className="font-semibold">{ev.title}</span>
                        {cl && <span className="text-slate-500"> · {cl.nombre || cl.email}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {ev.detail} · {new Date(ev.at).toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ───── PRÓXIMAS LLAMADAS ───── */}
      {/* Bookings dashboard card v1 */}
      <Card>
        <CardHeader title="Próximas llamadas" icon={Calendar} subtitle={`${upcomingBookings.length} reserva(s) con tus alumnos`} />
        <CardContent className="space-y-2">
          {upcomingBookings.length === 0 && (
            <div className="text-xs text-slate-500">Ningún alumno tuyo ha reservado llamada todavía.</div>
          )}
          {upcomingBookings.map((b) => {
            const cl = clients.find((c) => c.id === b.user_id);
            const when = new Date(b.start_at);
            return (
              <button key={b.id} onClick={() => cl && onOpenClient && onOpenClient(cl)}
                className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3 py-2.5 transition">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {cl ? `${cl.nombre || ""} ${cl.apellidos || ""}`.trim() : (b.topic || "Alumno")}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(when)} · {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(when)} · {b.duration_min} min
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {b.meet_join_url && (
                    <a href={b.meet_join_url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold underline" style={{ color: NAVY }}>
                      Entrar
                    </a>
                  )}
                  <Badge tone="green">Confirmada</Badge>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* ───── QUICK ACTIONS ───── */}
      <Card>
        <CardHeader title="Acciones rápidas" icon={Plus} />
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" variant="primary" onClick={onOpenAssign}>
              <Plus className="h-3.5 w-3.5" /> Añadir cliente
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => { setTaskComposerOpen((open) => !open); setTaskTitle(""); }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Crear tarea
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => onGotoTab && onGotoTab("clientes")}>
              <Users className="h-3.5 w-3.5" /> Ver lista clientes
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => setRefreshKey((k) => k + 1)}>
              <Loader2 className="h-3.5 w-3.5" /> Recargar
            </Btn>
          </div>
          {taskComposerOpen && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void quickAddTask(); }}>
            <input className="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" autoFocus required maxLength={160} placeholder="Título de la tarea" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
            <Btn size="sm" variant="primary" type="submit" disabled={taskBusy || !taskTitle.trim()}>{taskBusy ? "Guardando…" : "Guardar"}</Btn>
            <Btn size="sm" variant="secondary" type="button" disabled={taskBusy} onClick={() => { setTaskComposerOpen(false); setTaskTitle(""); }}>Cancelar</Btn>
          </form>}
        </CardContent>
      </Card>

      {/* ───── BOTTOM: detailed metrics ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Financial detail */}
        <Card>
          <CardHeader title="Resumen financiero" icon={CreditCard} />
          <CardContent className="space-y-2 text-sm">
            <Row label="Total generado"   value={`${Math.round(fin.total)} €`} />
            <Row label="Cobrado"          value={`${Math.round(fin.collected)} €`} tone="green" />
            <Row label="Pendiente"        value={`${Math.round(fin.pending)} €`} tone="amber" />
            <Row label="% cobrado"        value={`${fin.pct}%`} />
            <Row label="Media por cliente" value={`${fin.avgPerClient} €`} />
          </CardContent>
        </Card>

        {/* Client mgmt detail */}
        <Card>
          <CardHeader title="Gestión de clientes" icon={Users} />
          <CardContent className="space-y-2 text-sm">
            <Row label="Activos"             value={mgmt.total} />
            <Row label="Nuevos (7 días)"     value={mgmt.new7} tone="green" />
            <Row label="Nuevos (30 días)"    value={mgmt.new30} tone="green" />
            <Row label="Inactivos (>30d)"    value={mgmt.inactive} tone="amber" />
            <Row label="Alta prioridad"      value={mgmt.highPriority} tone="rose" />
          </CardContent>
        </Card>

        {/* Team productivity */}
        <Card>
          <CardHeader title="Productividad del equipo" icon={Shield} />
          <CardContent className="space-y-2 text-sm">
            {team.length === 0 && <div className="text-xs text-slate-500">Sin datos de equipo.</div>}
            {team.map((t) => (
              <div key={t.email} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <div className="text-sm font-medium text-slate-700 truncate">{t.email}</div>
                <Badge tone={t.email===adminId ? "navy" : "slate"}>{t.clientCount} cliente(s)</Badge>
              </div>
            ))}
            <Divider />
            <Row label="Tareas abiertas (tú)" value={tasks.filter(t=>t.status==="open").length} />
            <Row label="Tareas completadas (tú)" value={tasks.filter(t=>t.status==="done").length} tone="green" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
