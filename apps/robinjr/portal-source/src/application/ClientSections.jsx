// Portal view or navigation module for client sections; the application shell owns session state.
import React, { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, CreditCard, Download, Eye, FileText, Loader2, MapPin, Shield, UploadCloud, X } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader } from "../ui.jsx";
import { CREAM, GOLD, NAVY } from "../theme.js";
import { eur, PaymentStatusBadge, paymentTitle } from "./payments/payment-utils.jsx";
import { statusLabel } from "./documents/document-utils.js";
import { Factura } from "./payments/InvoiceReceipt.jsx";
import {
  paymentsList, paymentsCheckout, careersListMine,
  documentsList, documentsGet, documentsUpload,
} from "../api.js";

export function PagosCliente() {
  const [data, setData] = useState({ user: null, payments: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [facturaPayment, setFacturaPayment] = useState(null);
  const [payBusy, setPayBusy] = useState(false);

  async function refresh() {
    setLoading(true); setLoadError("");
    try {
      const res = await paymentsList();
      setData(res);
    } catch (e) {
      setLoadError(e.message || "No se pudo cargar tus pagos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  function openFactura(p) { setFacturaPayment(p); setFacturaOpen(true); }
  function openInvoice(p) {
    // Si el pago tiene factura de Holded, se abre su PDF; si no (pagos antiguos),
    // se usa la factura imprimible del portal como respaldo.
    if (p && p.payment_data && p.payment_data.holded_invoice_id) {
      window.open("/api/invoice-pdf?payment_id=" + encodeURIComponent(p.id), "_blank", "noopener");
    } else {
      openFactura(p);
    }
  }
  // Inicia el pago real y redirige a la pasarela segura configurada.
  async function startCheckout(p) {
    setPayBusy(true); setLoadError("");
    try {
      const r = await paymentsCheckout(p.installment);
      if (r && r.url) { window.location.href = r.url; return; }
      setLoadError("No se pudo iniciar el pago."); setPayBusy(false);
    } catch (e) {
      if (["revolut_not_configured", "payment_provider_not_configured"].includes(e.data?.error)) setLoadError("La pasarela de pago no está configurada todavía. Contacta con tu asesor.");
      else setLoadError(e.message || "No se pudo iniciar el pago.");
      setPayBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Mis pagos" subtitle="Las cuotas de tu programa" icon={CreditCard} />
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus pagos…
            </div>
          ) : loadError ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{loadError}</div>
          ) : (
            <div className="space-y-3">
              {data.payments.map((p) => {
                const isPaid     = p.status === "paid";
                const isUnlocked = p.status === "unlocked";
                const isLocked   = p.status === "locked";
                return (
                  <div key={p.id} className="student-payment-row rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0"
                      style={isPaid ? { background: "#10b981", color: "white" } : isUnlocked ? { background: GOLD, color: "white" } : { background: "#e2e8f0", color: "#94a3b8" }}>
                      {isPaid ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Shield className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{paymentTitle(p, data.payments.filter((x) => x.installment <= 3).length)} · {eur(p.amount)}</div>
                      <div className="text-xs text-slate-400">
                        {isPaid && p.paid_at && `Pagado el ${new Date(p.paid_at).toLocaleDateString("es-ES")}`}
                        {isUnlocked && p.unlocked_at && `Disponible desde el ${new Date(p.unlocked_at).toLocaleDateString("es-ES")}`}
                        {isLocked && p.installment === 2 && "Disponible tras completar las 3 mentorías con exalumnos"}
                        {isLocked && p.installment === 3 && "Disponible al llegar a la fase Wrap up"}
                        {isLocked && p.installment > 3 && "Se desbloqueará cuando tu asesor lo indique"}
                      </div>
                      {p.due_date && !isPaid && (
                        <div className="text-xs text-amber-600 mt-0.5">Fecha límite: {new Date(p.due_date + "T00:00:00").toLocaleDateString("es-ES")}</div>
                      )}
                    </div>
                    <PaymentStatusBadge status={p.status} />
                    <div className="flex gap-1 flex-shrink-0">
                      {isPaid && (
                        <Btn variant="secondary" size="sm" onClick={() => openInvoice(p)}><FileText className="h-3.5 w-3.5" /> {p.payment_data?.holded_invoice_id ? "Factura" : "Justificante"}</Btn>
                      )}
                      {isUnlocked && (
                        <Btn size="sm" variant="gold" disabled={payBusy} onClick={() => startCheckout(p)}>
                          {payBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pagar"}
                        </Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Factura open={facturaOpen} onClose={() => setFacturaOpen(false)} user={data.user} payment={facturaPayment} />
    </div>
  );
}

// =====================
//  PAGOS — ADMIN (por cliente)
// =====================

export function CarrerasCliente() {
  const [careers, setCareers] = useState([]);
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const closeButtonRef = useRef(null);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const res = await careersListMine();
      setCareers(res.careers || []);
    } catch (e) { setError(e.message || "No se pudo cargar."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!selectedCareer) return undefined;
    const previouslyFocused = document.activeElement;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedCareer(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [selectedCareer]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Mis carreras" subtitle="Explora las opciones que tu asesor ha preparado para ti" icon={BookOpen} />
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : error ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>
          ) : careers.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Aún no tienes carreras asignadas. Tu asesor te las asignará después del diagnóstico inicial.
            </div>
          ) : (
            <div className="student-career-grid">
              {careers.map((c) => {
                return (
                <article key={c.id} className="student-career-card student-career-photo-card student-career-entry" role="button" tabIndex={0} aria-haspopup="dialog" onClick={() => setSelectedCareer(c)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCareer(c); } }}>
                  {c.image_url ? <img className="student-career-photo" src={c.image_url} alt="" /> : <div className="student-career-photo student-career-photo-placeholder"><BookOpen size={25} /></div>}
                  <div className="student-career-card-top">
                    <Badge tone="green">Para ti</Badge>
                    <span className="student-career-expand-label">Ver detalles</span>
                  </div>
                  <div className="student-career-card-copy">
                    <h3>{c.name}</h3>
                    {(c.details?.area || c.university) && <p>{c.details?.area || c.university}</p>}
                  </div>
                  <div className="student-career-card-bottom">
                    <span>{c.city ? <><MapPin size={12} />{c.city}</> : "Opción preparada para ti"}</span>
                  </div>
                </article>
              );})}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedCareer && <div className="student-career-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCareer(null); }}>
        <section className="student-career-modal" role="dialog" aria-modal="true" aria-labelledby="student-career-modal-title">
          <button ref={closeButtonRef} type="button" className="student-career-modal-close" onClick={() => setSelectedCareer(null)} aria-label="Cerrar detalles"><X size={19} /></button>
          {selectedCareer.image_url ? <img className="student-career-modal-photo" src={selectedCareer.image_url} alt="" /> : <div className="student-career-modal-photo student-career-photo-placeholder"><BookOpen size={30} /></div>}
          <div className="student-career-modal-content">
            <Badge tone="green">Para ti</Badge>
            <h2 id="student-career-modal-title">{selectedCareer.name}</h2>
            {(selectedCareer.details?.area || selectedCareer.university) && <p className="student-career-modal-subtitle">{selectedCareer.details?.area || selectedCareer.university}</p>}
            {selectedCareer.city && <p className="student-career-modal-location"><MapPin size={14} />{selectedCareer.city}</p>}
            {selectedCareer.details?.description && <p className="student-career-modal-description">{selectedCareer.details.description}</p>}
            {Array.isArray(selectedCareer.details?.subjects) && selectedCareer.details.subjects.length > 0 && <div className="student-career-subjects"><strong>Asignaturas relacionadas</strong><span>{selectedCareer.details.subjects.join(" · ")}</span></div>}
            {Array.isArray(selectedCareer.details?.requirements) && selectedCareer.details.requirements.length > 0 && <div className="student-career-subjects"><strong>Requisitos</strong><span>{selectedCareer.details.requirements.join(" · ")}</span></div>}
          </div>
        </section>
      </div>}
    </div>
  );
}

// =====================
//  CARRERAS — ADMIN
// =====================

export function DocumentosCliente() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const res = await documentsList();
      setDocs(res.documents || []);
    } catch (e) { setError(e.message || "Error."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function upload(doc, file) {
    if (!file) return;
    setUploadingId(doc.id); setError("");
    try {
      await documentsUpload(doc.id, file);
      await refresh();
    } catch (e) { setError(e.message || "Error al subir."); }
    finally { setUploadingId(null); }
  }
  async function downloadTemplate(doc) {
    const full = await documentsGet(doc.id);
    if (!full.document?.template_url) return;
    const a = document.createElement("a");
    a.href = full.document.template_url;
    a.download = full.document.template_filename || (doc.name + ".file");
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function viewMy(doc) {
    const full = await documentsGet(doc.id);
    if (!full.document?.file_url) return;
    window.open(full.document.file_url, "_blank", "noopener,noreferrer");
  }

  const pending = docs.filter((d) => d.status === "required" || d.status === "rejected");
  const inReview = docs.filter((d) => d.status === "pending_review");
  const validated = docs.filter((d) => d.status === "validated");

  function renderDoc(d) {
    const info = statusLabel(d.status);
    return (
      <div key={d.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-900">{d.name}</div>
            <div className="text-xs text-slate-400">
              {d.required ? "Obligatorio" : "Opcional"}
              {d.deadline && ` · fecha límite ${new Date(`${d.deadline}T00:00:00`).toLocaleDateString("es-ES")}`}
              {d.uploaded_at && ` · subido ${new Date(d.uploaded_at).toLocaleDateString("es-ES")}`}
              {d.rejection_reason && ` · ${d.rejection_reason}`}
            </div>
          </div>
          <Badge tone={info.tone}>{info.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {d.has_template && (
            <Btn variant="secondary" size="sm" onClick={() => downloadTemplate(d)}>
              <Download className="h-3.5 w-3.5" /> Plantilla
            </Btn>
          )}
          {(d.status === "required" || d.status === "rejected") && (
            <>
              <input id={`upload-input-${d.id}`} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d, f); e.target.value = ""; }} />
              <Btn size="sm" disabled={uploadingId === d.id} onClick={() => document.getElementById(`upload-input-${d.id}`)?.click()}>
                {uploadingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Subir
              </Btn>
            </>
          )}
          {d.has_file && (
            <Btn variant="secondary" size="sm" onClick={() => viewMy(d)}>
              <Eye className="h-3.5 w-3.5" /> Ver mi archivo
            </Btn>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Mis documentos" subtitle="Sube los archivos solicitados por tu asesor" icon={FileText} />
        <CardContent>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Aún no tienes documentos solicitados. Aparecerán aquí cuando tu asesor te asigne una carrera.
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes ({pending.length})</div>
                  {pending.map(renderDoc)}
                </div>
              )}
              {inReview.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">En revisión ({inReview.length})</div>
                  {inReview.map(renderDoc)}
                </div>
              )}
              {validated.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Validados ({validated.length})</div>
                  {validated.map(renderDoc)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================
//  DOCUMENTOS — ADMIN
// =====================
