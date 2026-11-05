// Portal view or navigation module for client sections; the application shell owns session state.
import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, CreditCard, Download, Eye, FileText, Loader2, Shield, UploadCloud } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader } from "../ui.jsx";
import { SOFT, GOLD, NAVY } from "../theme.js";
import { eur, PaymentStatusBadge, paymentTitle } from "./payments/payment-utils.jsx";
import { groupStudentDocumentsByCareer, statusLabel } from "./documents/document-utils.js";
import { Factura } from "./payments/InvoiceReceipt.jsx";
import { CareerRequirementsTimeline } from "./careers/CareerRequirementsTimeline.jsx";
import { portalApiUrl } from "../api/core.js";
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
      window.open(portalApiUrl("/api/invoice-pdf?payment_id=" + encodeURIComponent(p.id)), "_blank", "noopener");
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
                      style={isPaid ? { background: "#10b981", color: "#FEFBE5" } : isUnlocked ? { background: GOLD, color: NAVY } : { background: "#EDECDB", color: "#687088" }}>
                      {isPaid ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Shield className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{paymentTitle(p, data.payments.filter((x) => x.installment <= 3).length)} · {eur(p.amount)}</div>
                      <div className="text-xs text-slate-400">
                        {isPaid && p.payment_data?.source === 'mentoria_credit' ? 'Cubierta por el pago de Mentoría' : isPaid && p.paid_at && `Pagado el ${new Date(p.paid_at).toLocaleDateString("es-ES")}`}
                        {isUnlocked && p.unlocked_at && `Disponible desde el ${new Date(p.unlocked_at).toLocaleDateString("es-ES")}`}
                        {isLocked && `Se desbloqueará cuando tu asesor lo indique`}
                      </div>
                      {p.due_date && !isPaid && (
                        <div className="text-xs text-amber-600 mt-0.5">Fecha límite: {new Date(p.due_date + "T00:00:00").toLocaleDateString("es-ES")}</div>
                      )}
                    </div>
                    <PaymentStatusBadge status={p.status} />
                    <div className="flex gap-1 flex-shrink-0">
                      {isPaid && p.amount > 0 && (
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const res = await careersListMine();
      setCareers(res.careers || []);
    } catch (e) { setError(e.message || "No se pudo cargar."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Mis carreras" subtitle="Tu asesor te ha asignado las siguientes" icon={BookOpen} />
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : error ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>
          ) : careers.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Aún no tienes carreras asignadas. Tu asesor te las asignará tras la fase de presentación.
            </div>
          ) : (
            <div className="space-y-2">
              {careers.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <div className="h-9 w-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: SOFT }}>
                    <BookOpen className="h-4 w-4" style={{ color: NAVY }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{c.university}{c.city ? ` · ${c.city}` : ""}</div>
                  </div>
                  <Badge tone="green">Asignada</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CareerRequirementsTimeline careers={careers} />
    </div>
  );
}

// =====================
//  CARRERAS — ADMIN
// =====================

export function DocumentosCliente() {
  const [docs, setDocs] = useState([]);
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [careerError, setCareerError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [documentsResult, careersResult] = await Promise.allSettled([documentsList(), careersListMine()]);
      if (documentsResult.status === "rejected") throw documentsResult.reason;
      setDocs(documentsResult.value.documents || []);
      if (careersResult.status === "fulfilled") {
        setCareers(careersResult.value.careers || []);
        setCareerError("");
      } else {
        setCareerError("No se pudieron cargar las carreras. Los documentos se muestran sin agrupar.");
      }
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

  const { groups, ungrouped } = groupStudentDocumentsByCareer(docs, careerError ? [] : careers);
  const documentGroups = [
    ...groups.map((group) => ({ ...group, key: group.career.id })),
    ...(ungrouped.length ? [{
      key: "other",
      label: careerError ? "Documentos sin clasificar" : "Otros documentos",
      career: null,
      documents: ungrouped,
    }] : []),
  ];

  function renderDoc({ document: d, careerNames }, groupKey) {
    const info = statusLabel(d.status);
    const inputId = `upload-input-${groupKey}-${d.id}`;
    return (
      <div key={`${groupKey}-${d.id}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-900">{d.name}</div>
            <div className="text-xs text-slate-400">
              {d.required ? "Obligatorio" : "Opcional"}
              {d.uploaded_at && ` · subido ${new Date(d.uploaded_at).toLocaleDateString("es-ES")}`}
              {d.rejection_reason && ` · ${d.rejection_reason}`}
            </div>
            {careerNames.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                <span className="font-semibold">Carreras:</span>
                {careerNames.map((name) => <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5">{name}</span>)}
              </div>
            )}
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
              <input id={inputId} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d, f); e.target.value = ""; }} />
              <Btn size="sm" disabled={uploadingId === d.id} onClick={() => document.getElementById(inputId)?.click()}>
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
        <CardHeader title="Mis documentos" subtitle="Cada documento compartido sirve para todas las carreras indicadas: súbelo una sola vez" icon={FileText} />
        <CardContent>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {careerError && <div className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">{careerError}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Aún no tienes documentos solicitados. Aparecerán aquí cuando tu asesor te asigne una carrera.
            </div>
          ) : (
            <div className="space-y-5">
              {documentGroups.map((group) => (
                <section key={group.key} className="space-y-3 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{group.career?.name || group.label}</h2>
                      {group.career?.university && <p className="mt-0.5 text-xs text-slate-500">{group.career.university}{group.career.city ? ` · ${group.career.city}` : ""}</p>}
                    </div>
                    <span className="text-xs text-slate-500">{group.documents.length} {group.documents.length === 1 ? "documento" : "documentos"}</span>
                  </div>
                  <div className="space-y-2">{group.documents.map((entry) => renderDoc(entry, group.key))}</div>
                </section>
              ))}
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
