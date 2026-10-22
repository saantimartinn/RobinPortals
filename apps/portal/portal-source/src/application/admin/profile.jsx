// Admin workspace module for profile; AdminPortal composes these views.
import { useState, useEffect } from "react";
import { User, FileText, CheckCircle2, BookOpen, Loader2, AlertCircle, Sparkles, RefreshCw, ExternalLink, GraduationCap, ChevronDown, PartyPopper, XCircle } from "lucide-react";
import { NAVY } from "../../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader } from "../../ui.jsx";
import { adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback } from "../../api.js";
import { LivedAbroadCard } from "../StudentProfile.jsx";

export function AdminPerfil({ client, onRefresh }) {
  // --- Sugerencias de carreras (IA) ---
  const [sugg, setSugg] = useState(null);
  const [suggLoading, setSuggLoading] = useState(true);
  const [suggErr, setSuggErr] = useState("");
  const [regening, setRegening] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState("");
  const [showQ, setShowQ] = useState(false);

  useEffect(() => {
    let cancel = false;
    setSuggLoading(true); setSuggErr(""); setSugg(null); setShowQ(false);
    (async () => {
      try {
        const r = await adminCareerSuggestions(client.id);
        if (!cancel) setSugg(r);
      } catch (e) {
        if (!cancel) setSuggErr(e.message || "No se pudieron cargar las sugerencias.");
      } finally {
        if (!cancel) setSuggLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [client.id]);

  async function regenerate() {
    setRegening(true); setSuggErr("");
    try {
      const r = await adminCareerSuggestionsRegenerate(client.id);
      setSugg(r);
    } catch (e) {
      setSuggErr(e.message || "No se pudo regenerar.");
    } finally {
      setRegening(false);
    }
  }

  async function saveCareerFeedback(programCode, decision) {
    setFeedbackBusy(programCode); setSuggErr("");
    try {
      const r = await adminCareerSuggestionFeedback(client.id, programCode, decision);
      setSugg(r);
    } catch (e) {
      setSuggErr(e.message || "No se pudo guardar la decisión.");
    } finally {
      setFeedbackBusy("");
    }
  }

  const opts = [
    { value: "ciencias", label: "Ciencias" },
    { value: "tecnologia_y_programacion", label: "Tecnología y programación" },
    { value: "business", label: "Business" },
    { value: "ciencias_de_la_salud", label: "Ciencias de la salud" },
    { value: "ingenierias", label: "Ingenierías" },
    { value: "ciencias_sociales", label: "Ciencias sociales" },
    { value: "artes", label: "Artes" },
  ];

  const AREA_ES = {
    "Technology & Computer Science": "Tecnología",
    "Engineering": "Ingeniería",
    "Business & Economics": "Business",
    "Sciences": "Ciencias",
    "Health Sciences": "Ciencias de la salud",
    "Social Sciences": "Ciencias sociales",
    "Arts & Liberal Arts": "Artes",
  };
  function compColor(v) {
    return v >= 78 ? "#10b981" : v >= 58 ? "#F5A623" : "#94a3b8";
  }
  function fmtDate(x) {
    if (!x) return "";
    try { return new Date(x).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }
    catch (_) { return ""; }
  }

  const esPasaporte = (client.origin === "otros") && (client.has_eu_id === false);
  const docLabel = esPasaporte ? "Pasaporte" : "DNI";
  const items = (sugg && sugg.suggestions && Array.isArray(sugg.suggestions.items)) ? sugg.suggestions.items : [];
  const feedbackByCode = Object.fromEntries(((sugg && sugg.feedback) || []).map((entry) => [entry.program_code, entry.decision]));
  const hasQ = sugg && sugg.has_questionnaire;
  const aiDisabled = !!(sugg && sugg.ai_disabled);
  const qBlocks = (hasQ && sugg.questionnaire && Array.isArray(sugg.questionnaire.blocks)) ? sugg.questionnaire.blocks : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Cumpleaños" icon={PartyPopper}
          subtitle="Fecha recuperada del DNI durante el onboarding" />
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-xs text-slate-500">Fecha de nacimiento</div>
              <div className="text-base font-semibold text-slate-800 mt-1 capitalize">{formatBirthDate(client.fecha_nacimiento)}</div>
            </div>
            {birthdayIsToday(client.fecha_nacimiento) && <Badge tone="gold">Cumple años hoy 🎉</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Datos personales" subtitle="Solo lectura · datos persistidos en Supabase" icon={User} />
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["Nombre", client.nombre],
            ["Apellidos", client.apellidos],
            ["Email", client.email],
            ["Número de " + docLabel.toLowerCase(), client.dni_numero],
            ["Dirección", client.direccion],
            ["Fecha de nacimiento", client.fecha_nacimiento],
            ["Teléfono del alumno", client.telefono_alumno],
          ].map(([label, value]) => (
            <div key={label} className={label === "Dirección" ? "md:col-span-2" : ""}>
              <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 min-h-10">{value || "—"}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Intereses de carrera" subtitle="Sólo lectura · los marca el alumno en su onboarding" icon={BookOpen} />
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(client.intereses || []).length === 0
              ? <span className="text-sm text-slate-400">El alumno aún no ha indicado intereses.</span>
              : client.intereses.map((v) => {
                  const lbl = (opts.find((o) => o.value === v) || {}).label || v;
                  return (
                    <span key={v} className="rounded-full px-3 py-1.5 text-xs font-medium border"
                      style={{ background: NAVY, color: "white", borderColor: NAVY }}>{lbl}</span>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      <LivedAbroadCard
        value={client}
        editable={true}
        userId={client.id}
        onSaved={() => onRefresh && onRefresh()}
      />

      {/* === SUGERENCIAS DE CARRERAS (IA) === */}
      <Card>
        <CardHeader title="Sugerencias de carreras (IA)" icon={Sparkles}
          subtitle="Las 10 carreras más compatibles según el cuestionario del alumno"
          right={!aiDisabled && hasQ && (
            <Btn variant="secondary" size="sm" onClick={regenerate} disabled={regening || suggLoading}>
              {regening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerar
            </Btn>
          )} />
        <CardContent>
          {suggLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Generando recomendaciones con IA…
            </div>
          )}

          {!suggLoading && suggErr && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <span>{suggErr}</span>
            </div>
          )}

          {!suggLoading && !suggErr && aiDisabled && (
            <div className="text-sm text-slate-500 py-6 text-center">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-slate-300" />
              Recomendación por IA <strong>desactivada</strong> para clientes internacionales.
              {hasQ
                ? <><br />El cuestionario del alumno se muestra más abajo para tu consulta.</>
                : <><br />El alumno aún no ha completado el cuestionario de orientación.</>}
            </div>
          )}

          {!suggLoading && !suggErr && !aiDisabled && !hasQ && (
            <div className="text-sm text-slate-400 py-6 text-center">
              El alumno aún no ha completado el cuestionario de orientación en su onboarding.
              <br />Las sugerencias se generarán automáticamente cuando lo termine.
            </div>
          )}

          {!suggLoading && !suggErr && !aiDisabled && hasQ && (
            <>
              {regening && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerando…
                </div>
              )}
              <div className="space-y-2.5">
                {items.map((it, i) => (
                  <div key={it.program_code || i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-lg grid place-items-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: NAVY }}>{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-900 text-sm leading-tight">{it.career_name}</div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button type="button" title="Aprobar recomendación" aria-label={`Aprobar ${it.career_name}`}
                              disabled={feedbackBusy === it.program_code}
                              onClick={() => saveCareerFeedback(it.program_code, "approved")}
                              className={`h-7 w-7 rounded-lg border grid place-items-center transition-colors disabled:opacity-50 ${feedbackByCode[it.program_code] === "approved" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"}`}>
                              {feedbackBusy === it.program_code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <button type="button" title="Descartar recomendación" aria-label={`Descartar ${it.career_name}`}
                              disabled={feedbackBusy === it.program_code}
                              onClick={() => saveCareerFeedback(it.program_code, "rejected")}
                              className={`h-7 w-7 rounded-lg border grid place-items-center transition-colors disabled:opacity-50 ${feedbackByCode[it.program_code] === "rejected" ? "bg-rose-600 border-rose-600 text-white" : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"}`}>
                              {feedbackBusy === it.program_code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            </button>
                            <span className="text-sm font-bold ml-1" style={{ color: compColor(it.compatibility) }}>
                              {it.compatibility}%
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{it.university} · {it.city}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: it.compatibility + "%", background: compColor(it.compatibility) }} />
                        </div>
                        {it.reason && <div className="text-xs text-slate-600 mt-2 leading-relaxed">{it.reason}</div>}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {it.area && <Badge tone="navy">{AREA_ES[it.area] || it.area}</Badge>}
                          {it.degree_type && <Badge tone="slate">{it.degree_type}</Badge>}
                          {it.numerus_fixus && <Badge tone="amber">Numerus Fixus</Badge>}
                          {it.strengths && <span className="text-[11px] text-slate-400">{it.strengths}</span>}
                          {it.website_url && (
                            <a href={it.website_url} target="_blank" rel="noreferrer"
                              className="text-[11px] inline-flex items-center gap-1 ml-auto" style={{ color: NAVY }}>
                              <ExternalLink className="h-3 w-3" /> Ver web
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {sugg.suggestions && (
                <div className="text-[11px] text-slate-400 mt-3">
                  Generado {fmtDate(sugg.suggestions.generated_at)}
                  {sugg.suggestions.source === "fallback"
                    ? " · estimación automática (IA no disponible)"
                    : " · selección por IA"}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* === CUESTIONARIO DEL ALUMNO === */}
      {hasQ && (
        <Card>
          <CardHeader title="Cuestionario de orientación" icon={FileText}
            subtitle="Respuestas del alumno en el onboarding"
            right={
              <Btn variant="ghost" size="sm" onClick={() => setShowQ((x) => !x)}>
                {showQ ? "Ocultar" : "Ver respuestas"}
                <ChevronDown className="h-3.5 w-3.5" style={{ transform: showQ ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </Btn>
            } />
          {showQ && (
            <CardContent className="space-y-4">
              {qBlocks.map((blk, bi) => (
                <div key={bi}>
                  <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: NAVY }}>{blk.title}</div>
                  <div className="space-y-2">
                    {(blk.items || []).map((it, ii) => (
                      <div key={ii} className="text-sm">
                        <div className="text-slate-500 text-xs">{it.q}</div>
                        <div className="text-slate-800">{Array.isArray(it.a) ? it.a.join(", ") : String(it.a)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

export function formatBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "—";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function birthdayIsToday(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return match[2] === month && match[3] === day;
}
