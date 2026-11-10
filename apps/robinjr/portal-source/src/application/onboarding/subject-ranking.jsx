import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { moveSubject, toggleSubjectPreference } from "./subject-ranking.js";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";

const { MAX_ACADEMIC_SUBJECTS } = academicSystemsConfig;

export function SubjectRanking({ value, onChange, system }) {
  const subjects = Array.isArray(value) ? value : [];
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const dragged = useRef(null);
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
    setAnnouncement(`${trimmed} añadida a la posición ${subjects.length + 1}.`);
    input.current?.focus();
  }
  function move(from, to) {
    onChange(moveSubject(subjects, from, to));
    setAnnouncement(`${subjects[from].name}, posición ${to + 1} de ${subjects.length}.`);
  }

  return <div className="subject-ranking">
    <div className="subject-ranking-add">
      <input ref={input} value={name} maxLength={160} disabled={full} aria-label="Añade una asignatura" placeholder="Escribe una asignatura…" onChange={(event) => { setName(event.target.value); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); add(); } }} />
      <button type="button" className="subject-add-button" disabled={full || !name.trim()} onClick={add}><Plus size={17} /> Añadir</button>
    </div>
    {error && <p className="subject-ranking-error" role="alert">{error}</p>}
    {full && <p className="subject-ranking-note">Puedes añadir hasta {MAX_ACADEMIC_SUBJECTS} asignaturas.</p>}
    <p className="subject-ranking-note">Añádelas y ordénalas con las flechas o arrastrándolas. La primera es la que más te gusta. Los pulgares son opcionales.</p>
    <span className="sr-only" role="status">{announcement}</span>
    {subjects.length > 0 ? <ol className="subject-ranking-list" aria-label="Asignaturas de mayor a menor interés">
      {subjects.map((subject, index) => <li key={subject.name} className="subject-ranking-row" onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (dragged.current != null) move(dragged.current, index); dragged.current = null; }}>
        <div className="subject-ranking-title">
          <button type="button" className="subject-drag" draggable aria-label={`Arrastrar ${subject.name}`} title="Arrastrar para ordenar"
            onDragStart={(event) => { dragged.current = index; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", subject.name); }}
            onDragEnd={() => { dragged.current = null; }}><GripVertical size={18} /></button>
          <span className="subject-position">{index + 1}</span><strong>{subject.name}</strong>
        </div>
        {system?.levels.length > 0 && <select value={subject.level || ""} aria-label={`Nivel de ${subject.name}`}
          onChange={(event) => onChange(subjects.map((entry, i) => i === index ? { ...entry, level: event.target.value } : entry))}>
          <option value="">Nivel…</option>{system.levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select>}
        <div className="subject-ranking-actions">
          <button type="button" disabled={index === 0} aria-label={`Subir ${subject.name}`} onClick={() => move(index, index - 1)}><ArrowUp size={17} /></button>
          <button type="button" disabled={index === subjects.length - 1} aria-label={`Bajar ${subject.name}`} onClick={() => move(index, index + 1)}><ArrowDown size={17} /></button>
          <button type="button" className="subject-like" aria-label={`Me gusta ${subject.name}`} aria-pressed={subject.preference === "like"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "like"))}><ThumbsUp size={18} /></button>
          <button type="button" className="subject-dislike" aria-label={`No me gusta ${subject.name}`} aria-pressed={subject.preference === "dislike"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "dislike"))}><ThumbsDown size={18} /></button>
          <button type="button" aria-label={`Eliminar ${subject.name}`} onClick={() => { onChange(subjects.filter((_, i) => i !== index)); setAnnouncement(`${subject.name} eliminada.`); }}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ol> : <div className="subject-ranking-empty">Empieza añadiendo las asignaturas de tu último curso.</div>}
  </div>;
}
