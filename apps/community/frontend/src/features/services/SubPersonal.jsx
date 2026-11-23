import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Services feature UI for sub personal; the application shell selects this view.
import { Building2, HeartHandshake, Home, LifeBuoy, Plane } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { ComingSoon } from "./ComingSoon.jsx";
import React, { useState } from "react";
import { ResidenciasPage } from "./ResidenciasPage.jsx";
import { SUBSCRIBER_SERVICES } from "../../shared/constants.js";
import { ServiceRequestCard } from "./ServiceRequestCard.jsx";
import { SubIntro } from "./SubIntro.jsx";
import { SubNavCard } from "./SubNavCard.jsx";
import { robinLockFor } from "../../shared/utils.js";

function SubPersonal({ requests, onRefresh, partners = [], loadingPartners, user = {} }) {
  useLocale();
  const [page, setPage] = useState("home"); // home | residencias | pisos
  const svc = (key) => SUBSCRIBER_SERVICES.find((x) => x.key === key) || { key, title: key, desc: "", icon: LifeBuoy };

  if (page === "residencias") return <ResidenciasPage partners={partners} loading={loadingPartners} onBack={() => setPage("home")} />;
  if (page === "pisos") return (
    <ComingSoon title={t("Pisos")} onBack={() => setPage("home")}
      subtitle={t("Buscador de pisos con IA y revisión de contratos.")}
      bullets={["Buscador de pisos con IA que filtra por presupuesto, zona y tipo (en desarrollo).", "Revisión de tu contrato de alquiler antes de firmar."]} />
  );

  return (
    <div className="space-y-5">
      <SubIntro title="Lifestyle" subtitle={t("Instalación, vivienda y bienestar para tu día a día en el extranjero.")} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title={t("Instalación")} subtitle={t("Tus primeros pasos en destino")} icon={Plane} />
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <ServiceRequestCard service={svc("bureaucratic_support")} requests={requests} onRefresh={onRefresh} section="personal" />
            <ServiceRequestCard service={svc("arrival_support")} requests={requests} onRefresh={onRefresh} section="personal" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Wellness" subtitle={t("Acompañamiento psicológico y bienestar social")} icon={HeartHandshake} />
          <CardContent>
            <SubNavCard icon={HeartHandshake} title="Social Break" desc={t("Acompañamiento psicológico y bienestar social con mysocialbreak.com.")} cta={t("Visitar mysocialbreak.com")} href="https://www.mysocialbreak.com/" lock={robinLockFor(user, "social_break")} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Housing" subtitle={t("Alojamiento: residencias y pisos")} icon={Home} />
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <SubNavCard icon={Building2} title={t("Residencias")} desc={t("Partners de residencias verificados y enlazados.")} cta={t("Ver residencias")} onClick={() => setPage("residencias")} lock={robinLockFor(user, "residencias")} />
          <SubNavCard icon={Home} title={t("Pisos")} desc={t("Buscador de pisos con IA (próximamente) y revisión de contratos.")} cta={t("Abrir")} badge={{ label: "Próximamente", tone: "amber" }} onClick={() => setPage("pisos")} lock={robinLockFor(user, "pisos")} />
        </CardContent>
      </Card>
    </div>
  );
}

export { SubPersonal };
