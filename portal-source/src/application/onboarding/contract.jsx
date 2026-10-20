import React, { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { GOLD, NAVY } from "../../theme.js";
import { Btn, Field } from "../../ui.jsx";
import { contractSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';
import contractContent from "../../../../shared/contract-content.cjs";
import financialConfig from "../../../../shared/financial-config.cjs";

const { contractVariant: selectContractVariant } = contractContent;
const { usesInternational2700Plan } = financialConfig;

export function OnboardingContract({ user, onLogout, onDone }) {
  const today = new Date();
  const todayStr = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(today);

  const tipo = (user.tipo || "general").toLowerCase();
  const variant = CONTRACT_VARIANTS[tipo] || CONTRACT_VARIANTS.general;
  const esOtros = (user.origin || "") === "otros";
  const contrato2700 = usesInternational2700Plan(user);
  const esMaestria = contrato2700 && (user.application_level || "") === "maestria";
  const esPasaporte = esOtros && user.has_eu_id === false;
  const docLabel = esPasaporte ? "Pasaporte" : "DNI";
  const contractTitulo = esMaestria
    ? "Contrato — Consultoría académica (Máster)"
    : contrato2700
      ? "Contrato — Consultoría académica (Internacional)"
      : variant.titulo;
  const contractSubtitle = contrato2700
    ? (esMaestria
        ? "Internacional · admisión a programas de máster en Países Bajos"
        : "Internacional · aplicación a universidades en Países Bajos")
    : variant.short;

  const alumnoNombre = `${user.nombre || ""} ${user.apellidos || ""}`.trim() || "—";
  const alumnoDni = user.dni_numero || "—";
  const alumnoDireccion = user.direccion || "—";

  const contractVariant = selectContractVariant(tipo, contrato2700, user.pricing_version);

  const [nombreCliente, setNombreCliente] = useState("");
  const [dniCliente, setDniCliente] = useState("");
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [agree, setAgree] = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleExtra(id) {
    setSelectedExtras((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function submit() {
    if (!nombreCliente.trim() || !dniCliente.trim()) {
      setError("Rellena nombre y DNI del cliente."); return;
    }
    if (!agree) { setError("Debes aceptar los términos y condiciones."); return; }
    if (!sigDataUrl) { setError("Es necesario firmar el contrato."); return; }
    setBusy(true); setError("");
    try {
      await contractSave({
        nombre_cliente: nombreCliente.trim(),
        dni_cliente: dniCliente.trim().toUpperCase(),
        extras: selectedExtras,
        signature_content: sigDataUrl,
      });
      await onDone();
    } catch (e) {
      if (e.data?.error === "dni_not_completed") setError("Antes debes completar la verificación del DNI.");
      else setError(e.message || "No se pudo guardar el contrato.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      title={contractTitulo}
      subtitle={contractSubtitle}
      stepNumber={3}
      icon={<FileText className="h-4 w-4" />}
      onLogout={onLogout}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-sky-50 text-sky-700 border border-sky-100 px-3 py-2 text-sm">
          {esMaestria
            ? "Tus datos personales se han extraído automáticamente de tu documento de identidad. Revisa el contrato y fírmalo para continuar."
            : <>Los datos del <strong>alumno</strong> (nombre, DNI y dirección) se han extraído automáticamente del DNI. El <strong>cliente</strong> (tutor legal) sólo introduce su nombre y su propio DNI.</>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-slate-800" style={{ fontFamily: "'Georgia', serif" }}>
              {contractTitulo}
            </div>
            <div className="text-[11px] text-slate-400">Fecha: {todayStr}</div>
          </div>
          <div className="px-4 py-4 max-h-[520px] overflow-auto text-[13px] leading-relaxed text-slate-700 space-y-2.5">
            {(() => {
              const values = {
                CLIENTE_NOMBRE: nombreCliente || "NOMBRE DEL CLIENTE",
                CLIENTE_DOC: dniCliente || (docLabel + " DEL CLIENTE").toUpperCase(),
                CLIENTE_DOC_LABEL: docLabel,
                ALUMNO_NOMBRE: alumnoNombre,
                ALUMNO_DOC: alumnoDni,
                ALUMNO_DOC_LABEL: docLabel,
                DIRECCION: alumnoDireccion,
                NUM_CARRERAS: "1, 2 o 3",
                FECHA: todayStr,
              };
              return contractVariant.blocks.map((b, i) => renderContractBlock(b, i, values));
            })()}

            <div className="pt-3 mt-3 border-t border-slate-100 space-y-2.5">
              <p className="font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>Firmas</p>
              <p>
                Por PROJECT ROBIN STUDENTS MOBILITY S.L.<br />
                Administrador: Noel Cortes Cordoba — NIF B75355057<br />
                Fecha: <Hl>{todayStr}</Hl>
              </p>
              <p>
                Por El Cliente:<br />
                {esMaestria
                  ? <><Hl>{nombreCliente || "NOMBRE DEL CLIENTE"}</Hl><br />{docLabel} del firmante: <Hl>{dniCliente || "—"}</Hl><br /></>
                  : <><Hl>{nombreCliente || "NOMBRE DEL CLIENTE"}</Hl>, tutor legal de <Hl>{alumnoNombre}</Hl> con {docLabel} <Hl>{alumnoDni}</Hl><br />{docLabel} del firmante (tutor legal): <Hl>{dniCliente || "—"}</Hl><br /></>}
                Fecha: <Hl>{todayStr}</Hl>
              </p>
              <p className="text-[12px] font-semibold text-slate-700 pt-2">
                {contractVariant.acceptanceFooter}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Datos del alumno (extraídos del DNI)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldReadOnly label="Nombre del alumno" value={alumnoNombre} />
            <FieldReadOnly label="DNI del alumno" value={alumnoDni} />
            <div className="sm:col-span-2">
              <FieldReadOnly label="Dirección del alumno" value={alumnoDireccion} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Datos del cliente{esMaestria ? "" : " (tutor legal)"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre completo del cliente" value={nombreCliente} onChange={setNombreCliente} placeholder="Nombre y apellidos" />
            <Field label="DNI del cliente" value={dniCliente} onChange={(v) => setDniCliente(v.toUpperCase())} placeholder="12345678A" />
          </div>
        </div>

        {variant.extras.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Extras opcionales</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {variant.extras.map((x) => {
                const on = selectedExtras.includes(x.id);
                return (
                  <label key={x.id}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition"
                    style={on ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={on} onChange={() => toggleExtra(x.id)} className="hidden" />
                      <span className="h-4 w-4 rounded grid place-items-center flex-shrink-0"
                        style={on ? { background: GOLD } : { background: "transparent", border: "1.5px solid #cbd5e1" }}>
                        {on && <CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />}
                      </span>
                      <span className="font-medium">{x.label}</span>
                    </span>
                    <span className={`text-xs font-semibold ${on ? "text-white/80" : "text-slate-500"}`}>+{x.price} €</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Firma digital</div>
          <SignaturePad onChange={setSigDataUrl} />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
          <span>He leído y acepto los términos y condiciones del contrato.</span>
        </label>

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <Btn className="w-full" size="lg"
          onClick={submit}
          disabled={busy || !agree || !sigDataUrl || !nombreCliente.trim() || !dniCliente.trim()}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <>Firmar y continuar <ChevronRight className="h-4 w-4" /></>}
        </Btn>
      </div>
    </OnboardingShell>
  );
}

const CONTRACT_VARIANTS = {
  general: {
    titulo: "Contrato — Consultoría académica",
    short: "General · aplicación a universidades en Países Bajos",
    extras: [],
  },
  llegada: {
    titulo: "Contrato — Pack Llegada",
    short: "Acompañamiento e instalación en Países Bajos",
    extras: [
      { id: "revision_candidaturas", label: "Revisión de candidaturas", price: 150 },
      { id: "housing_piso",          label: "Housing en piso",           price: 450 },
    ],
  },
  delft: {
    titulo: "Contrato — TU Delft",
    short: "Aplicación + preparación específica para Aeroespaciales en TU Delft",
    extras: [],
  },
  mentoria: {
    titulo: "Contrato — Mentoría",
    short: "Mentoría y adaptación durante el curso académico",
    extras: [
      { id: "revision_candidaturas", label: "Revisión de candidaturas", price: 150 },
    ],
  },
};

function renderContractBlock(b, i, values) {
  switch (b.type) {
    case "h2":
      return <p key={i} className="font-bold text-slate-900 mt-3" style={{ fontFamily: "'Georgia', serif" }}>{b.text}</p>;
    case "h3":
      return <p key={i} className="font-semibold text-slate-800 mt-2">{b.text}</p>;
    case "p":
      return <p key={i}>{renderContractText(b.text, values)}</p>;
    case "ul":
      return (
        <ul key={i} className="list-disc pl-5 space-y-1">
          {(b.items || []).map((it, j) => <li key={j}>{renderContractText(it, values)}</li>)}
        </ul>
      );
    case "spacer":
      return <div key={i} className="h-2" />;
    default:
      return null;
  }
}

function renderContractText(text, values) {
  const parts = String(text || "").split(/(\{\{[A-Z_]+\}\})/);
  return parts.map((p, i) => {
    const m = p.match(/^\{\{([A-Z_]+)\}\}$/);
    if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
    const v = values[m[1]];
    return <Hl key={i}>{v == null || v === "" ? m[1] : v}</Hl>;
  });
}

function Hl({ children }) {
  return (
    <span style={{ background: "rgba(245,166,35,0.25)", padding: "0 4px", borderRadius: 4, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function FieldReadOnly({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</div>
      <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700 border border-slate-100">{value || "—"}</div>
    </div>
  );
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2;
    ctx.strokeStyle = "#0e1c45";
  }, []);

  function pointerXY(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  function start(e) { e.preventDefault(); const { x, y } = pointerXY(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(x, y); setDrawing(true); }
  function move(e) { if (!drawing) return; e.preventDefault(); const { x, y } = pointerXY(e); const ctx = canvasRef.current.getContext("2d"); ctx.lineTo(x, y); ctx.stroke(); setEmpty(false); }
  function end() { if (!drawing) return; setDrawing(false); onChange(canvasRef.current.toDataURL("image/png")); }
  function clear() { const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); setEmpty(true); onChange(""); }

  return (
    <div>
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden relative" style={{ height: 180 }}>
        <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair touch-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {empty && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <span className="text-xs text-slate-400">Firma aquí con el ratón o el dedo</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-slate-400">La firma queda registrada con fecha y hora.</span>
        <button type="button" onClick={clear} className="text-xs text-slate-500 hover:text-slate-800 underline">Borrar firma</button>
      </div>
    </div>
  );
}
