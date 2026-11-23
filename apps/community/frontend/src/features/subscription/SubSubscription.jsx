import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Subscription feature UI for sub subscription; the application shell selects this view.
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2, Star } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader, Row } from "../../shared/ui.jsx";
import { NAVY } from "../../shared/theme.js";
import React, { useMemo, useState } from "react";
import { SUBSCRIBER_SERVICES, SUB_STATUS_LABELS } from "../../shared/constants.js";
import { formatDate } from "../../shared/utils.js";
import { subscriptionCancel, subscriptionPortal } from "../../api/index.js";

function SubSubscription({ user, requests, onUserRefresh }) {
  useLocale();
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

  async function cancelRevolut() {
    if (!window.confirm(t("¿Cancelar la renovación automática de tu suscripción? Conservarás el acceso hasta el final del periodo pagado."))) return;
    setBusy(true); setError("");
    try { await subscriptionCancel(); await onUserRefresh(); }
    catch (e) { setError(e.message || "No hemos podido cancelar la suscripción."); }
    finally { setBusy(false); }
  }

  const grouped = useMemo(() => {
    const out = {};
    SUBSCRIBER_SERVICES.forEach((s) => { (out[s.category] = out[s.category] || []).push(s); });
    return out;
  }, []);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t("Tu suscripción")} subtitle={user.subscription_plan === "annual" ? t("Plan Anual") : t("Plan Mensual")} icon={Star}
          right={<Badge tone={statusInfo.tone}>{t(statusInfo.label)}</Badge>} />
        <CardContent className="space-y-4">
          {user.cancel_at_period_end && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{t("Tu suscripción terminará al final del periodo actual (")}{formatDate(user.current_period_end)}).</span>
            </div>
          )}
          {user.subscription_status === "past_due" && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{t("Hay un pago pendiente. Actualiza tu método de pago para evitar la suspensión del servicio.")}</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Row label="Plan" value={user.subscription_plan === "annual" ? "Anual" : "Mensual"} />
            <Row label={t("Próxima renovación")} value={formatDate(user.current_period_end)} />
            <Row label={t("Inicio de suscripción")} value={formatDate(user.subscription_started_at)} />
            <Row label={t("Renovación automática")} value={user.cancel_at_period_end ? "Desactivada" : "Activada"} tone={user.cancel_at_period_end ? "amber" : "green"} />
          </div>
          {error && <div className="text-sm text-rose-600">{t(error)}</div>}
          {user.payment_provider === "revolut" ? (
            <>
              {!user.cancel_at_period_end && <Btn disabled={busy} onClick={cancelRevolut}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t(" Cancelar renovación")}</Btn>}
              <div className="text-xs text-slate-400">{t("Si necesitas cambiar de plan o método de pago, contacta con el equipo Robin.")}</div>
            </>
          ) : (
            <>
              <Btn disabled={busy} onClick={openPortal}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}{t(" Gestionar plan, pago y facturas")}</Btn>
              <div className="text-xs text-slate-400">{t("Desde ahí puedes cambiar de plan (mensual ⇄ anual), pausar o cancelar tu suscripción.")}</div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("Qué incluye tu plan")} icon={CheckCircle2} />
        <CardContent className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-slate-500 mb-2">{t(cat)}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map((s) => (
                  <div key={s.key} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} /> {t(s.title)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("Historial de uso")} subtitle={t("Tus solicitudes de servicio más recientes")} icon={Clock} />
        <CardContent className="space-y-2">
          {requests.length === 0 && <div className="text-sm text-slate-400">{t("Todavía no has usado ningún servicio.")}</div>}
          {requests.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <div className="text-sm text-slate-800 truncate">{r.title}</div>
                <div className="text-xs text-slate-400">{formatDate(r.created_at)}</div>
              </div>
              <Badge tone={r.status === "done" ? "green" : r.status === "in_progress" ? "blue" : "amber"}>
                {r.status === "done" ? t("Resuelta") : r.status === "in_progress" ? t("En curso") : t("Abierta")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export { SubSubscription };
