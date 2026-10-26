import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { passwordResetConfirm, passwordResetRequest } from "../api.js";
import { Modal } from "./SupportDialogs.jsx";

export function RecoveryRequest({ onClose }) {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await passwordResetRequest(identifier.trim());
      setSent(true);
    } catch (_) {
      setError("No hemos podido procesar la solicitud. Inténtalo de nuevo en unos minutos.");
    } finally { setBusy(false); }
  }

  return <Modal title="Recuperar contraseña" onClose={onClose}>
    {sent ? <div className="robin-report-sent" role="status">
      <CheckCircle2 size={42} />
      <h2>Revisa tu correo</h2>
      <p>Si encontramos una cuenta de alumno asociada, te enviaremos un enlace para crear una contraseña nueva. El enlace caduca en 20 minutos.</p>
      <button className="robin-support-primary" type="button" onClick={onClose}>Cerrar</button>
    </div> : <>
      <p className="robin-support-eyebrow">Acceso al portal</p>
      <h2>Recuperar contraseña</h2>
      <p className="robin-support-description">Escribe tu correo o nombre de usuario. Te enviaremos un enlace al correo asociado a la cuenta.</p>
      <form className="robin-report-form" onSubmit={submit}>
        <label>Correo o usuario
          <input required maxLength={254} autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        </label>
        {error && <p className="robin-report-error" role="alert"><AlertCircle size={16} />{error}</p>}
        <div className="robin-support-actions"><button className="robin-support-primary" type="submit" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : "Enviar enlace"}</button></div>
      </form>
    </>}
  </Modal>;
}

export function ResetPasswordScreen({ token }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true); setError("");
    try {
      await passwordResetConfirm(token, password);
      setDone(true);
      setPassword(""); setConfirm("");
    } catch (submitError) {
      setError(submitError.data?.error === "invalid_or_expired_link"
        ? "Este enlace ha caducado o ya se ha utilizado. Solicita uno nuevo desde el login."
        : "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  return <main className="robin-password-page">
    <div className="robin-support-modal">
      {done ? <div className="robin-report-sent" role="status">
        <CheckCircle2 size={42} />
        <h1>Contraseña actualizada</h1>
        <p>Ya puedes entrar con tu nueva contraseña.</p>
        <a className="robin-support-primary" href="/login">Ir al login</a>
      </div> : <>
        <p className="robin-support-eyebrow">Acceso a Robin</p>
        <h1>Crea una nueva contraseña</h1>
        <p className="robin-support-description">Utiliza al menos 8 caracteres.</p>
        <form className="robin-report-form" onSubmit={submit}>
          <label>Nueva contraseña
            <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>Repetir nueva contraseña
            <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
          {error && <p className="robin-report-error" role="alert"><AlertCircle size={16} />{error}</p>}
          <div className="robin-support-actions"><button className="robin-support-primary" type="submit" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : "Guardar contraseña"}</button></div>
        </form>
      </>}
    </div>
  </main>;
}
