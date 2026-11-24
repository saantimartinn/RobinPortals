import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminDataClient, type LeadReactivationStatus } from "@/services/admin-data";

const statuses: Record<string, string> = { active: "En curso", stopped: "Detenida", completed: "Completada", scheduled: "Programado", sending: "Confirmando envío", sent: "Enviado", delivered: "Entregado", bounced: "Devuelto", complained: "Queja", suppressed: "Excluido", failed: "Error", review: "Requiere revisión", cancelled: "Cancelado" };
const reasons: Record<string, string> = { booking: "Llamada reservada", reply: "Respuesta recibida", email_contact: "Respuesta o contacto del equipo por correo", human_contact: "Contacto del equipo", unsubscribe: "Baja", suppressed: "Dirección excluida", bounced: "Correo devuelto", complained: "Queja de correo", assigned: "Lead asignado", converted: "Cliente", closed_or_contacted: "Estado del lead", not_overdue: "Todavía no supera 30 días", destination_unconfirmed: "Destino sin confirmar", test: "Lead de prueba", invalid_email: "Correo no válido", email_changed: "Correo modificado", other_sequence: "Otra secuencia activa" };

export function LeadReactivation({ leadId }: { leadId: string }) {
  const [data, setData] = useState<LeadReactivationStatus | null>(null);
  const [error, setError] = useState("");
  const [number, setNumber] = useState(1);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(""); setPreview(null); setNotice(""); setNumber(1);
    adminDataClient.leadReactivation(leadId).then(result => { if (active) setData(result); }).catch(error => { if (active) setError(error.message || "No se pudo cargar la secuencia"); });
    return () => { active = false; };
  }, [leadId, retry]);
  async function openPreview() {
    setBusy(true); setNotice("");
    try { setPreview(await adminDataClient.previewReactivation(leadId, number)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo cargar la vista previa"); }
    finally { setBusy(false); }
  }
  async function sendTest() {
    setBusy(true); setNotice("");
    try { const result = await adminDataClient.testReactivation(leadId, number); setNotice(`Prueba enviada a ${result.to}. No cuenta como envío al lead.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo enviar la prueba"); }
    finally { setBusy(false); }
  }
  return <section className="lead-calls"><h3>Reactivación · Holanda &gt;30 días</h3>
    {error ? <p role="alert">{error} <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Reintentar</Button></p> : !data ? <p>Cargando secuencia…</p> : <>
      <p><strong>{data.count} / 8 correos enviados</strong> · {data.enabled ? "Automatización activada" : "Automatización desactivada"}</p>
      {data.blocked && <p role="alert">Los envíos están detenidos por una incidencia en las conexiones. Revisa Gmail, calendario y eventos de correo antes de continuar.</p>}
      <p>{data.enrollment ? statuses[data.enrollment.status] : "Sin inscripción"}{(data.enrollment?.stop_reason || data.exclusion) && ` · ${reasons[data.enrollment?.stop_reason || data.exclusion || ""] || "Excluido de la secuencia"}`}</p>
      {data.messages.length > 0 && <div className="lead-call-history">{data.messages.map(message => <article key={message.id}><div><strong>Correo {message.message_number} · {statuses[message.status] || message.status}</strong></div><p>{new Date(message.sent_at || message.scheduled_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })} · Madrid{message.delivery_status && ` · ${statuses[message.delivery_status] || message.delivery_status}`}</p>{message.error && <small>Este envío requiere revisión.</small>}</article>)}</div>}
      <div className="lead-call-form"><label>Vista previa <select value={number} disabled={busy} onChange={event => { setNumber(Number(event.target.value)); setPreview(null); }}>{data.templates.map(template => <option key={template.number} value={template.number}>{template.number}. {template.subject} · día {template.day}</option>)}</select></label>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void openPreview()}>{busy ? "Cargando…" : "Ver correo"}</Button>
      </div>
      {preview && <><p><strong>{preview.subject}</strong></p><iframe title="Vista previa del correo de reactivación" sandbox="" srcDoc={preview.html} style={{ width: "100%", height: 560, border: "1px solid #d9dce5", borderRadius: 12 }} /><p>La prueba se enviará a {data.testTo}.</p><Button type="button" variant="outline" disabled={busy} onClick={() => void sendTest()}>Enviar prueba</Button></>}
      {notice && <p role="status">{notice}</p>}
    </>}
  </section>;
}
