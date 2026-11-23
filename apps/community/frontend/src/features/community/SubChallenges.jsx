import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Community feature UI for sub challenges; the application shell selects this view.
import { Card, CardContent } from "../../shared/ui.jsx";
import { ChallengeCard } from "./ChallengeCard.jsx";
import { GOLD, NAVY } from "../../shared/theme.js";
import { Loader2, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SubIntro } from "../services/SubIntro.jsx";
import { challengesList } from "../../api/index.js";
import { getRobinLevel, robinLevelDef } from "../../shared/utils.js";

function SubChallenges({ user, onBack, onUserRefresh }) {
  useLocale();
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const rlevel = getRobinLevel(user);

  async function load() {
    try { const r = await challengesList(); setChallenges(r.challenges || []); setSubmissions(r.submissions || {}); }
    catch (_) {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function afterSubmit() { await load(); if (onUserRefresh) onUserRefresh(); }

  return (
    <div className="space-y-5">
      <SubIntro title={t("Acelerar progreso")} subtitle={t("Completa retos para adelantar días y subir de nivel más rápido.")} onBack={onBack} />
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl grid place-items-center flex-shrink-0" style={{ background: GOLD, color: NAVY }}>
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-600">{t("Llevas ")}<span className="font-semibold text-slate-900">{rlevel.daysActive}</span>{t(" días en Robin")}{user.bonus_days ? <> · <span className="font-semibold" style={{ color: "#ECB450" }}>+{user.bonus_days}</span>{t(" por retos")}</> : null}.</div>
            <div className="text-xs text-slate-400 mt-0.5">{rlevel.nextLevel ? t("Te faltan {0} días para {1}", [rlevel.daysRemaining, robinLevelDef(rlevel.nextLevel).label]) : t("Nivel máximo alcanzado")}</div>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-slate-400 px-2"><Loader2 className="h-4 w-4 animate-spin inline" />{t(" Cargando retos…")}</div>}
      {!loading && challenges.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-slate-400">{t("Todavía no hay retos disponibles. Vuelve pronto.")}</CardContent></Card>
      )}
      {!loading && challenges.map((ch) => (
        <ChallengeCard key={ch.id} ch={ch} submission={submissions[ch.id]} onSubmitted={afterSubmit} />
      ))}
    </div>
  );
}

export { SubChallenges };
