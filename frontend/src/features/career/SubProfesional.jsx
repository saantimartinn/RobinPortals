import { Briefcase, FileText, Handshake, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { ComingSoon } from "../services/ComingSoon.jsx";
import { CvAiPage } from "./CvAiPage.jsx";
import { EmpleosLocalesPage } from "./EmpleosLocalesPage.jsx";
import { MentoriasPage } from "./MentoriasPage.jsx";
import React, { useState } from "react";
import { SubIntro } from "../services/SubIntro.jsx";
import { SubNavCard } from "../services/SubNavCard.jsx";
import { robinLockFor } from "../../shared/utils.js";

function SubProfesional({ requests, onRefresh, events = [], ciudad = "", user = {} }) {
  const [page, setPage] = useState("home"); // home | empleos | cv | mentorias | networking

  if (page === "empleos") return <EmpleosLocalesPage events={events} ciudad={ciudad} onBack={() => setPage("home")} />;
  if (page === "cv") return <CvAiPage onBack={() => setPage("home")} />;
  if (page === "mentorias") return <MentoriasPage events={events} onBack={() => setPage("home")} />;
  if (page === "networking") return (
    <ComingSoon title="Networking" onBack={() => setPage("home")}
      subtitle="Eventos y conexiones profesionales con la comunidad Robin."
      bullets={["Directorio de profesionales y estudiantes Robin.", "Eventos de networking y afterworks."]} />
  );

  return (
    <div className="space-y-5">
      <SubIntro title="Career Support" subtitle="Empleo, CV, mentorías y networking para dar el siguiente paso." />
      <Card>
        <CardHeader title="Carrera" subtitle="Empleo, CV, mentorías y networking" icon={Briefcase} />
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <SubNavCard icon={Briefcase} title="Empleos Locales" desc="Ofertas de empleo local compatibles con tus estudios." cta="Abrir" badge={{ label: "Próximamente", tone: "amber" }} onClick={() => setPage("empleos")} lock={robinLockFor(user, "empleos_locales")} />
          <SubNavCard icon={FileText} title="CV" desc="Crea y revisa tu CV con ayuda de IA." cta="Abrir" badge={{ label: "Próximamente", tone: "amber" }} onClick={() => setPage("cv")} />
          <SubNavCard icon={Users} title="Mentorías" desc="Elige un área y te asignamos un mentor según disponibilidad." cta="Abrir" badge={{ label: "Próximamente", tone: "amber" }} onClick={() => setPage("mentorias")} />
          <SubNavCard icon={Handshake} title="Networking" desc="Eventos y conexiones profesionales." cta="Abrir" badge={{ label: "Próximamente", tone: "amber" }} onClick={() => setPage("networking")} lock={robinLockFor(user, "networking")} />
        </CardContent>
      </Card>
    </div>
  );
}

export { SubProfesional };
