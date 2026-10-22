// Career feature UI for mentorias page; the application shell selects this view.
import { Calendar, CalendarCheck, ChevronRight, Compass } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { MentorProfileCard } from "./MentorProfileCard.jsx";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React, { useState } from "react";
import { SubIntro } from "../services/SubIntro.jsx";
import { formatDate } from "../../shared/utils.js";

function MentoriasPage({ events = [], onBack }) {
  const [sector, setSector] = useState("");
  const [selMentor, setSelMentor] = useState(null);
  const mentors = events.filter((e) => e.type === "mentor" && (e.active === undefined || e.active));
  const mentorById = {}; mentors.forEach((m) => { mentorById[m.id] = m; });
  const sectors = [...new Set(mentors.map((m) => (m.meta && m.meta.sector) || "").filter(Boolean))];
  const now = Date.now();
  const slots = events.filter((e) => e.type === "mentor_slot" && (e.active === undefined || e.active))
    .filter((e) => e.starts_at && new Date(e.starts_at).getTime() >= now - 86400000)
    .filter((e) => {
      const mid = e.meta && e.meta.mentor_id; const mm = mid && mentorById[mid];
      const sec = (e.meta && e.meta.sector) || (mm && mm.meta && mm.meta.sector) || "";
      return !sector || sec === sector;
    })
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  if (selMentor && mentorById[selMentor]) return <MentorProfileCard mentor={mentorById[selMentor]} onBack={() => setSelMentor(null)} />;

  return (
    <div className="space-y-5">
      <SubIntro title="Mentorías" subtitle="Elige un sector y reserva con un mentor disponible." onBack={sector ? () => setSector("") : onBack} />
      {!sector && (
        <Card>
          <CardHeader title="Elige tu sector" subtitle="Selecciona el área en la que quieres orientación" icon={Compass} />
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {sectors.length === 0 && <div className="text-sm text-slate-400">Todavía no hay mentores disponibles. Vuelve pronto.</div>}
            {sectors.map((sec) => (
              <button key={sec} onClick={() => setSector(sec)} className="text-left rounded-2xl border border-[#D7E1F4] bg-[#EEF3FC] p-5 hover:shadow-md transition">
                <div className="text-sm font-semibold text-slate-800">{sec}</div>
                <div className="text-xs text-slate-500 mt-0.5">{mentors.filter((m) => (m.meta && m.meta.sector) === sec).length} mentor(es)</div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      {sector && (
        <Card>
          <CardHeader title={`Disponibilidad · ${sector}`} subtitle="Fechas disponibles. Pulsa para ver el perfil del mentor." icon={CalendarCheck} />
          <CardContent className="space-y-2.5">
            {slots.length === 0 && <div className="text-sm text-slate-400">No hay fechas disponibles en este sector por ahora.</div>}
            {slots.map((s) => {
              const m = s.meta && mentorById[s.meta.mentor_id];
              return (
                <button key={s.id} onClick={() => m && setSelMentor(m.id)} className="w-full text-left rounded-xl border border-slate-100 p-4 flex items-center justify-between gap-3 hover:shadow-sm hover:border-slate-200 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}><Calendar className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{formatDate(s.starts_at)}</div>
                      <div className="text-xs text-slate-500 truncate">{m ? m.title : "Mentor"}{m && m.meta && m.meta.job ? ` · ${m.meta.job}` : ""}</div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold inline-flex items-center gap-1 flex-shrink-0" style={{ color: NAVY }}>Ver perfil <ChevronRight className="h-4 w-4" /></span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { MentoriasPage };
