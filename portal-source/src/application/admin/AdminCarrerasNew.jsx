// Admin workspace module for Robin Jr career cards and client assignment.
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ImagePlus, Loader2, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { Btn, Card, CardContent, CardHeader, Field, TextareaField } from "../../ui.jsx";
import { adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign } from "../../api.js";

const splitList = (value, separator = /[,\n]/) => String(value || "").split(separator).map((item) => item.trim()).filter(Boolean);

export function AdminCarrerasNew({ client }) {
  const [library, setLibrary] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cArea, setCArea] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cSubjects, setCSubjects] = useState("");
  const [cRequirements, setCRequirements] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photoFile) return undefined;
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);

  async function refresh() {
    setLoading(true); setError("");
    try {
      const all = await adminCareersListAll(client.id);
      setLibrary(all.templates || []);
      setAssigned(all.assigned_template_ids || []);
    } catch (e) { setError(e.message || "Error al cargar las carreras."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [client?.id]);

  function resetForm() {
    setEditingTemplate(null); setCName(""); setCArea(""); setCDescription("");
    setCSubjects(""); setCRequirements(""); setPhotoFile(null); setPhotoPreview("");
    setFormOpen(false);
  }
  function editTemplate(template) {
    const details = template.details || {};
    setEditingTemplate(template);
    setCName(template.name || ""); setCArea(details.area || "");
    setCDescription(details.description || "");
    setCSubjects(Array.isArray(details.subjects) ? details.subjects.join(", ") : "");
    setCRequirements(Array.isArray(details.requirements) ? details.requirements.join("\n") : "");
    setPhotoFile(null); setPhotoPreview(template.image_url || ""); setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveAndAssign() {
    if (!cName.trim() || (!photoFile && !editingTemplate?.image_path)) return;
    setBusy(true); setError("");
    try {
      const response = await adminCareersCreate({
        id: editingTemplate?.id,
        name: cName.trim(),
        university: editingTemplate?.university || "Robin Jr",
        city: editingTemplate?.city || null,
        details: {
          area: cArea.trim(),
          description: cDescription.trim(),
          subjects: splitList(cSubjects),
          requirements: splitList(cRequirements, /\n/),
        },
        image_path: editingTemplate?.image_path || null,
        image_url: editingTemplate?.image_url || null,
        photo_file: photoFile || undefined,
      });
      if (!editingTemplate && response.template?.id) {
        try {
          await adminCareersAssign(client.id, response.template.id);
          setAssigned((current) => [...new Set([...current, response.template.id])]);
        } catch (assignError) {
          await refresh();
          setError(`La carrera se creó, pero no se pudo asignar: ${assignError.message || "inténtalo de nuevo"}`);
          return;
        }
      }
      resetForm();
      await refresh();
    } catch (e) { setError(e.message || "No se pudo guardar la carrera."); }
    finally { setBusy(false); }
  }
  async function assign(templateId) {
    setBusy(true); setError("");
    try {
      await adminCareersAssign(client.id, templateId);
      setAssigned((current) => [...new Set([...current, templateId])]);
    } catch (e) { setError(e.message || "No se pudo asignar la carrera."); }
    finally { setBusy(false); }
  }
  async function unassign(templateId) {
    setBusy(true); setError("");
    try {
      await adminCareersUnassign(client.id, templateId);
      setAssigned((current) => current.filter((id) => id !== templateId));
    } catch (e) { setError(e.message || "No se pudo quitar la asignación."); }
    finally { setBusy(false); }
  }
  async function deleteTemplate(template) {
    if (!confirm(`¿Eliminar “${template.name}” de la biblioteca?`)) return;
    setBusy(true); setError("");
    try { await adminCareersDelete(template.id); await refresh(); }
    catch (e) { setError(e.message || "No se pudo eliminar la carrera."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Carreras del alumno" subtitle="Crea una ficha visual y asígnala a este alumno" icon={BookOpen}
          right={!formOpen && <Btn size="sm" onClick={() => { setError(""); setFormOpen(true); }}><Plus className="h-3.5 w-3.5" /> Crear carrera</Btn>} />
        {formOpen && <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-sm font-semibold text-slate-800">{editingTemplate ? "Editar ficha" : "Nueva ficha de carrera"}</div><p className="text-xs text-slate-500 mt-1">La foto y los datos básicos se mostrarán en la tarjeta del alumno.</p></div>
            <button type="button" onClick={resetForm} className="text-xs text-slate-500 underline">Cancelar</button>
          </div>
          <div className="admin-career-editor-grid">
            <label className="admin-career-photo-upload">
              {photoPreview ? <img src={photoPreview} alt="Vista previa de la carrera" /> : <span><ImagePlus size={27} /><b>Añadir una foto</b><small>JPG, PNG o WEBP · máximo 8 MB</small></span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setPhotoFile(e.target.files?.[0] || null); e.target.value = ""; }} />
              {photoPreview && <span className="admin-career-photo-change"><UploadCloud size={14} />Cambiar foto</span>}
            </label>
            <div className="admin-career-fields">
              <Field label="Nombre de la carrera" value={cName} onChange={setCName} placeholder="Diseño, Biología, Ingeniería…" />
              <Field label="Área" value={cArea} onChange={setCArea} placeholder="Ciencias, arte, tecnología…" />
              <TextareaField label="Descripción breve" value={cDescription} onChange={setCDescription} placeholder="¿Qué se estudia en esta carrera?" rows={3} />
              <Field label="Asignaturas relacionadas" value={cSubjects} onChange={setCSubjects} placeholder="Biología, Matemáticas, Dibujo…" />
              <TextareaField label="Requisitos o perfil recomendado" value={cRequirements} onChange={setCRequirements} placeholder="Escribe un requisito por línea" rows={3} />
            </div>
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}
          <div className="flex justify-end">
            <Btn onClick={saveAndAssign} disabled={busy || !cName.trim() || (!photoFile && !editingTemplate?.image_path)}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingTemplate ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {busy ? "Guardando…" : editingTemplate ? "Guardar cambios" : "Crear y asignar"}
            </Btn>
          </div>
        </CardContent>}
      </Card>

      <Card>
        <CardHeader title="Biblioteca de carreras" subtitle="Fichas disponibles para asignar a este alumno" icon={BookOpen} />
        <CardContent>
          {error && !formOpen && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-6 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando…</div>
          ) : library.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">Todavía no hay fichas. Crea una carrera para este alumno.</div>
          ) : (
            <div className="student-career-grid admin-career-grid">
              {library.map((career) => {
                const isAssigned = assigned.includes(career.id);
                const details = career.details || {};
                return <article key={career.id} className={`student-career-card admin-career-card admin-career-photo-card ${isAssigned ? "is-assigned" : ""}`}>
                  {career.image_url ? <img className="admin-career-card-photo" src={career.image_url} alt="" /> : <div className="admin-career-card-photo admin-career-card-placeholder"><BookOpen size={25} /></div>}
                  <div className="student-career-card-top">
                    <span className="admin-career-area">{details.area || career.city || "Carrera"}</span>
                    <span className={`admin-career-status ${isAssigned ? "is-assigned" : ""}`}>{isAssigned ? "Asignada" : "Disponible"}</span>
                  </div>
                  <div className="student-career-card-copy">
                    <h3>{career.name}</h3>
                    {details.description ? <p>{details.description}</p> : career.university && career.university !== "Robin Jr" && <p>{career.university}</p>}
                  </div>
                  {Array.isArray(details.subjects) && details.subjects.length > 0 && <div className="admin-career-detail-line"><strong>Asignaturas</strong><span>{details.subjects.join(" · ")}</span></div>}
                  {Array.isArray(details.requirements) && details.requirements.length > 0 && <div className="admin-career-detail-line"><strong>Requisitos</strong><span>{details.requirements.join(" · ")}</span></div>}
                  <div className="admin-career-card-actions">
                    <Btn variant="secondary" size="sm" onClick={() => editTemplate(career)} disabled={busy}><Pencil className="h-3.5 w-3.5" /> Editar</Btn>
                    {isAssigned ? <Btn variant="secondary" size="sm" onClick={() => unassign(career.id)} disabled={busy}>Quitar</Btn>
                      : <Btn size="sm" onClick={() => assign(career.id)} disabled={busy}>Asignar</Btn>}
                    <button onClick={() => deleteTemplate(career)} className="admin-career-delete" title="Eliminar de la biblioteca" aria-label={`Eliminar ${career.name}`} disabled={busy}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </article>;
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
