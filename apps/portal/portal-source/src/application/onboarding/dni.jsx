import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Onboarding step or helper for dni; OnboardingFlow owns the step sequence.
import { useState } from "react";
import { UploadCloud, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { NAVY } from "../../theme.js";
import { Btn, Field } from "../../ui.jsx";
import { dniExtract, dniSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';

export function OnboardingDNI({ user, onLogout, onDone }) {
  useLocale();
  const esPasaporte = user.origin === "otros" && user.has_eu_id === false;
  const docType = esPasaporte ? "passport" : "dni";
  const docLabel = esPasaporte ? "pasaporte" : "DNI";

  const [anverso, setAnverso] = useState(null);
  const [reverso, setReverso] = useState(null);
  const [aPreview, setAPreview] = useState(null);
  const [rPreview, setRPreview] = useState(null);
  const [phase, setPhase] = useState("upload");   // 'upload' | 'review'
  const [manualEntry, setManualEntry] = useState(false);
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
      setManualEntry(!!res.manual_entry);
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
    <OnboardingShell user={user}
      title={t("Verifica la identidad del alumno")}
      subtitle={esPasaporte
        ? t("Necesitamos una foto del pasaporte del alumno para activar la cuenta.")
        : t("Necesitamos dos fotos del DNI del alumno para activar la cuenta.")}
      stepNumber={2}
      onLogout={onLogout}
    >
      {phase === "upload" ? (
        <div className="space-y-5">
          <div className="text-sm text-slate-500">
            {esPasaporte
              ? <>{t("Sube la ")}<strong>{t("página de datos del pasaporte del alumno")}</strong>{t(". Foto clara, sin reflejos, con todos los bordes visibles. Sólo la usamos para extraer los datos personales del alumno.")}</>
              : <>{t("Sube el ")}<strong>{t("DNI del alumno")}</strong>{t(". Foto clara, sin reflejos, con todos los bordes visibles. Sólo lo usamos para extraer los datos personales del alumno.")}</>}
          </div>

          {esPasaporte ? (
            <div className="grid grid-cols-1 gap-3">
              <UploadSlot label={t("Página de datos del pasaporte")} preview={aPreview} onPick={(f) => pick("anverso", f)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UploadSlot label={t("Anverso del DNI del alumno")} preview={aPreview} onPick={(f) => pick("anverso", f)} />
              <UploadSlot label={t("Reverso del DNI del alumno")} preview={rPreview} onPick={(f) => pick("reverso", f)} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{t(error)}</span>
            </div>
          )}

          <Btn className="w-full" size="lg" disabled={!canExtract || busy} onClick={extract}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t(" Leyendo ")}{t(docLabel)}…</> : <>{t("Continuar ")}<ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm bg-sky-50 text-sky-700 rounded-xl px-3 py-2 border border-sky-100">
            {manualEntry
              ? <>{t("Las imágenes se han guardado, pero no hemos podido leer los datos automáticamente. Escríbelos tal como aparecen en el ")}{t(docLabel)}{t(" antes de confirmar.")}</>
              : <>{t("Revisa los datos del ")}<strong>{t("alumno")}</strong>{t(" extraídos del ")}{t(docLabel)}{t(" y corrige lo que haga falta antes de confirmar.")}</>}
            {esPasaporte && t(" El pasaporte no incluye dirección: complétala manualmente.")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("Nombre")} value={fields.nombre} onChange={(v) => setFields((f) => ({ ...f, nombre: v }))} />
            <Field label={t("Apellidos")} value={fields.apellidos} onChange={(v) => setFields((f) => ({ ...f, apellidos: v }))} />
            <div className="sm:col-span-2"><Field label={t("Dirección")} value={fields.direccion} onChange={(v) => setFields((f) => ({ ...f, direccion: v }))} /></div>
            <Field label={t("Fecha de nacimiento")} type="date" value={fields.fecha_nacimiento} onChange={(v) => setFields((f) => ({ ...f, fecha_nacimiento: v }))} />
            <Field label={esPasaporte ? t("Número de pasaporte") : t("Número de DNI")} value={fields.dni_numero} onChange={(v) => setFields((f) => ({ ...f, dni_numero: v.toUpperCase() }))} />
            <div className="sm:col-span-2"><Field label={t("Teléfono del alumno")} type="tel" value={fields.telefono_alumno} onChange={(v) => setFields((f) => ({ ...f, telefono_alumno: v }))} placeholder="+34 600 000 000" /></div>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{t(error)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setPhase("upload")} disabled={busy}>{t("Volver")}</Btn>
            <Btn className="flex-1" size="lg" onClick={save} disabled={busy || !fields.nombre || !fields.apellidos || !fields.dni_numero || !fields.direccion || !fields.telefono_alumno}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t(" Guardando…")}</> : <>{t("Confirmar y continuar ")}<ChevronRight className="h-4 w-4" /></>}
            </Btn>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}

function UploadSlot({ label, preview, onPick }) {
  useLocale();
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onPick(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="relative block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition cursor-pointer overflow-hidden min-h-[180px]">
        {preview ? (
          <img src={preview} alt={t("Vista previa: {0}", [label])} className="w-full h-[180px] object-cover" />
        ) : (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="h-10 w-10 rounded-full grid place-items-center text-white" style={{ background: NAVY }}>
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-slate-700">{t(label)}</div>
            <div className="text-xs text-slate-400">{t("Foto clara, sin reflejos")}</div>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}
