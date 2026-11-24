import { getLocale, t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React, { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Badge, Btn, Card, CardContent, CardHeader } from '../../shared/ui.jsx';
import { NAVY } from '../../shared/theme.js';
import { bookingsList } from '../../api/arrival.js';
import { SUB_STATUS_LABELS } from '../../shared/constants.js';

export function SubHome({ user, setActive }) {
  useLocale();
  const hasArrival = !!user.arrival_pack;
  const [bookings, setBookings] = useState([]), [loading, setLoading] = useState(hasArrival), [error, setError] = useState('');
  async function load() {
    setError('');
    if (!hasArrival) { setBookings([]); setLoading(false); return; }
    setLoading(true);
    try { const data = await bookingsList(); setBookings(data.bookings || []); }
    catch (_) { setError('No hemos podido cargar tus llamadas.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [user.id, hasArrival]);
  const upcoming = bookings.filter(booking => booking.status === 'scheduled' && Date.parse(booking.start_at) + Number(booking.duration_min || 30) * 60000 > Date.now());
  const pack = user.arrival_pack || {};
  const status = SUB_STATUS_LABELS[user.subscription_status] || SUB_STATUS_LABELS.none;
  const productName = hasArrival ? 'Pack Llegada' : user.subscription_plan === 'annual' ? 'Plan Anual' : 'Plan Mensual';
  const stateLabel = hasArrival ? pack.status === 'active' ? 'Activo' : pack.status === 'ended' ? 'Servicio finalizado' : 'Primer pago pendiente' : status.label;
  return <div className="space-y-5">
    <div className="rounded-2xl p-6" style={{ background: NAVY }}>
      <p className="text-white/60 text-xs mb-2">The Robin Plan</p>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--robin-font-display)' }}>{t(productName)}</h1><Badge tone={hasArrival ? pack.status === 'active' ? 'green' : 'amber' : status.tone}>{t(stateLabel)}</Badge></div>
      <p className="text-white/70 text-sm mt-2">{hasArrival ? t('Tus llamadas con el asesor y la gestión de tu Pack Llegada.') : t('Tus partners, soporte y gestiones, en un mismo lugar.')}</p>
    </div>
    <button className="rounded-2xl p-5 text-left w-full flex items-center justify-between gap-4" style={{ background: '#ECB450', color: NAVY }} onClick={() => setActive('llamadas')}>
      <span><span className="flex items-center gap-2 text-sm font-semibold"><Calendar size={18} />{t("Mis llamadas")}</span><span className="block text-sm mt-2">{hasArrival ? t('Próximas con tu asesor') : t('No incluidas en tu suscripción')}</span></span>
      <span className="text-4xl font-bold" style={{ fontFamily: 'var(--robin-font-display)' }}>{!hasArrival || loading || error ? '—' : upcoming.length}</span>
    </button>
    <Card><CardHeader title={t("Mis llamadas")} icon={Calendar} /><CardContent className="space-y-4">
      {!hasArrival && <p className="text-sm text-slate-500">{t("Las llamadas con asesor están incluidas en Pack Llegada. Tu suscripción no incluye este servicio.")}</p>}
      {loading && <p role="status" className="flex gap-2 items-center text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{t("Cargando llamadas…")}</p>}
      {error && <div role="alert"><p>{t(error)}</p><Btn variant="secondary" onClick={load}>{t("Reintentar")}</Btn></div>}
      {hasArrival && !loading && !error && upcoming.length === 0 && <p className="text-sm text-slate-500">{t("Aún no tienes llamadas programadas. Reserva una llamada con tu asesor cuando lo necesites.")}</p>}
      {hasArrival && !loading && !error && upcoming.map(booking => <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-3" key={booking.id}>
        <div><time className="font-semibold" dateTime={booking.start_at}>{new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long', timeStyle: 'short' }).format(new Date(booking.start_at))}</time><p className="text-sm text-slate-500">{booking.topic} · {booking.duration_min} min</p></div>
        <div className="flex gap-3 items-center"><Badge tone={booking.cancellation_requested_at ? 'amber' : 'green'}>{booking.cancellation_requested_at ? t('Cancelación solicitada') : t('Confirmada')}</Badge>{booking.meet_join_url && <a href={booking.meet_join_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">{t("Entrar a la llamada")}</a>}</div>
      </div>)}
      <Btn onClick={() => setActive(hasArrival ? 'llamadas' : 'soporte')}>{hasArrival ? t("Reservar llamada con mi asesor") : t("Contactar con Soporte")}</Btn>
    </CardContent></Card>
  </div>;
}
