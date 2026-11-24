import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Subscription feature UI for sub payments; the application shell selects this view.
import { AlertCircle, Loader2, Receipt, Wallet } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader, Row } from "../../shared/ui.jsx";
import React, { useState } from "react";
import { SUB_STATUS_LABELS } from "../../shared/constants.js";
import { formatDate } from "../../shared/utils.js";
import { subscriptionPortal } from "../../api/index.js";

function SubPayments({ user }) {
  useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const statusInfo = SUB_STATUS_LABELS[user.subscription_status] || SUB_STATUS_LABELS.none;

  async function openPortal() {
    setBusy(true); setError("");
    try {
      const r = await subscriptionPortal();
      if (r && r.url) window.location.href = r.url;
    } catch (e) {
      setError(e.message || "No hemos podido abrir el portal de pagos.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="student-page-heading"><h1>{t('Pagos')}</h1><p>{t('Importes y estados de tu suscripción y facturación.')}</p></div>
      {user.subscription_status === "past_due" && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span><strong>{t("Pago pendiente.")}</strong>{t(" Actualiza tu método de pago para evitar interrupciones en tu suscripción.")}</span>
        </div>
      )}
      <Card>
        <CardHeader title={t("Pagos y facturación")} subtitle={t("Gestionado de forma segura por {0}", [user.payment_provider === "revolut" ? "Revolut" : "Stripe"])} icon={Wallet} right={<Badge tone={statusInfo.tone}>{t(statusInfo.label)}</Badge>} />
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Row label={t("Plan actual")} value={user.subscription_plan === "annual" ? "Anual" : "Mensual"} />
            <Row label={t("Próximo cobro")} value={formatDate(user.current_period_end)} />
          </div>
          {error && <div className="text-sm text-rose-600">{t(error)}</div>}
          {user.payment_provider === "revolut" ? (
            <div className="text-xs text-slate-500">{t("Para consultar facturas o cambiar el método de pago, contacta con el equipo Robin.")}</div>
          ) : (
            <>
              <Btn disabled={busy} onClick={openPortal}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}{t(" Gestionar pagos y facturas")}</Btn>
              <div className="text-xs text-slate-400">{t("Accede a tu método de pago, historial de facturas y recibos descargables.")}</div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { SubPayments };
