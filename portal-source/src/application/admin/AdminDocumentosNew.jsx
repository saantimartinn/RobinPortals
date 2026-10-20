import { useState, useEffect } from "react";
import { FileText, UploadCloud, Download, Eye, Plus, Trash2, Loader2 } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader, Field } from "../../ui.jsx";
import { statusLabel } from "../documents/document-utils.js";
import { documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete } from "../../api.js";

export function AdminDocumentosNew({ client }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [newName, setNewName] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [newTemplate, setNewTemplate] = useState(null);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const res = await adminDocumentsList(client.id);
      setDocs(res.documents || []);
    } catch (e) { setError(e.message || "Error."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [client?.id]);

  async function review(d, decision, reason) {
    setBusyId(d.id);
    try { await adminDocumentsReview(d.id, decision, reason); await refresh(); }
    catch (e) { setError(e.message || "Error."); }
    finally { setBusyId(null); }
  }
  async function addCustom() {
    if (!newName.trim()) return;
    setBusyId("new");
    try {
      const payload = { user_id: client.id, name: newName.trim(), required: newRequired };
      await adminDocumentsAdd(payload, newTemplate);
      setNewName(""); setNewRequired(true); setNewTemplate(null);
      await refresh();
    } catch (e) { setError(e.message || "Error."); }
    finally { setBusyId(null); }
  }
  async function delDoc(d) {
    if (!confirm("¿Eliminar este documento?")) return;
    setBusyId(d.id);
    try { await adminDocumentsDelete(d.id); await refresh(); }
    catch (e) { setError(e.message || "Error."); }
    finally { setBusyId(null); }
  }
  async function viewFile(d) {
    const full = await documentsGet(d.id);
    if (full.document?.file_url) window.open(full.document.file_url, "_blank");
  }
  async function viewTpl(d) {
    const full = await documentsGet(d.id);
    if (!full.document?.template_url) return;
    const a = document.createElement("a");
    a.href = full.document.template_url;
    a.download = full.document.template_filename || (d.name + ".file");
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Pedir documento al alumno" subtitle="Opcionalmente adjunta una plantilla" icon={UploadCloud} />
        <CardContent className="space-y-3">
          <Field label="Nombre del documento" value={newName} onChange={setNewName} placeholder="Carta de motivación" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} /> Obligatorio
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plantilla (opcional)</span>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 mt-1 cursor-pointer hover:bg-slate-100">
              {newTemplate ? `📎 ${newTemplate.name}` : "Selecciona un archivo…"}
              <input type="file" className="hidden" onChange={(e) => setNewTemplate(e.target.files?.[0] || null)} />
            </div>
          </label>
          <Btn size="sm" onClick={addCustom} disabled={busyId === "new" || !newName.trim()}>
            <Plus className="h-3.5 w-3.5" /> Añadir solicitud
          </Btn>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Documentos del alumno" subtitle={`${docs.length} total`} icon={FileText} />
        <CardContent>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-6 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Aún sin documentos.</div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => {
                const info = statusLabel(d.status);
                return (
                  <div key={d.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{d.name}</div>
                        <div className="text-xs text-slate-400">
                          {d.required ? "Obligatorio" : "Opcional"}
                          {d.uploaded_at && ` · subido ${new Date(d.uploaded_at).toLocaleDateString("es-ES")} por ${d.uploaded_by === "admin" ? "ti" : "el alumno"}`}
                          {d.source === "career_template" && " · de carrera asignada"}
                          {d.source === "admin_custom" && " · custom"}
                        </div>
                      </div>
                      <Badge tone={info.tone}>{info.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.has_template && (
                        <Btn variant="secondary" size="sm" onClick={() => viewTpl(d)}>
                          <Download className="h-3.5 w-3.5" /> Plantilla
                        </Btn>
                      )}
                      {d.has_file && (
                        <Btn variant="secondary" size="sm" onClick={() => viewFile(d)}>
                          <Eye className="h-3.5 w-3.5" /> Ver archivo
                        </Btn>
                      )}
                      {d.status === "pending_review" && (
                        <>
                          <Btn size="sm" onClick={() => review(d, "validate")} disabled={busyId === d.id}>Validar</Btn>
                          <Btn variant="secondary" size="sm" onClick={() => review(d, "reject")} disabled={busyId === d.id}>No validado</Btn>
                        </>
                      )}
                      {d.status === "validated" && (
                        <Btn variant="secondary" size="sm" onClick={() => review(d, "reject")} disabled={busyId === d.id}>Marcar no válido</Btn>
                      )}
                      <button onClick={() => delDoc(d)} title="Eliminar" className="text-slate-300 hover:text-rose-500 ml-auto">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
