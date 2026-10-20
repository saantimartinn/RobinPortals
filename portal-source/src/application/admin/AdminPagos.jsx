import { useState, useEffect } from "react";
import { FileText, Shield, CheckCircle2, Plus, Trash2, BookOpen, CreditCard, Loader2, Pencil } from "lucide-react";
import { GOLD, NAVY } from "../../theme.js";
import { Btn, Card, CardContent, CardHeader, Field } from "../../ui.jsx";
import { daysBetween, eur, PaymentStatusBadge, paymentTitle } from "../payments/payment-utils.jsx";
import { Factura } from "../payments/InvoiceReceipt.jsx";
import { adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete } from "../../api.js";
import financialConfig from "../../../../shared/financial-config.cjs";

const { APPLICATION_TOTALS, isLatamClient } = financialConfig;

export function AdminPagos({ client }) {
  const [data, setData] = useState({ user: client, payments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [facturaPayment, setFacturaPayment] = useState(null);
  const [now, setNow] = useState(new Date());
  const [xConcept, setXConcept] = useState("");
  const [xAmount, setXAmount] = useState("");
  const [xPreset, setXPreset] = useState("custom");
  const [xTax, setXTax] = useState("21");
  const [xUnits, setXUnits] = useState("1");
  const [xMode, setXMode] = useState("individual");
  const [xHours, setXHours] = useState("4");
  const [xDue, setXDue] = useState("");
  const [xBusy, setXBusy] = useState(false);
  const [xErr, setXErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const res = await adminPaymentsList(client.id);
      setData(res);
    } catch (e) {
      setError(e.message || "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, [client?.id]);

  async function unlock(p) {
    setBusyId(p.id); setError("");
    try {
      await adminPaymentsUnlock(client.id, p.installment);
      await refresh();
    } catch (e) {
      setError(e.message || "No se pudo desbloquear.");
    } finally { setBusyId(null); }
  }
  async function setCarreras(n) {
    setBusyId("carreras"); setError("");
    try {
      await adminPaymentsSetCarreras(client.id, n);
      await refresh();
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally { setBusyId(null); }
  }
  async function addExtra() {
    const amt = Number(String(xAmount).replace(",", "."));
    if (xPreset === "custom" && !xConcept.trim()) { setXErr("Indica el concepto del pago."); return; }
    if (xPreset === "custom" && (!isFinite(amt) || amt <= 0)) { setXErr("Indica un importe válido."); return; }
    setXBusy(true); setXErr("");
    try {
      await adminPaymentsAdd(client.id, { preset: xPreset, concept: xConcept.trim(), amount: amt, tax_rate: xTax, units: Number(xUnits), ielts_mode: xMode, ielts_hours: Number(xHours), due_date: xDue || null });
      setXConcept(""); setXAmount(""); setXDue(""); setXPreset("custom"); setXTax("21"); setXUnits("1"); setXMode("individual"); setXHours("4");
      await refresh();
    } catch (e) {
      setXErr(e.message || "No se pudo añadir el pago.");
    } finally { setXBusy(false); }
  }
  async function delExtra(p) {
    if (!window.confirm("¿Eliminar este pago extra? Esta acción no se puede deshacer.")) return;
    setBusyId(p.id); setError("");
    try {
      await adminPaymentsDelete(client.id, p.id);
      await refresh();
    } catch (e) {
      setError(e.message || "No se pudo eliminar el pago.");
    } finally { setBusyId(null); }
  }
  async function saveAmount(p) {
    const amt = Number(String(editVal).replace(",", "."));
    if (!isFinite(amt) || amt <= 0) { setError("Indica un importe válido."); return; }
    setEditBusy(true); setError("");
    try {
      await adminPaymentsSetAmount(client.id, p.installment, amt);
      setEditId(null); setEditVal("");
      await refresh();
    } catch (e) {
      setError(e.message || "No se pudo guardar el importe.");
    } finally { setEditBusy(false); }
  }

  const tipo = (data.user?.tipo || client.tipo || "general").toLowerCase();
  const origin = (data.user?.origin || client.origin || "").toLowerCase();
  const esOtros = origin === "otros";
  const esLatam = isLatamClient(data.user || client);
  const esInternacional = esOtros || esLatam;
  const num = data.user?.num_carreras || client.num_carreras || 1;

  return (
    <div className="space-y-5">
      {tipo === "general" && !esInternacional && (
        <Card>
          <CardHeader title="Paquete contratado" subtitle="Solo para Pack General · ajusta el número de carreras" icon={BookOpen} />
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => {
                const sel = num === n;
            const prices = Object.fromEntries(Object.entries(APPLICATION_TOTALS.general).map(([key, value]) => [key, `${Number(value).toLocaleString("es-ES")} €`]));
                return (
                  <button key={n} onClick={() => setCarreras(n)}
                    disabled={busyId === "carreras"}
                    className="rounded-xl border px-3 py-3 text-sm text-left transition disabled:opacity-50"
                    style={sel ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                    <div className="font-bold">{n} {n === 1 ? "carrera" : "carreras"}</div>
                    <div className={`text-xs ${sel ? "text-white/70" : "text-slate-400"}`}>{prices[n]} · total</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader title="Cuotas del cliente" subtitle={esLatam ? `LATAM · ${Number(APPLICATION_TOTALS.international).toLocaleString("es-ES")} € · sin IVA` : esOtros ? `Internacional · ${Number(APPLICATION_TOTALS.international).toLocaleString("es-ES")} €` : `Tipo de paquete: ${tipo}${tipo === "general" ? ` · ${num} carrera(s)` : ""}`} icon={CreditCard} />
        <CardContent>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <div className="space-y-3">
              {data.payments.map((p) => {
                const isPaid     = p.status === "paid";
                const isUnlocked = p.status === "unlocked";
                const isLocked   = p.status === "locked";
                const daysSinceUnlock = isUnlocked && p.unlocked_at ? daysBetween(p.unlocked_at, now.toISOString()) : null;
                const overdue = daysSinceUnlock !== null && daysSinceUnlock > 3;
                return (
                  <div key={p.id} className="admin-payment-row rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0"
                      style={isPaid ? { background: "#10b981", color: "white" }
                        : isUnlocked ? { background: GOLD, color: "white" }
                        : { background: "#e2e8f0", color: "#94a3b8" }}>
                      {isPaid ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Shield className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{paymentTitle(p, data.payments.filter((x) => x.installment <= 3).length)} · {eur(p.amount)}</div>
                      <div className="text-xs text-slate-400">
                        {isPaid && p.paid_at && `Pagado el ${new Date(p.paid_at).toLocaleDateString("es-ES")}`}
                        {isUnlocked && p.unlocked_at && `Desbloqueado el ${new Date(p.unlocked_at).toLocaleDateString("es-ES")}`}
                        {isLocked && `Bloqueado`}
                      </div>
                      {isUnlocked && daysSinceUnlock !== null && (
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={overdue
                              ? { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }
                              : { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                            {daysSinceUnlock} día{daysSinceUnlock === 1 ? "" : "s"} desde el desbloqueo {overdue ? "· vencido" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {editId === p.id ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input autoFocus value={editVal}
                          onChange={(e) => setEditVal(e.target.value.replace(/[^\d.,]/g, ""))}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right tabular-nums"
                          placeholder="€" />
                        <Btn size="sm" onClick={() => saveAmount(p)} disabled={editBusy}>
                          {editBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                        </Btn>
                        <Btn size="sm" variant="secondary" onClick={() => { setEditId(null); setEditVal(""); }} disabled={editBusy}>Cancelar</Btn>
                      </div>
                    ) : (
                    <>
                    <PaymentStatusBadge status={p.status} />
                    <div className="flex gap-1 flex-shrink-0">
                      {(p.installment === 2 || p.installment === 3) && !isPaid && !esLatam && (
                        <Btn size="sm" variant="secondary" onClick={() => { setEditId(p.id); setEditVal(String(p.amount)); }} title="Editar importe de la cuota">
                          <Pencil className="h-3.5 w-3.5" /> Importe
                        </Btn>
                      )}
                      {isPaid && (
                        <Btn variant="secondary" size="sm" onClick={() => { setFacturaPayment(p); setFacturaOpen(true); }}>
                          <FileText className="h-3.5 w-3.5" /> Justificante
                        </Btn>
                      )}
                      {isLocked && p.installment !== 1 && (
                        <Btn size="sm" onClick={() => unlock(p)} disabled={busyId === p.id}>
                          {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Desbloquear"}
                        </Btn>
                      )}
                      {p.installment >= 4 && (
                        <Btn size="sm" variant="danger" onClick={() => delExtra(p)} disabled={busyId === p.id} title="Eliminar pago extra">
                          {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Btn>
                      )}
                    </div>
                    </>
                    )}
                  </div>
                );
              })}
              <div className="text-[11px] text-slate-400 mt-2">
                Al desbloquear, el cliente recibirá un email a <strong>{data.user?.email || "—"}</strong> indicándole que ya puede pagar la cuota.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Añadir pago extra" subtitle="Para servicios adicionales que contrate el cliente" icon={Plus} />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_170px] gap-3">
            <label className="text-xs font-semibold text-slate-600">Tipo<select value={xPreset} onChange={e => setXPreset(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="custom">Personalizado</option><option value="ielts_evaluation">Evaluación inicial de inglés/IELTS</option><option value="ielts_class">Clase de preparación de inglés/IELTS</option></select></label>
            {xPreset === "custom" ? <Field label="Concepto" value={xConcept} onChange={setXConcept} placeholder="Revisión de candidaturas" /> : xPreset === "ielts_evaluation" ? <label className="text-xs font-semibold text-slate-600">Unidades<select value={xUnits} onChange={e => setXUnits(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">{[1,2,3,4,5,6,10].map(n => <option key={n} value={n}>{n} · {n * 33} €</option>)}</select></label> : <label className="text-xs font-semibold text-slate-600">Modalidad<select value={xMode} onChange={e => setXMode(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="individual">Individual · 33 €/hora</option><option value="group">Grupo · 16,50 €/hora</option></select></label>}
            {xPreset === "custom" ? <Field label="Importe total (€)" value={xAmount} onChange={(v) => setXAmount(v.replace(/[^\d.,]/g, ""))} placeholder="150" /> : xPreset === "ielts_class" ? <label className="text-xs font-semibold text-slate-600">Horas<select value={xHours} onChange={e => setXHours(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">{[4,6,8,12].map(n => <option key={n} value={n}>{n} · {n * (xMode === "group" ? 16.5 : 33)} €</option>)}</select></label> : <div className="text-xs text-slate-500 pt-2">Total: <strong>{Number(xUnits) * 33} €</strong><br/>Exento de IVA</div>}
            {xPreset === "custom" && <label className="text-xs font-semibold text-slate-600">IVA<select value={xTax} onChange={e => setXTax(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="21">21 %</option><option value="exempt">Exento</option></select></label>}
            <Field label="Fecha a pagar" type="date" value={xDue} onChange={setXDue} />
          </div>
          {xErr && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mt-3">{xErr}</div>}
          <div className="flex justify-end mt-3">
            <Btn onClick={addExtra} disabled={xBusy || (xPreset === "custom" && (!xConcept.trim() || !xAmount))}>
              {xBusy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Añadiendo…</> : <><Plus className="h-3.5 w-3.5" /> Añadir pago</>}
            </Btn>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">El pago extra quedará disponible para el cliente de inmediato.</div>
        </CardContent>
      </Card>

      <Factura open={facturaOpen} onClose={() => setFacturaOpen(false)} user={data.user} payment={facturaPayment} />
    </div>
  );
}
