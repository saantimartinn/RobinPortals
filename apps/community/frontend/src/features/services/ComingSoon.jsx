// Services feature UI for coming soon; the application shell selects this view.
import { Card, CardContent } from "../../shared/ui.jsx";
import { CheckCircle2, Sparkles } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import { SubIntro } from "./SubIntro.jsx";

function ComingSoon({ title, subtitle, onBack, bullets = [] }) {
  return (
    <div className="space-y-5">
      <SubIntro title={title} subtitle={subtitle} onBack={onBack} />
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl grid place-items-center text-white mx-auto" style={{ background: NAVY }}>
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="text-lg font-bold text-slate-800" style={{ fontFamily: "var(--robin-font-display)" }}>Próximamente</div>
          <div className="text-sm text-slate-500 max-w-md mx-auto">Estamos desarrollando esta funcionalidad. Muy pronto estará disponible en tu portal.</div>
          {bullets.length > 0 && (
            <div className="max-w-md mx-auto text-left pt-2 space-y-2">
              {bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: NAVY }} /> <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { ComingSoon };
