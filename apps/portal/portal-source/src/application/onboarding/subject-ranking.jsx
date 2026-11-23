import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import { useRef, useState } from "react";
import { Plus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toggleSubjectPreference } from "./subject-ranking.js";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";

const { MAX_ACADEMIC_SUBJECTS } = academicSystemsConfig;

export function SubjectRanking({ value, onChange, system }) {
  useLocale();
  const subjects = Array.isArray(value) ? value : [];
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState(["", []]);
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
    setAnnouncement(["{0} añadida. Marca si te gusta o no.", [trimmed]]);
    input.current?.focus();
  }
  return <div className="subject-ranking">
    <div className="subject-ranking-add">
      <input ref={input} value={name} maxLength={160} disabled={full} aria-label={t("Añade una asignatura")} placeholder={t("Escribe una asignatura…")} onChange={(event) => { setName(event.target.value); setError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); add(); } }} />
      <button type="button" className="subject-add-button" disabled={full || !name.trim()} onClick={add}><Plus size={17} />{t(" Añadir")}</button>
    </div>
    {error && <p className="subject-ranking-error" role="alert">{error}</p>}
    {full && <p className="subject-ranking-note">{t("Puedes añadir hasta ")}{MAX_ACADEMIC_SUBJECTS}{t(" asignaturas.")}</p>}
    <p className="subject-ranking-note">{t("Marca si cada asignatura te gusta o no.")}</p>
    <span className="sr-only" role="status">{t(...announcement)}</span>
    {subjects.length > 0 ? <ul className="subject-ranking-list" aria-label={t("Tus asignaturas y preferencias")}>
      {subjects.map((subject, index) => <li key={subject.name} className="subject-ranking-row" data-preference-missing={!subject.preference}>
        <div className="subject-ranking-title"><strong>{subject.name}</strong></div>
        {system?.levels.length > 0 && <select value={subject.level || ""} aria-label={t("Nivel de {0}", [subject.name])}
          onChange={(event) => onChange(subjects.map((entry, i) => i === index ? { ...entry, level: event.target.value } : entry))}>
          <option value="">{t("Nivel…")}</option>{system.levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select>}
        <div className="subject-ranking-actions">
          <button type="button" className="subject-like" aria-label={t("Me gusta {0}", [subject.name])} aria-pressed={subject.preference === "like"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "like"))}><ThumbsUp size={18} /></button>
          <button type="button" className="subject-dislike" aria-label={t("No me gusta {0}", [subject.name])} aria-pressed={subject.preference === "dislike"} onClick={() => onChange(toggleSubjectPreference(subjects, index, "dislike"))}><ThumbsDown size={18} /></button>
          <button type="button" aria-label={t("Eliminar {0}", [subject.name])} onClick={() => { onChange(subjects.filter((_, i) => i !== index)); setAnnouncement(["{0} eliminada.", [subject.name]]); }}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ul> : <div className="subject-ranking-empty">{t("Empieza añadiendo las asignaturas que cursas.")}</div>}
  </div>;
}
