// Community feature UI for otros robins page; the application shell selects this view.
import { Card, CardContent } from "../../shared/ui.jsx";
import { DEMO_ROBINS } from "./DEMO_ROBINS.js";
import React from "react";
import { RobinCard } from "./RobinCard.jsx";
import { SubIntro } from "../services/SubIntro.jsx";

function OtrosRobinsPage({ onBack }) {
  return (
    <div className="space-y-5">
      <SubIntro title="Otros Robins" subtitle="Directorio de miembros de la comunidad Robin." onBack={onBack} />
      <Card>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {DEMO_ROBINS.map((r, i) => <RobinCard key={i} r={r} />)}
          </div>
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
            Esta sección está en desarrollo. Pronto podrás ver perfiles completos, conectar y chatear con otros Robins.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { OtrosRobinsPage };
