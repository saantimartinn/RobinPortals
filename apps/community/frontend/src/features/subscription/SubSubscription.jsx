// Subscription feature UI for sub subscription; the application shell selects this view.
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2, Star } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader, Row } from "../../shared/ui.jsx";
import { NAVY } from "../../shared/theme.js";
import React, { useMemo, useState } from "react";
import { SUBSCRIBER_SERVICES, SUB_STATUS_LABELS } from "../../shared/constants.js";
import { formatDate } from "../../shared/utils.js";
import { subscriptionPortal } from "../../api/index.js";

function SubSubscription({ user, requests, onUserRefresh }) {
  const statusInfo = SUB_STATUS_LABELS[user.subscription_status] || SUB_STATUS_LABELS.none;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setBusy(true); setError("");
    try {
      const r = await subscriptionPortal();
      if (r && r.url) window.location.href = r.url;
    } catch (e) {
      setError(e.message || "No hemos podido abrir la gestión de tu suscripción.");
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const out = {};
    SUBSCRIBER_SERVICES.forEach((s) => { (out[s.category] = out[s.category] || []).push(s); });
    return out;
  }, []);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Tu suscripción" subtitle={user.subscription_plan === "annual" ? "Plan Anual" : "Plan Mensual"} icon={Star}
          right={<Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>} />
        <CardContent className="space-y-4">
          {user.cancel_at_period_end && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Tu suscripción se cancelará al final del periodo actual ({formatDate(user.current_period_end)}). Puedes reactivarla desde Stripe.</span>
            </div>
          )}
          {user.subscription_status === "past_due" && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Hay un pago pendiente. Actualiza tu método de pago para evitar la suspensión del servicio.</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Row label="Plan" value={user.subscription_plan === "annual" ? "Anual" : "Mensual"} />
            <Row label="Próxima renovación" value={formatDate(user.current_period_end)} />
            <Row label="Inicio de suscripción" value={formatDate(user.subscription_started_at)} />
            <Row label="Renovación automática" value={user.cancel_at_period_end ? "Desactivada" : "Activada"} tone={user.cancel_at_period_end ? "amber" : "green"} />
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <Btn disabled={busy} onClick={openPortal}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Gestionar plan, pago y facturas
          </Btn>
          <div className="text-xs text-slate-400">Desde ahí puedes cambiar de plan (mensual ⇄ anual), pausar o cancelar tu suscripción.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Qué incluye tu plan" icon={CheckCircle2} />
        <CardContent className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-slate-500 mb-2">{cat}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map((s) => (
                  <div key={s.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} /> {s.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Historial de uso" subtitle="Tus solicitudes de servicio más recientes" icon={Clock} />
        <CardContent className="space-y-2">
          {requests.length === 0 && <div className="text-sm text-slate-400">Todavía no has usado ningún servicio.</div>}
          {requests.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <div className="text-sm text-slate-800 truncate">{r.title}</div>
                <div className="text-xs text-slate-400">{formatDate(r.created_at)}</div>
              </div>
              <Badge tone={r.status === "done" ? "green" : r.status === "in_progress" ? "blue" : "amber"}>
                {r.status === "done" ? "Resuelta" : r.status === "in_progress" ? "En curso" : "Abierta"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export { SubSubscription };
