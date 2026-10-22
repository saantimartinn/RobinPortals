// Career feature UI for cv ai page; the application shell selects this view.
import { Btn, Card, CardContent, Field, TextareaField } from "../../shared/ui.jsx";
import { CheckCircle2, ChevronRight, Download, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { CvChoice } from "./CvChoice.jsx";
import { NAVY } from "../../shared/theme.js";
import React, { useState } from "react";
import { SubIntro } from "../services/SubIntro.jsx";
import { cvBuildHtml } from "./cvBuildHtml.jsx";
import { downloadCvDoc } from "./downloadCvDoc.jsx";
import { subscriberCvAi } from "../../api/index.js";

function CvAiPage({ onBack }) {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [sector, setSector] = useState("");
  const [mode, setMode] = useState("");
  const [inputs, setInputs] = useState("");
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState(null); // { name, dataUrl, mime }
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const pageTitle = mode === "generate" ? "CV Maker" : mode === "analyze" ? "CV Analysis" : "CV";

  function reset() { setStep(1); setPurpose(""); setSector(""); setMode(""); setInputs(""); setCvText(""); setCvFile(null); setResult(null); setError(""); }

  function readFile(f) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCvFile({ name: f.name, dataUrl: reader.result, mime: f.type || "" });
    reader.readAsDataURL(f);
  }
  function onFileInput(e) { const f = e.target.files && e.target.files[0]; e.target.value = ""; readFile(f); }
  function onDrop(e) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; readFile(f); }

  async function run() {
    setLoading(true); setError(""); setResult(null);
    try {
      const payload = mode === "generate"
        ? { mode: "generate", purpose, sector, inputs }
        : { mode: "analyze", purpose, sector, cv_text: cvText, cv_file: cvFile ? cvFile.dataUrl : undefined, cv_mime: cvFile ? cvFile.mime : undefined };
      const r = await subscriberCvAi(payload);
      setResult(r);
      setStep(5);
    } catch (e) {
      const code = e.data && e.data.error;
      setError(code === "ai_unavailable" ? "El asistente de IA no está disponible ahora mismo." : code === "docx_parse_failed" ? "No hemos podido leer el Word. Prueba con PDF o pega el texto." : (e.message || "No hemos podido procesar tu solicitud."));
    } finally { setLoading(false); }
  }

  const canAnalyze = !!(cvText.trim() || cvFile);
  const scoreTone = result && result.score != null ? (result.score >= 7.5 ? "#2E7D5B" : result.score >= 5 ? "#ECB450" : "#C0392B") : NAVY;

  return (
    <div className="space-y-5">
      <SubIntro title={pageTitle} subtitle="Crea o mejora tu CV con ayuda de inteligencia artificial." onBack={step > 1 && step < 5 ? () => setStep(step - 1) : onBack} />
      <Card>
        <CardContent className="space-y-4 py-5">
          {step < 5 && <div className="text-xs font-semibold text-slate-400">Paso {step} de 4</div>}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">¿Cuál es tu objetivo con el CV?</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <CvChoice active={purpose === "temporal"} title="Trabajo temporal" desc="Un empleo a tiempo parcial o temporal mientras estudias." onClick={() => { setPurpose("temporal"); setStep(2); }} />
                <CvChoice active={purpose === "professional"} title="Trabajo profesional" desc="Un puesto definitivo acorde a tu formación." onClick={() => { setPurpose("professional"); setStep(2); }} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">¿A qué sector te quieres dedicar o qué estás estudiando?</div>
              <Field label="Sector o estudios" value={sector} onChange={setSector} placeholder="Ej. Marketing, Ingeniería, Hostelería, Derecho..." />
              <Btn disabled={!sector.trim()} onClick={() => setStep(3)}>Continuar <ChevronRight className="h-4 w-4" /></Btn>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">¿Qué quieres hacer?</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <CvChoice active={mode === "generate"} title="CV Maker" desc="Te creamos un CV a medida (Word) a partir de tus datos." onClick={() => { setMode("generate"); setStep(4); }} />
                <CvChoice active={mode === "analyze"} title="CV Analysis" desc="Puntuamos tu CV sobre 10 y te damos mejoras." onClick={() => { setMode("analyze"); setStep(4); }} />
              </div>
            </div>
          )}

          {step === 4 && mode === "generate" && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">Cuéntanos sobre ti</div>
              <TextareaField label="Tus datos" value={inputs} onChange={setInputs} rows={8}
                placeholder="Nombre, contacto, experiencia (empresa, puesto, fechas, logros), educación, habilidades, idiomas, voluntariado..." />
              <div className="text-xs text-slate-400">Cuanto más detalle aportes, mejor será el CV en Word que generaremos.</div>
              {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}
              <Btn disabled={loading || !inputs.trim()} onClick={run}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generar mi CV (Word)</Btn>
            </div>
          )}

          {step === 4 && mode === "analyze" && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-800">Sube tu CV o pega el texto</div>
              <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                className="block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition"
                style={dragOver ? { borderColor: NAVY, background: "#F6F3E0" } : { borderColor: "#DFDED2", background: "#FFFDF5" }}>
                <UploadCloud className="h-6 w-6 mx-auto mb-1" style={{ color: NAVY }} />
                <div className="text-sm text-slate-700 font-medium">{cvFile ? cvFile.name : "Arrastra tu CV aquí o haz clic para subir"}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">PDF o Word (.doc, .docx) · también .txt</div>
                <input type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={onFileInput} />
              </label>
              {cvFile && <button onClick={() => setCvFile(null)} className="text-xs font-semibold" style={{ color: NAVY }}>Quitar archivo</button>}
              <div className="text-xs text-slate-400 text-center">— o —</div>
              <TextareaField label="Pega el texto de tu CV" value={cvText} onChange={setCvText} rows={7} placeholder="Copia y pega aquí el contenido de tu CV..." />
              {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}
              <Btn disabled={loading || !canAnalyze} onClick={run}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analizar mi CV</Btn>
            </div>
          )}

          {step === 5 && result && result.mode === "generate" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold text-slate-800">Tu CV generado</div>
                <Btn size="sm" onClick={() => downloadCvDoc(result.cv)}><Download className="h-3.5 w-3.5" /> Descargar CV (Word)</Btn>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-5 max-h-[60vh] overflow-auto" dangerouslySetInnerHTML={{ __html: cvBuildHtml(result.cv) }} />
              <Btn size="sm" variant="ghost" onClick={reset}>Empezar de nuevo</Btn>
            </div>
          )}

          {step === 5 && result && result.mode === "analyze" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl grid place-items-center text-white flex-shrink-0" style={{ background: scoreTone }}>
                  <div className="text-center leading-none">
                    <div className="text-2xl font-bold">{result.score != null ? result.score : "—"}</div>
                    <div className="text-[10px] opacity-80">/ 10</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">{result.summary}</div>
              </div>
              {result.strengths && result.strengths.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-1.5">Puntos fuertes</div>
                  <div className="space-y-1.5">
                    {result.strengths.map((x, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#2E7D5B" }} /> <span>{x}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {result.improvements && result.improvements.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-1.5">Mejoras sugeridas</div>
                  <div className="space-y-1.5">
                    {result.improvements.map((x, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600"><Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#ECB450" }} /> <span>{x}</span></div>
                    ))}
                  </div>
                </div>
              )}
              <Btn size="sm" variant="ghost" onClick={reset}>Analizar otro CV</Btn>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { CvAiPage };
