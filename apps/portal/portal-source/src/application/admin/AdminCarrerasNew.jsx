// Admin workspace module for admin carreras new; AdminPortal composes these views.
import { useState, useEffect } from "react";
import { CheckCircle2, Plus, Trash2, BookOpen, Loader2, Pencil } from "lucide-react";
import { CREAM, NAVY } from "../../theme.js";
import { Btn, Card, CardContent, CardHeader, Divider, Field } from "../../ui.jsx";
import { buildDefaultDocs, newCareerRequirement, normalizeCareerRequirement } from "../documents/document-utils.js";
import { CareerRequirementsTimeline } from "../careers/CareerRequirementsTimeline.jsx";
import { adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign } from "../../api.js";

export function AdminCarrerasNew({ client }) {
  const [library, setLibrary] = useState([]);
  const [assigned, setAssigned] = useState([]); // career_template_ids asignados a este cliente
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // formulario crear carrera
  const [cName, setCName] = useState("");
  const [cUni, setCUni] = useState("");
  const [cCity, setCCity] = useState("");
  const initLevel = client?.application_level === "maestria" ? "maestria" : "grado";
  const [cLevel, setCLevel] = useState(initLevel);
  const [cDocs, setCDocs] = useState(() => buildDefaultDocs(initLevel));
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  function changeLevel(lv) {
    setCLevel(lv);
    setCDocs(buildDefaultDocs(lv));
  }

  async function refresh() {
    setLoading(true); setError("");
    try {
      const all = await adminCareersListAll(client.id);
      setLibrary(all.templates || []);
      setAssigned(all.assigned_template_ids || []);
    } catch (e) {
      setError(e.message || "Error al cargar.");
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [client?.id]);

  function setDocField(i, k, v) {
    setCDocs((arr) => arr.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
  }
  function setRequirementType(i, type) {
    setCDocs((arr) => arr.map((d, idx) => idx === i ? {
      ...d, type, required: type === "document",
      ...(type === "event" ? { template_file: null, template_path: null, template_filename: null, template_mime: null } : {}),
    } : d));
  }
  function addDoc() {
    setCDocs((arr) => [...arr, newCareerRequirement("document")]);
  }
  function addEvent() {
    setCDocs((arr) => [...arr, newCareerRequirement("event")]);
  }
  function removeDoc(i) {
    setCDocs((arr) => arr.filter((_, idx) => idx !== i));
  }
  function attachTemplate(i, file) {
    if (!file) return;
    setCDocs((arr) => arr.map((d, idx) => idx === i ? {
      ...d, template_file: file, template_filename: file.name, template_mime: file.type || "application/octet-stream",
    } : d));
  }
  function clearTemplate(i) {
    setCDocs((arr) => arr.map((d, idx) => idx === i ? { ...d, template_file: null, template_path: null, template_filename: null, template_mime: null } : d));
  }
  function resetForm() {
    setEditingId(null); setCName(""); setCUni(""); setCCity("");
    setCDocs(buildDefaultDocs(cLevel));
  }
  function editTemplate(template) {
    setEditingId(template.id);
    setCName(template.name || ""); setCUni(template.university || ""); setCCity(template.city || "");
    setCDocs((template.required_docs || []).map(normalizeCareerRequirement));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function create() {
    if (!cName.trim() || !cUni.trim()) return;
    if (cDocs.some((item) => !item.name.trim() || !item.deadline)) {
      setError("Cada documento o evento necesita nombre y deadline.");
      return;
    }
    setBusy(true); setError("");
    try {
      const payload = {
        id: editingId || undefined,
        name: cName, university: cUni, city: cCity,
        required_docs: cDocs.filter((d) => d.name && d.name.trim()),
      };
      await adminCareersCreate(payload);
      resetForm();
      await refresh();
    } catch (e) { setError(e.message || "Error al crear."); }
    finally { setBusy(false); }
  }
  async function assign(tplId) {
    setBusy(true); setError("");
    try {
      await adminCareersAssign(client.id, tplId);
      setAssigned((arr) => [...new Set([...arr, tplId])]);
    } catch (e) { setError(e.message || "Error al asignar."); }
    finally { setBusy(false); }
  }
  async function unassign(tplId) {
    setBusy(true); setError("");
    try {
      await adminCareersUnassign(client.id, tplId);
      setAssigned((arr) => arr.filter((x) => x !== tplId));
    } catch (e) { setError(e.message || "Error al quitar."); }
    finally { setBusy(false); }
  }
  async function deleteTpl(tplId) {
    if (!confirm("¿Eliminar esta carrera de la biblioteca? No quita las ya asignadas.")) return;
    setBusy(true);
    try {
      await adminCareersDelete(tplId);
      await refresh();
    } catch (e) { setError(e.message || "Error."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={editingId ? "Editar carrera" : "Crear nueva carrera"} subtitle="Define documentos y eventos con su deadline; los cambios se sincronizan con los alumnos asignados" icon={editingId ? Pencil : Plus}
          right={editingId && <Btn variant="secondary" size="sm" onClick={resetForm}>Cancelar edición</Btn>} />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Nombre" value={cName} onChange={setCName} placeholder="International Business" />
            <Field label="Universidad" value={cUni} onChange={setCUni} placeholder="Maastricht University" />
            <Field label="Ciudad (opcional)" value={cCity} onChange={setCCity} placeholder="Maastricht" />
          </div>
          <Divider />
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Nivel del programa</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => changeLevel("grado")}
                className="px-4 py-2 rounded-xl border text-sm font-medium transition"
                style={cLevel === "grado" ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                Grado
              </button>
              <button type="button" onClick={() => changeLevel("maestria")}
                className="px-4 py-2 rounded-xl border text-sm font-medium transition"
                style={cLevel === "maestria" ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                Máster
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Carga la lista de documentos por defecto según el nivel. Puedes editarlos igualmente debajo.</div>
          </div>
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Requerimientos de la carrera</div>
          <div className="space-y-2">
            {cDocs.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_170px_auto] gap-2 items-center">
                  <select value={d.type || "document"} onChange={(e) => setRequirementType(i, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                    <option value="document">Documento</option>
                    <option value="event">Evento</option>
                  </select>
                  <input value={d.name} onChange={(e) => setDocField(i, "name", e.target.value)}
                    placeholder={d.type === "event" ? "Nombre del evento" : "Nombre del documento"}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm" />
                  <input type="date" value={d.deadline || ""} onChange={(e) => setDocField(i, "deadline", e.target.value)}
                    aria-label={`Deadline de ${d.name || "requerimiento"}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm" />
                  <button onClick={() => removeDoc(i)} title="Quitar" className="text-slate-300 hover:text-rose-500 justify-self-end">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {d.type !== "event" && <div className="flex items-center gap-3 pl-1">
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" checked={!!d.required} onChange={(e) => setDocField(i, "required", e.target.checked)} />
                    Obligatorio
                  </label>
                  {d.template_file ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-2">
                      📎 Plantilla: {d.template_filename}
                      <button onClick={() => clearTemplate(i)} className="text-slate-400 hover:text-rose-500 underline text-[11px]">Quitar</button>
                    </span>
                  ) : (
                    <label className="cursor-pointer text-xs text-slate-500 underline">
                      Adjuntar plantilla (opcional)
                      <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attachTemplate(i, f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>}
              </div>
            ))}
            <div className="flex flex-wrap gap-4">
              <button onClick={addDoc} className="text-xs text-slate-500 hover:text-slate-800 underline">+ Añadir documento</button>
              <button onClick={addEvent} className="text-xs text-slate-500 hover:text-slate-800 underline">+ Añadir evento</button>
            </div>
          </div>
          <div className="flex justify-end">
            <Btn onClick={create} disabled={busy || !cName.trim() || !cUni.trim() || cDocs.some((item) => !item.name.trim() || !item.deadline)}>
              {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {editingId ? "Guardar cambios" : "Crear carrera"}
            </Btn>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Biblioteca de carreras" subtitle="Asígnaselas al alumno desde aquí" icon={BookOpen} />
        <CardContent>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-6 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : library.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Crea la primera carrera arriba.</div>
          ) : (
            <div className="space-y-2">
              {library.map((t) => {
                const sel = assigned.includes(t.id);
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                    style={sel ? { background: CREAM, borderColor: NAVY } : { background: "white", borderColor: "#e2e8f0" }}>
                    <div className="h-8 w-8 rounded-lg flex-shrink-0 grid place-items-center"
                      style={sel ? { background: NAVY, color: "white" } : { background: "#f8fafc", color: "#94a3b8" }}>
                      {sel ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{t.name}</div>
                      <div className="text-xs text-slate-400 truncate">{t.university}{t.city ? ` · ${t.city}` : ""} · {(t.required_docs || []).filter(r => r.type !== "event").length} documento(s) · {(t.required_docs || []).filter(r => r.type === "event").length} evento(s)</div>
                    </div>
                    <Btn variant="secondary" size="sm" onClick={() => editTemplate(t)} disabled={busy}><Pencil className="h-3.5 w-3.5" /> Editar</Btn>
                    {sel ? (
                      <Btn variant="secondary" size="sm" onClick={() => unassign(t.id)} disabled={busy}>Quitar asignación</Btn>
                    ) : (
                      <Btn size="sm" onClick={() => assign(t.id)} disabled={busy}>Asignar al alumno</Btn>
                    )}
                    <button onClick={() => deleteTpl(t.id)} className="text-slate-300 hover:text-rose-500" title="Eliminar de la biblioteca">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <CareerRequirementsTimeline careers={library.filter((template) => assigned.includes(template.id))} title="Timeline del alumno" />
    </div>
  );
}
