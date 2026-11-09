import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Contact } from "@/types/domain";
import type { RecommenderSession } from "@/services/admin-data";
import "./recommender-modal.css";

const areaNames: Record<string, string> = {
  ciencias: "Ciencias", tecnologia_y_programacion: "Tecnología", business: "Business",
  ciencias_de_la_salud: "Salud", ingenierias: "Ingenierías",
  ciencias_sociales: "Ciencias sociales", artes: "Artes",
};

function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map(answerText).join(", ");
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export function RecommenderModal({ session, contact, onClose }: { session: RecommenderSession; contact: Contact; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  const answerCount = session.blocks.reduce((count, block) => count + (block.items?.length || 0), 0);
  const fullName = `${session.firstName} ${session.lastName}`.trim() || contact.name;
  return <dialog ref={dialogRef} className="recommender-dialog" aria-labelledby="recommender-dialog-title"
    onCancel={onClose} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <div className="recommender-dialog-card">
      <header className="recommender-dialog-top">
        <div><span className="recommender-dialog-eyebrow">Último test · Matching de carreras</span><h2 id="recommender-dialog-title">{fullName}</h2><p>{contact.email} · {contact.phone}</p></div>
        <div className="recommender-dialog-top-actions"><span className="recommender-area-stamp">{areaNames[session.selectedArea] || session.selectedArea}</span><button type="button" onClick={onClose} aria-label="Cerrar respuestas"><X size={20} /></button></div>
      </header>
      <div className="recommender-dialog-facts">
        <div><span>Origen</span><strong>{[session.originCity, session.originCountry].filter(Boolean).join(", ") || "—"}</strong></div>
        <div><span>Colegio</span><strong>{session.school || "—"}</strong></div>
        <div><span>Curso</span><strong>{session.course || "No indicado"}</strong></div>
        <div><span>Fecha del test</span><strong>{dateLabel(session.createdAt)}</strong></div>
      </div>
      <div className="recommender-dialog-body">
        <section className="recommender-dialog-answers"><div className="recommender-dialog-section-title"><h3>Respuestas</h3><span>{answerCount} registradas</span></div>
          {session.blocks.length ? session.blocks.map((block, index) => <div className="recommender-answer-block" key={`${block.title}-${index}`}><h4>{block.title}</h4><dl>{(block.items || []).map((item, itemIndex) => <div key={`${item.q}-${itemIndex}`}><dt>{item.q}</dt><dd>{answerText(item.a)}</dd></div>)}</dl></div>) : <p>No hay respuestas registradas para este test.</p>}
          <div className="recommender-answer-block"><h4>Perfil académico</h4><dl><div><dt>Sistema</dt><dd>{session.academicSystem || "—"}</dd></div><div><dt>Asignaturas</dt><dd>{session.academicSubjects.length ? session.academicSubjects.map((subject) => [subject.name, subject.level].filter(Boolean).join(" · ")).join(", ") : "Sin asignaturas registradas"}</dd></div></dl></div>
        </section>
        <section className="recommender-dialog-recommendations"><div className="recommender-dialog-section-title"><h3>Recomendaciones</h3><span>{session.recommendations.length} carreras</span></div>
          <div className="recommender-dialog-rec-list">{session.recommendations.map((item, index) => <article className="recommender-dialog-rec" key={`${item.career_name}-${index}`}><span className="recommender-dialog-rank">{index + 1}</span><div><strong>{item.career_name}</strong><small>{[item.university, item.city].filter(Boolean).join(" · ")}</small>{item.reason && <p>{item.reason}</p>}</div><span className="recommender-dialog-compat">{item.compatibility}%</span></article>)}</div>
          {!session.recommendations.length && <p>No hay recomendaciones registradas para este test.</p>}
        </section>
      </div>
    </div>
  </dialog>;
}
