import { Badge, Btn, Card, CardContent } from "../../shared/ui.jsx";
import { ExternalLink } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import { SubIntro } from "../services/SubIntro.jsx";

function MentorProfileCard({ mentor, onBack }) {
  const m = mentor.meta || {};
  return (
    <div className="space-y-5">
      <SubIntro title={mentor.title} subtitle="Perfil del mentor" onBack={onBack} />
      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl overflow-hidden grid place-items-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
              {m.photo ? <img src={m.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl font-bold">{(mentor.title || "M").charAt(0)}</span>}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{mentor.title}</div>
              {m.job && <div className="text-sm text-slate-600">{m.job}</div>}
              {m.sector && <div className="mt-1"><Badge tone="gold">{m.sector}</Badge></div>}
            </div>
          </div>
          {m.description && <div className="text-sm text-slate-600 whitespace-pre-wrap">{m.description}</div>}
          {m.linkedin && <a href={m.linkedin.startsWith("http") ? m.linkedin : `https://${m.linkedin}`} target="_blank" rel="noreferrer"><Btn size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> Ver LinkedIn</Btn></a>}
        </CardContent>
      </Card>
    </div>
  );
}

export { MentorProfileCard };
