import { useRef, useState } from "react";
import { Plus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toggleSubjectPreference } from "./subject-ranking.js";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";

const { MAX_ACADEMIC_SUBJECTS } = academicSystemsConfig;

export function SubjectRanking({ value, onChange, system }) {
  const subjects = Array.isArray(value) ? value : [];
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const input = useRef(null);
  const full = subjects.length >= MAX_ACADEMIC_SUBJECTS;

  function add() {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed || full) return;
    if (subjects.some((subject) => subject.name.localeCompare(trimmed, "es", { sensitivity: "base" }) === 0)) {
      setError("Ya has añadido esa asignatura."); return;
    }
    onChange([...subjects, { name: trimmed, level: "", preference: null }]);
    setName(""); setError("");
    setAnnouncement(`${trimmed} añadida. Marca si te gusta o no.`);
    input.current?.focus();
  }
  return <div className="subject-ranking">
    <div className="subject-ranking-add">
      <input ref={input} value={name} maxLength={160} disabled={full} aria-label="Añade una asignatura" placeholder="Escribe una asignatura…" onChange={(event) => { setName(event.target.value); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); add(); } }} />
      <button type="button" className="subject-add-button" disabled={full || !name.trim()} onClick={add}><Plus size={17} /> Añadir</button>
    </div>
    {error && <p className="subject-ranking-error" role="alert">{error}</p>}
    {full && <p className="subject-ranking-note">Puedes añadir hasta {MAX_ACADEMIC_SUBJECTS} asignaturas.</p>}
    <p className="subject-ranking-note">Marca si cada asignatura te gusta o no.</p>
    <span className="sr-only" role="status">{announcement}</span>
    {subjects.length > 0 ? <ul className="subject-ranking-list" aria-label="Tus asignaturas y preferencias">
      {subjects.map((subject, index) => <li key={subject.name} className="subject-ranking-row" data-preference-missing={!subject.preference}>
        <div className="subject-ranking-title"><strong>{subject.name}</strong></div>
        {system?.levels.length > 0 && <select value={subject.level || ""} aria-label={`Nivel de ${subject.name}`}
          onChange={(event) => onChange(subjects.map((entry, i) => i === index ? { ...entry, level: event.target.value } : entry))}>
          <option value="">Nivel…</option>{system.levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select>}
        <div className="subject-ranking-actions">
          <button type="button" className="subject-like" aria-label={`Me gusta ${subject.name}`} aria-pressed={subject.preference === "like"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "like"))}><ThumbsUp size={18} /></button>
          <button type="button" className="subject-dislike" aria-label={`No me gusta ${subject.name}`} aria-pressed={subject.preference === "dislike"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "dislike"))}><ThumbsDown size={18} /></button>
          <button type="button" aria-label={`Eliminar ${subject.name}`} onClick={() => { onChange(subjects.filter((_, i) => i !== index)); setAnnouncement(`${subject.name} eliminada.`); }}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ul> : <div className="subject-ranking-empty">Empieza añadiendo las asignaturas que cursas.</div>}
  </div>;
}
