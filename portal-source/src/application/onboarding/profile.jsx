import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Trash2, ChevronRight, Loader2, Mail, AlertCircle, ChevronLeft } from "lucide-react";
import { initQuestionnaireAnswers, QuestionField, qOptLabel, qFmtSlider } from "./questionnaire-fields.jsx";
import { Q_AREAS, Q_GENERAL, Q_MASTER_BLOCKS, Q_VOCACIONAL } from "../../questionnaire-data.js";
import { GOLD, NAVY } from "../../theme.js";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";
import { Btn, Field } from "../../ui.jsx";
import { profileSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';

const { ACADEMIC_SYSTEMS, MAX_ACADEMIC_SUBJECTS, academicSystemByValue } = academicSystemsConfig;

export function OnboardingProfile({ user, onLogout, onDone }) {
  const [email, setEmail] = useState(user.email || "");
  const [intereses, setIntereses] = useState(user.intereses || []);
  const [answers, setAnswers] = useState(initQuestionnaireAnswers);
  const [academicSystem, setAcademicSystem] = useState(user.academic_system || "");
  const [academicSubjects, setAcademicSubjects] = useState(() => {
    const existing = Array.isArray(user.academic_subjects)
      ? user.academic_subjects.map((subject) => ({ name: subject.name || "", level: subject.level || "" }))
      : [];
    if (existing.length) return existing;
    const system = academicSystemByValue(user.academic_system);
    return system ? Array.from({ length: system.subjectCount }, () => ({ name: "", level: "" })) : [];
  });
  const [screen, setScreen] = useState(0); // 0 = correo + intereses
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const options = [
    { value: "ciencias", label: "Ciencias" },
    { value: "tecnologia_y_programacion", label: "Tecnología y programación" },
    { value: "business", label: "Business" },
    { value: "ciencias_de_la_salud", label: "Ciencias de la salud" },
    { value: "ingenierias", label: "Ingenierías" },
    { value: "ciencias_sociales", label: "Ciencias sociales" },
    { value: "artes", label: "Artes" },
  ];

  const esMaestria = user.origin === "otros" && user.application_level === "maestria";
  const blocks = useMemo(
    () => esMaestria
      ? Q_MASTER_BLOCKS
      : [Q_GENERAL, ...intereses.map((i) => Q_AREAS[i]).filter(Boolean), Q_VOCACIONAL],
    [intereses, esMaestria]
  );
  const academicScreen = blocks.length + 1;
  const totalScreens = academicScreen + 1;
  const selectedAcademicSystem = academicSystemByValue(academicSystem);

  function toggle(v) {
    setIntereses((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
    setError("");
  }
  function setAns(id, val) { setAnswers((a) => ({ ...a, [id]: val })); setError(""); }

  function selectAcademicSystem(value) {
    const system = academicSystemByValue(value);
    setAcademicSystem(value);
    setAcademicSubjects(system
      ? Array.from({ length: system.subjectCount }, () => ({ name: "", level: "" }))
      : []);
    setError("");
  }

  function updateAcademicSubject(index, field, value) {
    setAcademicSubjects((subjects) => subjects.map((subject, subjectIndex) => (
      subjectIndex === index ? { ...subject, [field]: value } : subject
    )));
    setError("");
  }

  function addAcademicSubject() {
    setAcademicSubjects((subjects) => subjects.length >= MAX_ACADEMIC_SUBJECTS
      ? subjects
      : [...subjects, { name: "", level: "" }]);
  }

  function removeAcademicSubject(index) {
    setAcademicSubjects((subjects) => subjects.filter((_, subjectIndex) => subjectIndex !== index));
    setError("");
  }

  function validateScreen(idx) {
    if (idx === 0) {
      if (!email.trim()) return "Falta el correo electrónico.";
      if (intereses.length === 0) return "Selecciona al menos un área de interés.";
      return "";
    }
    if (idx === academicScreen) {
      if (!selectedAcademicSystem) return "Selecciona tu sistema académico.";
      const completedSubjects = academicSubjects.filter((subject) => subject.name.trim());
      if (!completedSubjects.length) return "Añade al menos una asignatura.";
      if (selectedAcademicSystem.levels.length && completedSubjects.some((subject) => !subject.level)) {
        return "Selecciona el nivel de cada asignatura que hayas añadido.";
      }
      return "";
    }
    const blk = blocks[idx - 1];
    if (!blk) return "";
    for (let k = 0; k < blk.questions.length; k++) {
      const q = blk.questions[k];
      if (q.optional || q.type === "slider") continue;
      const v = answers[q.id];
      const ok = q.type === "multi"
        ? Array.isArray(v) && v.length > 0
        : v != null && String(v).trim() !== "";
      if (!ok) return "Por favor, completa todas las preguntas obligatorias de esta sección.";
    }
    return "";
  }

  function buildQuestionnaire() {
    const outBlocks = blocks.map((blk) => ({
      title: blk.title,
      items: blk.questions
        .map((q) => {
          let a = answers[q.id];
          if (q.type === "multi") {
            a = (Array.isArray(a) ? a : []).map((v) => qOptLabel(q.options, v));
          } else if (q.type === "slider") {
            a = qFmtSlider(q, a == null ? q.def : a);
          } else {
            a = a == null ? "" : String(a);
          }
          return { q: q.q, a };
        })
        .filter((it) => (Array.isArray(it.a) ? it.a.length : String(it.a).trim())),
    }));
    const signals = {
      nota_media: answers.g_nota,
      estilo_aprendizaje: answers.g_estilo,
      independencia: answers.g_independencia,
      presupuesto_mensual: answers.g_presupuesto,
      nivel_ingles: answers.g_ingles || "",
      asignaturas_fav: answers.g_fav || [],
      asignaturas_menos: answers.g_menos || [],
      rasgos: answers.g_rasgos || [],
      valora: answers.g_valora || [],
      prioridad: answers.v_prioridad || "",
      paises: answers.v_paises || [],
      areas: intereses,
    };
    return { version: 1, blocks: outBlocks, signals };
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      await profileSave({
        email: email.trim(),
        intereses,
        questionnaire: buildQuestionnaire(),
        academic_system: academicSystem,
        academic_subjects: academicSubjects.filter((subject) => subject.name.trim()),
      });
      await onDone();
    } catch (e) {
      if (e.status === 409) setError("Ese correo ya está en uso por otra cuenta.");
      else if (e.data?.error === "invalid_email") setError("El correo no es válido.");
      else if (e.data?.error === "missing_questionnaire") setError("Faltan respuestas del cuestionario.");
      else if (e.data?.error === "invalid_academic_profile") setError("Revisa el sistema académico, las asignaturas y sus niveles.");
      else setError(e.message || "No hemos podido guardar.");
      setBusy(false);
    }
  }

  function next() {
    const err = validateScreen(screen);
    if (err) { setError(err); return; }
    setError("");
    if (screen < totalScreens - 1) {
      setScreen((s) => s + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submit();
    }
  }
  function back() {
    setError("");
    setScreen((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const curBlock = screen > 0 && screen < academicScreen ? blocks[screen - 1] : null;
  const subtitle = screen === 0
    ? "Tu correo será tu usuario para entrar al portal."
    : screen === academicScreen
      ? "Última sección · sistema y asignaturas"
      : "Cuestionario de orientación · sección " + screen + " de " + blocks.length;
  const isLast = screen === totalScreens - 1;

  return (
    <OnboardingShell title="Tu perfil académico" subtitle={subtitle} stepNumber={4} icon={<Mail className="h-4 w-4" />} onLogout={onLogout}>
      <div className="space-y-5">
        {/* Progreso interno del cuestionario */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full flex-1 transition"
              style={{ background: i <= screen ? NAVY : "#e2e8f0" }} />
          ))}
        </div>

        {screen === 0 && (
          <>
            <Field label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Áreas de interés para tu carrera</div>
              <div className="text-xs text-slate-400 mb-3">{esMaestria ? "Selecciona al menos una: las áreas en las que te gustaría especializarte." : "Selecciona al menos una. Puedes elegir varias — adaptaremos el cuestionario a tus elecciones."}</div>
              <div className="grid grid-cols-2 gap-2">
                {options.map((o) => {
                  const on = intereses.includes(o.value);
                  return (
                    <button key={o.value} type="button" onClick={() => toggle(o.value)}
                      className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition text-left"
                      style={on ? { background: NAVY, color: "white", borderColor: NAVY } : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                      <span className="h-4 w-4 rounded grid place-items-center flex-shrink-0"
                        style={on ? { background: GOLD } : { background: "transparent", border: "1.5px solid #cbd5e1" }}>
                        {on && <CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {screen > 0 && screen < academicScreen && curBlock && (
          <>
            <div className="rounded-xl px-4 py-3" style={{ background: "#f1f4fb" }}>
              <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: "'Georgia', serif" }}>{curBlock.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {esMaestria
                  ? "Estas respuestas ayudan a tu asesor a preparar tu candidatura al máster."
                  : screen === 1
                    ? "Estas respuestas ayudan a tu asesor y a nuestra IA a recomendarte las carreras más compatibles."
                    : "Cuanto más concreto seas, mejores serán las recomendaciones."}
              </div>
            </div>
            <div className="space-y-5">
              {curBlock.questions.map((q) => (
                <QuestionField key={q.id} def={q} value={answers[q.id]} onChange={(v) => setAns(q.id, v)} />
              ))}
            </div>
          </>
        )}

        {screen === academicScreen && (
          <>
            <div className="rounded-xl px-4 py-3" style={{ background: "#f1f4fb" }}>
              <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: "'Georgia', serif" }}>Sistema y asignaturas</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Selecciona el sistema que cursas y añade tus asignaturas actuales. Si el sistema utiliza niveles, podrás indicarlos en cada asignatura.
              </div>
            </div>

            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sistema académico</div>
              <select value={academicSystem} onChange={(event) => selectAcademicSystem(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition">
                <option value="">Selecciona tu sistema académico…</option>
                {ACADEMIC_SYSTEMS.map((system) => <option key={system.value} value={system.value}>{system.label}</option>)}
              </select>
            </label>

            {selectedAcademicSystem && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Asignaturas</div>
                    <div className="text-xs text-slate-400 mt-1">Deja vacíos los huecos que no necesites.</div>
                  </div>
                  <Btn variant="secondary" size="sm" onClick={addAcademicSubject} disabled={academicSubjects.length >= MAX_ACADEMIC_SUBJECTS}>
                    <Plus className="h-3.5 w-3.5" /> Añadir
                  </Btn>
                </div>

                <div className="space-y-2.5">
                  {academicSubjects.map((subject, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2">
                      <input type="text" value={subject.name}
                        onChange={(event) => updateAcademicSubject(index, "name", event.target.value)}
                        placeholder={`Asignatura ${index + 1}`} aria-label={`Asignatura ${index + 1}`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition" />
                      {selectedAcademicSystem.levels.length > 0 && (
                        <select value={subject.level}
                          onChange={(event) => updateAcademicSubject(index, "level", event.target.value)}
                          aria-label={`Nivel de la asignatura ${index + 1}`}
                          disabled={!subject.name.trim()}
                          className="min-w-0 sm:w-52 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition disabled:opacity-50">
                          <option value="">Nivel…</option>
                          {selectedAcademicSystem.levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => removeAcademicSubject(index)} aria-label={`Eliminar asignatura ${index + 1}`}
                        className="h-10 w-10 self-end sm:self-auto rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 grid place-items-center transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {screen > 0 && (
            <Btn variant="secondary" onClick={back} disabled={busy}>
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Btn>
          )}
          <Btn className="flex-1" size="lg" onClick={next}
            disabled={busy || (screen === 0 && (!email.trim() || intereses.length === 0))}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
              : isLast ? <>Finalizar <CheckCircle2 className="h-4 w-4" /></>
              : <>Continuar <ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      </div>
    </OnboardingShell>
  );
}
