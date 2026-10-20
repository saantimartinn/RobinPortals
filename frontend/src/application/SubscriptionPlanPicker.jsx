import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Badge, Btn } from "../shared/ui.jsx";
import { CREAM, NAVY } from "../shared/theme.js";
import React, { useEffect, useState } from "react";
import { SUBSCRIBER_SERVICES } from "../shared/constants.js";
import { formatMoney } from "../shared/utils.js";
import { subscriptionCheckout, subscriptionPlans } from "../api/index.js";

function SubscriptionPlanPicker({ user, onSubscribed }) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selected, setSelected] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const r = await subscriptionPlans(); setPlans(r.plans || []); }
      catch (_) {}
      finally { setLoadingPlans(false); }
    })();
  }, []);

  async function startCheckout(planKey) {
    setBusy(true); setError("");
    try {
      const r = await subscriptionCheckout(planKey);
      if (r && r.url) window.location.href = r.url;
    } catch (e) {
      setError(e.data && e.data.error === "stripe_prices_not_configured"
        ? "La suscripción todavía no está configurada. Contacta con el equipo Robin."
        : (e.message || "No hemos podido iniciar el pago."));
      setBusy(false);
    }
  }

  const clientName = (user.nombre ? `${user.nombre} ${user.apellidos || ""}` : user.email || "").trim();

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>
            Hola {clientName || ""}, activa tu suscripción
          </div>
          <div className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
            Elige el plan de The Robin Plan y desbloquea acompañamiento, servicios y comunidad para tu vida en el extranjero.
          </div>
          {user.subscription_status === "canceled" && (
            <div className="mt-3 inline-flex"><Badge tone="amber">Tu suscripción anterior está cancelada — puedes reactivarla</Badge></div>
          )}
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {["monthly", "annual"].map((key) => {
            const p = plans.find((x) => x.key === key);
            const label = key === "monthly" ? "Plan Mensual" : "Plan Anual";
            const interval = key === "monthly" ? "/ mes" : "/ año";
            const price = p ? formatMoney(p.amount, p.currency) : null;
            const hasDisc = p && p.discounted_amount != null && p.discount_percent > 0;
            const discPrice = hasDisc ? formatMoney(p.discounted_amount, p.currency) : null;
            const isSel = selected === key;
            const monthlyPlan = plans.find((x) => x.key === "monthly");
            const annualPlan = plans.find((x) => x.key === "annual");
            const savings = (key === "annual" && monthlyPlan && annualPlan && monthlyPlan.amount != null && annualPlan.amount != null)
              ? Math.round(monthlyPlan.amount * 12 - annualPlan.amount)
              : null;
            return (
              <button key={key} type="button" onClick={() => setSelected(key)}
                className="text-left rounded-2xl border-2 p-6 bg-white transition"
                style={{ borderColor: isSel ? NAVY : "#e2e8f0" }}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{label}</div>
                  {key === "annual" && <Badge tone="gold">{savings > 0 ? `Ahorra ${savings}€/año` : "Ahorra"}</Badge>}
                </div>
                <div className="mt-3 text-3xl font-bold text-slate-900">
                  {loadingPlans ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : (hasDisc ? discPrice : (price || "Consultar"))}
                  {(hasDisc ? discPrice : price) && <span className="text-sm font-normal text-slate-400"> {interval}</span>}
                </div>
                {hasDisc && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-slate-400 line-through">{price}</span>
                    <Badge tone="gold">-{p.discount_percent}%</Badge>
                  </div>
                )}
                {p && !p.available && <div className="text-xs text-amber-600 mt-2">Próximamente disponible</div>}
              </button>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto mt-6">
          <div className="rounded-2xl bg-white border border-slate-100 p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Incluido en tu plan</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUBSCRIBER_SERVICES.slice(0, 8).map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: NAVY }} /> {s.title}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Btn size="lg" disabled={busy} onClick={() => startCheckout(selected)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Continuar al pago seguro
            </Btn>
          </div>
          <div className="text-center text-xs text-slate-400 mt-3">Pago procesado por Stripe · puedes cancelar cuando quieras</div>
        </div>
      </div>
    </div>
  );
}

export { SubscriptionPlanPicker };
