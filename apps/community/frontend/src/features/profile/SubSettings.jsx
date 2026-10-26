// Profile feature UI for sub settings; the application shell selects this view.
import { Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { Loader2, Lock, LogOut } from "lucide-react";
import React, { useState } from "react";
import { SubSubscription } from "../subscription/SubSubscription.jsx";
import { changePassword } from "../../api/index.js";

function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess(false);
    if (next !== confirm) { setError("Las contraseñas nuevas no coinciden."); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm(""); setOpen(false); setSuccess(true);
    } catch (submitError) {
      setError(submitError.status === 401
        ? "La contraseña actual no es correcta o la sesión ha caducado."
        : submitError.data?.error === "weak_password"
          ? "La nueva contraseña debe tener entre 8 y 72 bytes."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  return <Card>
    <CardHeader title="Seguridad" icon={Lock} subtitle="Cambia la contraseña de tu acceso Robin." />
    <CardContent>
      {success && <p className="text-sm text-emerald-700 mb-4" role="status">Contraseña actualizada correctamente.</p>}
      {!open ? <Btn onClick={() => { setSuccess(false); setOpen(true); }}>Cambiar contraseña</Btn> : <form className="grid gap-4 max-w-md" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Contraseña actual
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" type="password" required autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Nueva contraseña
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Repetir nueva contraseña
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : "Guardar contraseña"}</Btn>
          <button type="button" className="px-3 py-2 text-sm text-slate-600" onClick={() => { setOpen(false); setCurrent(""); setNext(""); setConfirm(""); setError(""); }}>Cancelar</button>
        </div>
      </form>}
    </CardContent>
  </Card>;
}

function SubSettings({ user, requests = [], onUserRefresh, onLogout }) {
  return (
    <div className="space-y-5">
      <ChangePasswordCard />

      <SubSubscription user={user} requests={requests} onUserRefresh={onUserRefresh} />

      <Card>
        <CardHeader title="Sesión" icon={LogOut} />
        <CardContent>
          <Btn variant="danger" onClick={onLogout}><LogOut className="h-4 w-4" /> Cerrar sesión</Btn>
        </CardContent>
      </Card>
    </div>
  );
}

export { SubSettings };
