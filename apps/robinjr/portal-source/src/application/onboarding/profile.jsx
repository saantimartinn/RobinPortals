// Onboarding step or helper for profile; OnboardingFlow owns the step sequence.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { initQuestionnaireAnswers, QuestionField, qOptLabel, qFmtSlider } from "./questionnaire-fields.jsx";
import { Q_AREAS, Q_GENERAL, Q_MASTER_BLOCKS, Q_VOCACIONAL, visibleQuestionnaireBlocks } from "../../questionnaire-data.js";
import { GOLD, NAVY } from "../../theme.js";
import academicSystemsConfig from "../../../../shared/academic-systems.cjs";
import { Btn, Field } from "../../ui.jsx";
import { profileSave } from "../../api.js";
import { OnboardingShell } from './onboarding-shared.jsx';
import { useOnboardingNav } from './onboarding-nav.js';
import { ProfileConversation } from './profile-conversation.jsx';
import { formatSubjectRanking, subjectRankingSignals } from './subject-ranking.js';
import { subjectPreferenceError } from '../../../../../../packages/onboarding/subject-preferences.mjs';
import { SubjectRanking } from './subject-ranking.jsx';
import { OnboardingThanks } from './thanks.jsx';
import { sectionIntroduction } from './conversation-sections.js';

const { ACADEMIC_SYSTEMS, MAX_ACADEMIC_SUBJECTS, academicSystemByValue } = academicSystemsConfig;
const SYSTEM_VALUES = {
  "Bachillerato español": "bachillerato_espanol", "Bachillerato Internacional (IB)": "ib",
  "A-Levels (británico)": "a_levels", "Sistema americano": "high_school_diploma",
  "Bac francés": "baccalaureat_frances", "Otro": "otro",
};

export function OnboardingProfile({ user, onLogout, onDone }) {
  const nav = useOnboardingNav();
  const [email, setEmail] = useState(user.email || "");
  const [intereses, setIntereses] = useState(user.intereses || []);
  const [answers, setAnswers] = useState(() => ({ ...initQuestionnaireAnswers(), g_asignaturas: (Array.isArray(user.academic_subjects) ? user.academic_subjects : []).filter((subject) => subject.name?.trim()).map((subject) => ({ name: subject.name.trim(), level: subject.level || "", preference: null })) }));
  const [academicSystem, setAcademicSystem] = useState(user.academic_system || "");
  const [academicSubjects, setAcademicSubjects] = useState(() => {
    const existing = Array.isArray(user.academic_subjects)
      ? user.academic_subjects.map((subject) => ({ name: subject.name || "", level: subject.level || "" }))
      : [];
    if (existing.length) return existing;
    const system = academicSystemByValue(user.academic_system);
    return system ? Array.from({ length: system.subjectCount }, () => ({ name: "", level: "" })) : [];
  });
  const [screen, setScreen] = useState(0); // index into screens (0 = correo + intereses)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const conversationFrame = useRef(null);
  const scrollPosition = useRef(null);
  const [conversationHeight, setConversationHeight] = useState(0);
  useLayoutEffect(() => {
    if (scrollPosition.current == null) return;
    window.scrollTo({ top: scrollPosition.current, behavior: "instant" });
    scrollPosition.current = null;
  }, [screen]);

  function preservePagePosition() {
    scrollPosition.current = window.scrollY;
    setConversationHeight(0);
  }

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
  const activeBlocks = useMemo(() => visibleQuestionnaireBlocks(blocks, answers), [blocks, answers]);
  // One screen per question, between the intro (correo + intereses) and the academic system.
  const screens = useMemo(() => [
    { kind: "intro" },
    ...activeBlocks.flatMap((block) => block.questions.map((q) => ({ kind: "question", block, q }))),
    ...(esMaestria ? [{ kind: "academic" }] : []),
  ], [activeBlocks, esMaestria]);
  const questionCount = screens.filter((entry) => entry.kind === "question").length;
  const academicScreen = esMaestria ? screens.length - 1 : -1;
  const totalScreens = screens.length;
  const selectedAcademicSystem = academicSystemByValue(academicSystem);

  function toggle(v) {
    setIntereses((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
    setError("");
  }
  function setAns(id, val) {
    setAnswers((a) => {
      if (id === "g_sistema") {
        const system = academicSystemByValue(SYSTEM_VALUES[val]);
        const subjects = (a.g_asignaturas || []).map((subject) => ({ ...subject, level: system?.levels.some((level) => level.value === subject.level) ? subject.level : "" }));
        return { ...a, [id]: val, g_asignaturas: subjects };
      }
      return { ...a, [id]: val };
    });
    if (id === "g_sistema") setAcademicSystem(SYSTEM_VALUES[val] || "otro");
    setError("");
  }

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
      return subjectPreferenceError(completedSubjects);
    }
    const q = screens[idx]?.q;
    if (!q || q.optional || q.type === "slider") return "";
    const v = answers[q.id];
    if (q.type === "subject-ranking") {
      if (!Array.isArray(v) || !v.length) return "Añade al menos una asignatura antes de continuar.";
      if (selectedAcademicSystem?.levels.length && v.some((subject) => !subject.level)) return "Indica el nivel de cada asignatura antes de continuar.";
      return subjectPreferenceError(v);
    }
    const ok = q.type === "multi"
      ? Array.isArray(v) && v.length > 0
      : v != null && String(v).trim() !== "";
    return ok ? "" : "Responde a esta pregunta para continuar.";
  }

  function buildQuestionnaire() {
    const outBlocks = activeBlocks.map((blk) => ({
      title: blk.title,
      items: blk.questions
        .map((q) => {
          let a = answers[q.id];
          if (q.type === "subject-ranking") {
            a = formatSubjectRanking(a);
          } else if (q.type === "multi") {
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
      nivel_ingles: answers.g_ingles || answers.m_ingles || "",
      modalidad_bachillerato: answers.g_modalidad || "",
      tiene_certificacion_ingles: answers[esMaestria ? "m_certificado" : "g_certificado"] === "Sí",
      certificacion_ingles: answers[esMaestria ? "m_certificado" : "g_certificado"] === "Sí"
        ? (answers[esMaestria ? "m_certificado_nombre" : "g_certificado_nombre"] || "").trim() : "",
      ...subjectRankingSignals(esMaestria ? academicSubjects : answers.g_asignaturas),
      rasgos: answers.g_rasgos || [],
      valora: answers.g_valora || [],
      prioridad: answers.v_prioridad || "",
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
        academic_subjects: (esMaestria ? academicSubjects : answers.g_asignaturas || []).filter((subject) => subject.name.trim()).map(({ name, level }) => ({ name, level })),
      });
      setProfileSaved(true);
    } catch (e) {
      if (e.status === 409) setError("Ese correo ya está en uso por otra cuenta.");
      else if (e.data?.error === "invalid_email") setError("El correo no es válido.");
      else if (e.data?.error === "missing_questionnaire") setError("Faltan respuestas del cuestionario.");
      else if (e.data?.error === "missing_subject_preferences") setError("Marca un pulgar arriba o abajo en todas las asignaturas.");
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
      preservePagePosition();
      const q = screens[screen]?.q;
      const value = q ? answers[q.id] : null;
      const answer = screen === 0
        ? `${email.trim()}\n${options.filter((option) => intereses.includes(option.value)).map((option) => option.label).join(", ")}`
        : q?.type === "subject-ranking" ? formatSubjectRanking(value).join("\n")
          : q?.type === "slider" ? qFmtSlider(q, value ?? q.def)
          : q?.type === "multi" ? (value || []).map((item) => qOptLabel(q.options, item)).join(", ")
            : q ? qOptLabel(q.options, value) : "";
      setHistory((previous) => [...previous.filter((entry) => entry.screen < screen), { screen, question: currentQuestion, sectionIntro, answer: String(answer || "Prefiero dejar esta respuesta en blanco.") }]);
      setScreen((s) => s + 1);
    } else {
      submit();
    }
  }
  function back() {
    setError("");
    if (screen === 0) { nav?.goBack?.(); return; } // first screen: back to the previous step
    preservePagePosition();
    setHistory((previous) => previous.filter((entry) => entry.screen < screen - 1));
    setScreen((s) => Math.max(0, s - 1));
  }

  const current = screens[screen];
  const sectionIntro = sectionIntroduction(current, screens[screen - 1]);
  const subtitle = screen === 0
    ? "Tu correo será tu usuario para entrar al portal."
    : screen === academicScreen
      ? "Última sección · sistema y asignaturas"
      : `Cuestionario de orientación · pregunta ${screen} de ${questionCount}`;
  const isLast = screen === totalScreens - 1;
  const conversationalQuestions = { g_ciudad: "¿En qué ciudad y país vives actualmente?", g_colegio: "¿Cómo se llama tu colegio actual?" };
  const currentQuestion = current?.kind === "question" ? conversationalQuestions[current.q.id] || current.q.q
    : screen === academicScreen ? "¿Qué sistema educativo estás cursando?"
      : "Para empezar, confirma tu correo y cuéntame qué áreas te interesan.";
  const questionMeta = current?.kind === "question"
    ? `Pregunta ${screen} de ${questionCount}`
    : screen === academicScreen ? "PERFIL · ÚLTIMA SECCIÓN" : "PERFIL · TUS INTERESES";
  const blockTitle = current?.kind === "question" ? current.block.title.replace(/^Bloque \d+ · /, "")
    : screen === academicScreen ? "Información académica" : "Tus intereses";
  const questionHint = current?.kind === "question"
    ? current.q.hint || `${current.q.optional ? "Respuesta opcional. " : ""}${current.q.type === "multi" ? `Puedes elegir varias opciones${current.q.max ? `, máximo ${current.q.max}` : ""}.` : current.q.type === "single" ? "Elige una opción." : current.q.type === "slider" ? "Desliza para indicar tu respuesta." : "Escribe tu respuesta."}`
    : screen === academicScreen ? "Añade tus asignaturas actuales y sus niveles cuando corresponda."
      : "Selecciona al menos un área. Adaptaremos las preguntas a tus intereses.";

  if (profileSaved) return <OnboardingThanks user={user} onLogout={onLogout} onDone={onDone} />;

  return (
    <OnboardingShell user={user} title="Tu perfil académico" subtitle={subtitle} stepNumber={4} onLogout={onLogout} fullscreen conversation>
      <ProfileConversation history={history} question={currentQuestion} hint={questionHint} meta={questionMeta} blockTitle={blockTitle} sectionIntro={sectionIntro} containerRef={conversationFrame} minimumHeight={conversationHeight}>
      <div className="onboarding-question-flow" onKeyDown={(event) => { if (event.key === "Enter" && event.target.tagName === "INPUT" && !busy) { event.preventDefault(); next(); } }}>
        {/* Progreso interno del cuestionario */}
        <div className="onboarding-progress" role="progressbar" aria-valuemin={1} aria-valuemax={totalScreens} aria-valuenow={screen + 1}>
          <span style={{ width: `${((screen + 1) / totalScreens) * 100}%`, background: NAVY }} />
        </div>
        <div className="onboarding-question-body">

        {screen === 0 && (
          <>
            <Field label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2 ">Áreas de interés para tu carrera</div>
              <div className="text-xs text-slate-400 mb-3">{esMaestria ? "Selecciona al menos una: las áreas en las que te gustaría especializarte." : "Selecciona al menos una. Puedes elegir varias — adaptaremos el cuestionario a tus elecciones."}</div>
              <div className="grid grid-cols-2 gap-2">
                {options.map((o) => {
                  const on = intereses.includes(o.value);
                  return (
                    <button key={o.value} type="button" onClick={() => toggle(o.value)} aria-pressed={on}
                      className="q-choice portal-area-choice flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition text-left"
                      style={on ? { background: NAVY, color: "#FEFBE5", borderColor: NAVY } : { background: "#FFFDF5", color: "#4E5979", borderColor: "#EDECDB" }}>
                      <span>{o.label}</span>
                      <span className="portal-area-tick h-4 w-4 rounded grid place-items-center flex-shrink-0"
                        style={on ? { background: GOLD } : { background: "transparent", border: "1.5px solid #DFDED2" }}>
                        {on && <CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {current?.kind === "question" && (
          <div className="onboarding-question">
            <QuestionField key={current.q.id} def={current.q} value={answers[current.q.id]} onChange={(v) => setAns(current.q.id, v)} academicSystem={selectedAcademicSystem} hideLabel />
            {screen === 1 && (
              <p className="onboarding-question-hint">
                {esMaestria
                  ? "Estas respuestas ayudan a tu asesor a preparar tu candidatura al máster."
                  : "Estas respuestas ayudan a tu asesor y a nuestra IA a recomendarte las carreras más compatibles."}
              </p>
            )}
          </div>
        )}

        {screen === academicScreen && (
          <>
            <div className="rounded-xl px-4 py-3" style={{ background: "#F6F3E0" }}>
              <div className="text-sm font-bold" style={{ color: NAVY, fontFamily: "var(--robin-font-display)" }}>Sistema y asignaturas</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Selecciona el sistema que cursas y añade tus asignaturas actuales. Si el sistema utiliza niveles, podrás indicarlos en cada asignatura.
              </div>
            </div>

            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1.5 ">Sistema académico</div>
              <select value={academicSystem} onChange={(event) => selectAcademicSystem(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition">
                <option value="">Selecciona tu sistema académico…</option>
                {ACADEMIC_SYSTEMS.map((system) => <option key={system.value} value={system.value}>{system.label}</option>)}
              </select>
            </label>

            {selectedAcademicSystem && <SubjectRanking value={academicSubjects.filter(subject => subject.name.trim())} onChange={setAcademicSubjects} system={selectedAcademicSystem} />}

          </>
        )}

        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="onboarding-question-nav flex items-center gap-3">
          <Btn variant="secondary" onClick={back} disabled={busy || (screen === 0 && !nav?.goBack)}>
            <ChevronLeft className="h-4 w-4" /> Atrás
          </Btn>
          <Btn className="flex-1" size="lg" onClick={next}
            disabled={busy || (screen === 0 && (!email.trim() || intereses.length === 0))}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
              : isLast ? <>Finalizar <CheckCircle2 className="h-4 w-4" /></>
              : <>Continuar <ChevronRight className="h-4 w-4" /></>}
          </Btn>
        </div>
      </div>
      </ProfileConversation>
    </OnboardingShell>
  );
}
