// Community feature UI for challenge card; the application shell selects this view.
import { Badge, Btn, Card, CardContent, TextareaField } from "../../shared/ui.jsx";
import { CheckCircle2, Clock, Download, Loader2, Pencil, Send, UploadCloud, XCircle } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import React, { useState } from "react";
import { challengeSubmit } from "../../api/index.js";
import { fileToDataUrl } from "./fileToDataUrl.js";

function ChallengeCard({ ch, submission, onSubmitted }) {
  const st = submission ? submission.status : null;
  const locked = st === "validated";
  const [answers, setAnswers] = useState(() => ({ ...(submission && submission.answers) || {} }));
  const [files, setFiles] = useState(() => (submission && submission.files) || []);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!st || st === "rejected");
  const [err, setErr] = useState("");
  const questions = Array.isArray(ch.questions) ? ch.questions : [];
  const adminFiles = Array.isArray(ch.files) ? ch.files : [];

  async function onPick(e) {
    const list = Array.from(e.target.files || []); e.target.value = "";
    const out = [];
    for (const f of list) {
      if (f.size > 2_000_000) { setErr(`"${f.name}" supera 2 MB.`); continue; }
      try { out.push({ name: f.name, data_url: await fileToDataUrl(f) }); } catch (_) {}
    }
    setFiles((p) => [...p, ...out].slice(0, 8));
  }
  function removeFile(i) { setFiles((p) => p.filter((_, j) => j !== i)); }

  async function submit() {
    setErr("");
    for (const q of questions) { if (!(answers[q.id] || "").trim()) { setErr("Responde a todas las preguntas."); return; } }
    setBusy(true);
    try { await challengeSubmit(ch.id, answers, files); await onSubmitted(); }
    catch (e) { setErr(e && e.data && e.data.error === "already_validated" ? "Este reto ya está validado." : (e.message || "No se pudo entregar.")); }
    finally { setBusy(false); }
  }

  const statusBadge = st === "validated" ? <Badge tone="green"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Validado · +{ch.advance_days} días</Badge>
    : st === "pending" ? <Badge tone="amber"><Clock className="h-3 w-3 mr-1 inline" />Pendiente de validar</Badge>
    : st === "rejected" ? <Badge tone="rose">Rechazado</Badge>
    : <Badge tone="gold">+{ch.advance_days} días</Badge>;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{ch.title}</div>
            {ch.description && <div className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{ch.description}</div>}
          </div>
          <div className="flex-shrink-0">{statusBadge}</div>
        </div>

        {adminFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {adminFiles.map((f, i) => (
              <a key={i} href={f.data_url || f.url} download={f.name} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-3.5 w-3.5" /> {f.name || "Archivo"}
              </a>
            ))}
          </div>
        )}

        {st === "rejected" && submission.note && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[13px] text-rose-700">Motivo: {submission.note}</div>
        )}

        {locked ? (
          <div className="text-sm text-emerald-700">¡Reto completado! Los días ya se han sumado a tu progreso.</div>
        ) : (
          <>
            {(st === "pending") && !open && (
              <Btn size="sm" variant="secondary" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /> Editar entrega</Btn>
            )}
            {open && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {questions.map((q) => (
                  <TextareaField key={q.id} label={q.q} rows={2} value={answers[q.id] || ""} onChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))} placeholder="Tu respuesta…" />
                ))}
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Archivos (máx. 2 MB c/u)</div>
                  {files.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                          <span className="truncate text-slate-700">{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-600"><XCircle className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ background: NAVY }}>
                    <UploadCloud className="h-3.5 w-3.5" /> Subir archivo
                    <input type="file" multiple className="hidden" onChange={onPick} />
                  </label>
                </div>
                {err && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{err}</div>}
                <Btn disabled={busy} onClick={submit}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Entregar reto</Btn>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { ChallengeCard };
