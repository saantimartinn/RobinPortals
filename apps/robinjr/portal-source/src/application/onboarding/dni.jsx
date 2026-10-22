// Onboarding step or helper for dni; OnboardingFlow owns the step sequence.
import { useState } from "react";
import { Shield, UploadCloud, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { NAVY } from "../../theme.js";
import { Btn, Field } from "../../ui.jsx";
import { dniExtract, dniSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';

export function OnboardingDNI({ user, onLogout, onDone }) {
  const esPasaporte = user.origin === "otros" && user.has_eu_id === false;
  const docType = esPasaporte ? "passport" : "dni";
  const docLabel = esPasaporte ? "pasaporte" : "DNI";

  const [anverso, setAnverso] = useState(null);
  const [reverso, setReverso] = useState(null);
  const [aPreview, setAPreview] = useState(null);
  const [rPreview, setRPreview] = useState(null);
  const [phase, setPhase] = useState("upload");   // 'upload' | 'review'
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({ nombre: "", apellidos: "", direccion: "", fecha_nacimiento: "", dni_numero: "", telefono_alumno: user.telefono_alumno || "" });

  const canExtract = !!anverso && (esPasaporte || !!reverso);

  async function pick(side, file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === "anverso") { setAnverso(file); setAPreview(url); }
    else { setReverso(file); setRPreview(url); }
  }

  async function extract() {
    if (!canExtract) return;
    setBusy(true); setError("");
    try {
      const res = await dniExtract(anverso, esPasaporte ? null : reverso, docType);
      setFields({
        nombre: res.fields?.nombre || "",
        apellidos: res.fields?.apellidos || "",
        direccion: res.fields?.direccion || "",
        fecha_nacimiento: res.fields?.fecha_nacimiento || "",
        dni_numero: res.fields?.dni_numero || "",
        telefono_alumno: fields.telefono_alumno || user.telefono_alumno || "",
      });
      setPhase("review");
    } catch (e) {
      setError("No se pudo leer el " + docLabel + ". " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true); setError("");
    try {
      await dniSave({
        nombre: fields.nombre.trim(),
        apellidos: fields.apellidos.trim(),
        direccion: fields.direccion.trim(),
        fecha_nacimiento: fields.fecha_nacimiento,
        dni_numero: fields.dni_numero.trim().toUpperCase(),
        telefono_alumno: fields.telefono_alumno.trim(),
      });
      await onDone();
    } catch (e) {
      setError("Error al guardar: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      title="Verifica la identidad del alumno"
      subtitle={esPasaporte
        ? "Necesitamos una foto del pasaporte del alumno para activar la cuenta."
        : "Necesitamos dos fotos del DNI del alumno para activar la cuenta."}
      stepNumber={2}
      icon={<Shield className="h-4 w-4" />}
      onLogout={onLogout}
    >
      {phase === "upload" ? (
        <div className="space-y-5">
          <div className="text-sm text-slate-500">
            {esPasaporte
              ? <>Sube la <strong>página de datos del pasaporte del alumno</strong>. Foto clara, sin reflejos, con todos los bordes visibles. Sólo la usamos para extraer los datos personales del alumno.</>
              : <>Sube el <strong>DNI del alumno</strong>. Foto clara, sin reflejos, con todos los bordes visibles. Sólo lo usamos para extraer los datos personales del alumno.</>}
          </div>

          {esPasaporte ? (
            <div className="grid grid-cols-1 gap-3">
              <UploadSlot label="Página de datos del pasaporte" preview={aPreview} onPick={(f) => pick("anverso", f)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UploadSlot label="Anverso del DNI del alumno" preview={aPreview} onPick={(f) => pick("anverso", f)} />
              <UploadSlot label="Reverso del DNI del alumno" preview={rPreview} onPick={(f) => pick("reverso", f)} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          <Btn className="w-full" size="lg" disabled={!canExtract || busy} onClick={extract}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Leyendo {docLabel}…</> : <>Continuar <ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm bg-sky-50 text-sky-700 rounded-xl px-3 py-2 border border-sky-100">
            Revisa los datos del <strong>alumno</strong> extraídos del {docLabel} y corrige lo que haga falta antes de confirmar.
            {esPasaporte && " El pasaporte no incluye dirección: complétala manualmente."}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre" value={fields.nombre} onChange={(v) => setFields((f) => ({ ...f, nombre: v }))} />
            <Field label="Apellidos" value={fields.apellidos} onChange={(v) => setFields((f) => ({ ...f, apellidos: v }))} />
            <div className="sm:col-span-2"><Field label="Dirección" value={fields.direccion} onChange={(v) => setFields((f) => ({ ...f, direccion: v }))} /></div>
            <Field label="Fecha de nacimiento" type="date" value={fields.fecha_nacimiento} onChange={(v) => setFields((f) => ({ ...f, fecha_nacimiento: v }))} />
            <Field label={esPasaporte ? "Número de pasaporte" : "Número de DNI"} value={fields.dni_numero} onChange={(v) => setFields((f) => ({ ...f, dni_numero: v.toUpperCase() }))} />
            <div className="sm:col-span-2"><Field label="Teléfono del alumno" type="tel" value={fields.telefono_alumno} onChange={(v) => setFields((f) => ({ ...f, telefono_alumno: v }))} placeholder="+34 600 000 000" /></div>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setPhase("upload")} disabled={busy}>Volver</Btn>
            <Btn className="flex-1" size="lg" onClick={save} disabled={busy || !fields.nombre || !fields.apellidos || !fields.dni_numero || !fields.direccion || !fields.telefono_alumno}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <>Confirmar y continuar <ChevronRight className="h-4 w-4" /></>}
            </Btn>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}

function UploadSlot({ label, preview, onPick }) {
  return (
    <label className="relative block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition cursor-pointer overflow-hidden min-h-[180px]">
      {preview ? (
        <img src={preview} alt="" className="w-full h-[180px] object-cover" />
      ) : (
        <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="h-10 w-10 rounded-full grid place-items-center text-white" style={{ background: NAVY }}>
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold text-slate-700">{label}</div>
          <div className="text-xs text-slate-400">Foto clara, sin reflejos</div>
        </div>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </label>
  );
}
