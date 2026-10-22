// Auth feature UI for subscriber auth screen; the application shell selects this view.
import { AlertCircle, CheckCircle2, ChevronLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { AuthShell } from "./AuthShell.jsx";
import { Btn, Field, SelectField } from "../../shared/ui.jsx";
import { NAVY } from "../../shared/theme.js";
import { ROBIN_CITIES } from "../../shared/constants.js";
import { TermsModal } from "../../shared/TermsModal.jsx";
import { useSubscriberAuth } from "./useSubscriberAuth.js";

function SubscriberAuthScreen({ onLogin, onSignup, onBack }) {
  const {
    tab, setTab, email, setEmail, password, setPassword, name, setName,
    confirm, setConfirm, ciudad, setCiudad, discountCode, setDiscountCode,
    discountInfo, setDiscountInfo, checkingCode, tcAccepted, setTcAccepted,
    showTerms, setShowTerms, error, setError, loading, submitLogin,
    submitForgotPassword, submitResetPassword, checkDiscount, submitSignup,
    clearResetLink,
  } = useSubscriberAuth({ onLogin, onSignup });

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 space-y-4">
          {onBack && (
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800">
              <ChevronLeft className="h-4 w-4" /> Cambiar de portal
            </button>
          )}
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Georgia', serif" }}>
              {tab === "login" && "Bienvenido de vuelta"}
              {tab === "signup" && "Crea tu cuenta"}
              {(tab === "forgot" || tab === "forgot-sent") && "Restablece tu contraseña"}
              {tab === "reset" && "Crea una nueva contraseña"}
              {tab === "reset-done" && "Contraseña actualizada"}
            </div>
            <div className="text-sm text-slate-500">
              {tab === "login" && "Accede a The Robin Plan"}
              {tab === "signup" && "Empieza a disfrutar de tu espacio Robin"}
              {tab === "forgot" && "Te enviaremos un enlace seguro a tu correo"}
              {tab === "forgot-sent" && "Revisa tu bandeja de entrada"}
              {tab === "reset" && "Elige una contraseña que no utilices en otros servicios"}
              {tab === "reset-done" && "Ya puedes acceder con tu nueva contraseña"}
            </div>
          </div>

          {(tab === "login" || tab === "signup") && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              {[{ k: "login", l: "Iniciar sesión" }, { k: "signup", l: "Crear cuenta" }].map((t) => (
                <button key={t.k} type="button" onClick={() => { setTab(t.k); setError(""); }}
                  className="flex-1 rounded-lg py-2 text-sm font-medium transition"
                  style={tab === t.k ? { background: "white", color: NAVY, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" } : { color: "#64748b" }}>
                  {t.l}
                </button>
              ))}
            </div>
          )}

          {tab === "login" ? (
            <div className="space-y-4">
              <Field label="Correo" value={email} onChange={setEmail} placeholder="tu@correo.com" />
              <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => { setTab("forgot"); setError(""); }} className="text-xs font-semibold hover:underline" style={{ color: NAVY }}>
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <Btn className="w-full" disabled={loading} onClick={submitLogin}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Entrar
              </Btn>
            </div>
          ) : tab === "signup" ? (
            <div className="space-y-4">
              <Field label="Nombre completo" value={name} onChange={setName} placeholder="Tu nombre" />
              <Field label="Correo" value={email} onChange={setEmail} placeholder="tu@correo.com" />
              <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
              <Field label="Repite la contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
              <SelectField label="Tu ciudad" value={ciudad} onChange={setCiudad} options={ROBIN_CITIES} placeholder="Selecciona tu ciudad" />
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Código de descuento (opcional)</div>
                <div className="flex gap-2">
                  <input value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value); setDiscountInfo(null); }}
                    onBlur={checkDiscount}
                    placeholder="Ej. BIENVENIDA"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition uppercase" />
                  <button type="button" onClick={checkDiscount} disabled={checkingCode || !discountCode.trim()}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: NAVY }}>
                    {checkingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                  </button>
                </div>
                {discountInfo && discountInfo.valid && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Código válido: -{discountInfo.percent_off}% en tu suscripción.</div>
                )}
                {discountInfo && !discountInfo.valid && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-3.5 w-3.5" /> Código no válido o caducado.</div>
                )}
              </div>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={tcAccepted} onChange={(e) => setTcAccepted(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                <span>
                  He leído y acepto los{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="font-semibold underline" style={{ color: NAVY }}>Términos y Condiciones</button>
                  {" "}·{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-xs text-slate-400 hover:text-slate-600 underline">Ver más</button>
                </span>
              </label>
              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <Btn className="w-full" disabled={loading || !tcAccepted} onClick={submitSignup}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Crear cuenta
              </Btn>
            </div>
          ) : tab === "forgot" ? (
            <div className="space-y-4">
              <div className="h-11 w-11 rounded-xl bg-blue-50 grid place-items-center" style={{ color: NAVY }}><Mail className="h-5 w-5" /></div>
              <Field label="Correo" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" />
              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <Btn className="w-full" disabled={loading} onClick={submitForgotPassword}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar enlace
              </Btn>
              <button type="button" onClick={() => { setTab("login"); setError(""); }} className="w-full inline-flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                <ChevronLeft className="h-4 w-4" /> Volver al inicio de sesión
              </button>
            </div>
          ) : tab === "forgot-sent" ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"><CheckCircle2 className="h-6 w-6" /></div>
              <p className="text-sm text-slate-600">Si existe una cuenta asociada a <strong className="text-slate-800">{email}</strong>, recibirás un enlace válido durante 30 minutos.</p>
              <p className="text-xs text-slate-400">Comprueba también la carpeta de spam.</p>
              <Btn variant="secondary" className="w-full" onClick={() => { setTab("login"); setError(""); }}>Volver al inicio de sesión</Btn>
            </div>
          ) : tab === "reset" ? (
            <div className="space-y-4">
              <div className="h-11 w-11 rounded-xl bg-blue-50 grid place-items-center" style={{ color: NAVY }}><KeyRound className="h-5 w-5" /></div>
              <Field label="Nueva contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
              <Field label="Repite la contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
              {error && (
                <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <Btn className="w-full" disabled={loading} onClick={submitResetPassword}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar nueva contraseña
              </Btn>
              <button type="button" onClick={() => { clearResetLink(); setTab("forgot"); setError(""); }} className="w-full text-xs text-slate-500 hover:text-slate-800">Solicitar otro enlace</button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"><CheckCircle2 className="h-6 w-6" /></div>
              <p className="text-sm text-slate-600">Tu contraseña se ha cambiado correctamente.</p>
              <Btn className="w-full" onClick={() => setTab("login")}>Iniciar sesión</Btn>
            </div>
          )}

        </div>
      </div>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </AuthShell>
  );
}

export { SubscriberAuthScreen };
