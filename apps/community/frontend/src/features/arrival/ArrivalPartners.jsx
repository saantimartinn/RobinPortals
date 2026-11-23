import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React, { useEffect, useState } from 'react';
import { partnersList } from '../../api/index.js';
import { SubPartners } from '../community/SubPartners.jsx';
import { Btn } from '../../shared/ui.jsx';

export function ArrivalPartners() {
  useLocale();
  const [partners, setPartners] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const data = await partnersList(); setPartners(data.partners || []); }
    catch (_) { setError('No se han podido cargar los partners.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-5">
    {error && <div role="alert"><p className="text-sm text-rose-700 mb-3">{t(error)}</p><Btn variant="secondary" onClick={load}>{t("Reintentar")}</Btn></div>}
    <SubPartners partners={partners} loading={loading} websiteStyle />
  </div>;
}
