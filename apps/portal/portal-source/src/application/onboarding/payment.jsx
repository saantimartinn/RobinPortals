// Onboarding step or helper for payment; OnboardingFlow owns the step sequence.
import { useState, useEffect } from "react";
import { ChevronRight, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../theme.js";
import { Btn } from "../../ui.jsx";
import { reportClientError } from "../../client-utils.js";
import { onboardingCheckout } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';
import { onboardingOrder } from './onboarding-nav.js';

export function OnboardingPayment({ user, onLogout, onDone }) {
  const amount = Number(user.first_payment_amount);
  const paid = !!user.pago_completed;
  const isMentoria = String(user.tipo || '').toLowerCase() === 'mentoria';
  const hasProfile = onboardingOrder(user).includes('profile');

  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");

  // Si volvemos de la pasarela, el gate principal ya dispara la
  // verificación; aquí mostramos "confirmando" para evitar parpadeo.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment_attempt")) setConfirming(true);
    } catch (error) { reportClientError("optional_operation", error); }
  }, []);

  async function pay() {
    setBusy(true); setError("");
    try {
      if (paid) { await onDone(); return; }
      const r = await onboardingCheckout();
      if (r && r.url) { window.location.href = r.url; return; }
      setError("No se pudo iniciar el pago."); setBusy(false);
    } catch (e) {
      if (e.data?.error === "contract_not_signed") setError("Antes debes firmar el contrato.");
      else if (e.data?.error === "already_paid") { await onDone(); return; }
      else if (["revolut_not_configured", "payment_provider_not_configured"].includes(e.data?.error)) setError("La pasarela de pago no está configurada todavía. Contacta con tu asesor.");
      else setError(e.message || "No se pudo iniciar el pago.");
      setBusy(false);
    }
  }

  const amountStr = Number.isFinite(amount)
    ? amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <OnboardingShell user={user}
      title={isMentoria ? "Abona la Mentoría" : "Realiza el primer pago"}
      subtitle={amountStr ? `Pago seguro con tarjeta · Importe: ${amountStr} €` : "Pago seguro con tarjeta"}
      stepNumber={4}
      onLogout={onLogout}
    >
      <div className="space-y-5">
        {paid ? (
          <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 px-4 py-3 text-sm">{hasProfile ? 'Primer pago confirmado. Ahora vamos con las preguntas de orientación.' : 'Primer pago confirmado. Tu Pack Llegada está activado.'}</div>
        ) : confirming ? (
          <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 px-4 py-3 text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirmando tu pago…
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-2 text-xs">
            🔒 El pago se procesa en una <strong>pasarela segura</strong>. Project Robin no almacena los datos de tu tarjeta.
          </div>
        )}

        <div className="rounded-2xl p-5 relative overflow-hidden text-white"
          style={{ background: NAVY }}>
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50">Project Robin · Pago</div>
            <CreditCard className="h-5 w-5 text-white/70" />
          </div>
          <div className="text-3xl font-bold mt-4 tracking-tight">{amountStr ? `${amountStr} €` : "Importe calculado al continuar"}</div>
          <div className="mt-2 text-xs text-white/60">{isMentoria ? 'Pago único de Mentoría' : 'Primera cuota del programa'}</div>
          {!isMentoria && user.mentoria_credit_eur && <div className="mt-2 text-xs text-white/80">Incluye el descuento de {Number(user.mentoria_credit_eur).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ya abonados por Mentoría.</div>}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <Btn className="w-full" size="lg" variant="gold" onClick={pay} disabled={busy || (!paid && confirming)}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {paid ? "Continuando…" : "Redirigiendo a pago seguro…"}</> : paid ? <>{hasProfile ? 'Continuar con las preguntas' : 'Finalizar onboarding'} <ChevronRight className="h-4 w-4" /></> : <>Continuar al pago{amountStr ? ` · ${amountStr} €` : ""} <ChevronRight className="h-4 w-4" /></>}
        </Btn>

        <div className="text-[11px] text-slate-400 text-center">
          {paid ? hasProfile ? 'Tu pago ya está registrado. Continúa para completar tu perfil académico.' : 'Tu pago ya está registrado. Puedes finalizar el onboarding.' : isMentoria ? 'Serás redirigido a la pasarela de pago segura para abonar la cuota única de Mentoría.' : 'Serás redirigido a la pasarela de pago segura. Al completar el pago quedará registrada la primera cuota; las siguientes las gestionará tu asesor.'}
        </div>
      </div>
    </OnboardingShell>
  );
}
