import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import robinStudentArt from "../../../../../packages/brand/assets/robin-student.svg";
import { portalApiUrl } from "../api/core.js";
import "./support.css";

export function Modal({ title, onClose, children, className = "" }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="robin-support-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`robin-support-modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <button className="robin-support-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      {children}
    </section>
  </div>;
}

export function SupportDialogs({ user, reportOpen, onCloseReport, introOpen, onCloseIntro, onOpenReport }) {
  const [kind, setKind] = useState("problem");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user?.email]);
  useEffect(() => {
    if (!reportOpen) { setSent(false); setError(""); setMessage(""); setBusy(false); }
  }, [reportOpen]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(portalApiUrl("/api/report-problem"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, email: email.trim(), message: message.trim(), page: window.location.pathname, website }),
      });
      if (!response.ok) throw new Error("No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.");
      setSent(true);
    } catch (submitError) {
      setError(submitError.message || "No se pudo enviar el mensaje.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    {introOpen && !reportOpen && <Modal title="Una nueva versión del portal" onClose={onCloseIntro} className="robin-intro-modal">
      <img className="robin-intro-bird" src={robinStudentArt} alt="" />
      <p className="robin-support-eyebrow">Estamos mejorando tu experiencia</p>
      <h2>Estamos preparando una nueva y mejorada versión del portal.</h2>
      <p>Si algo no te funciona, no te preocupes. Usa el botón <strong>Reportar problema</strong> y lo revisaremos enseguida.</p>
      <p>¡Tus sugerencias también son super bienvenidas!</p>
      <div className="robin-support-actions">
        <button className="robin-support-secondary" type="button" onClick={onCloseIntro}>Entendido</button>
        <button className="robin-support-primary" type="button" onClick={onOpenReport}>Reportar problema</button>
      </div>
    </Modal>}
    {reportOpen && <Modal title="Reportar problema o sugerencia" onClose={onCloseReport}>
      {sent ? <div className="robin-report-sent" role="status">
        <CheckCircle2 size={42} />
        <h2>Mensaje enviado</h2>
        <p>Gracias por avisarnos. Revisaremos tu mensaje lo antes posible.</p>
        <button className="robin-support-primary" type="button" onClick={onCloseReport}>Cerrar</button>
      </div> : <>
        <p className="robin-support-eyebrow">Estamos aquí para ayudarte</p>
        <h2>Cuéntanos qué ocurre</h2>
        <p className="robin-support-description">Puedes comunicarnos un problema o compartir una sugerencia. Te responderemos al correo que indiques.</p>
        <form className="robin-report-form" onSubmit={submit}>
          <label>¿Qué quieres enviar?
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="problem">Un problema</option>
              <option value="suggestion">Una sugerencia</option>
            </select>
          </label>
          <label>Tu correo
            <input type="email" required maxLength={254} autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>Cuéntanos los detalles
            <textarea required minLength={15} maxLength={3000} rows={5} placeholder="Describe qué estabas intentando hacer y qué ocurrió..." value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <label className="robin-report-honeypot" aria-hidden="true">Página web<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          {error && <p className="robin-report-error" role="alert"><AlertCircle size={16} />{error}</p>}
          <div className="robin-support-actions"><button className="robin-support-primary" type="submit" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : "Enviar mensaje"}</button></div>
        </form>
      </>}
    </Modal>}
  </>;
}
