import React, { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Badge, Btn, Card, CardContent, CardHeader } from '../../shared/ui.jsx';
import { NAVY } from '../../shared/theme.js';
import { bookingsList } from '../../api/arrival.js';

export function ArrivalHome({ user, setActive }) {
  const [bookings, setBookings] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const data = await bookingsList(); setBookings(data.bookings || []); }
    catch (_) { setError('No hemos podido cargar tus llamadas.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const upcoming = bookings.filter(booking => booking.status === 'scheduled' && Date.parse(booking.start_at) + Number(booking.duration_min || 30) * 60000 > Date.now());
  const pack = user.arrival_pack || {};
  return <div className="space-y-5">
    <div className="rounded-2xl p-6" style={{ background: NAVY }}>
      <p className="text-white/60 text-xs mb-2">The Robin Plan</p>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--robin-font-display)' }}>Pack Llegada</h1><Badge tone={pack.status === 'active' ? 'green' : 'amber'}>{pack.status === 'active' ? 'Activo' : pack.status === 'ended' ? 'Servicio finalizado' : 'Primer pago pendiente'}</Badge></div>
      <p className="text-white/70 text-sm mt-2">Tus llamadas con el asesor y la gestión de tu Pack Llegada.</p>
    </div>
    <button className="rounded-2xl p-5 text-left w-full flex items-center justify-between gap-4" style={{ background: '#ECB450', color: NAVY }} onClick={() => setActive('llamadas')}>
      <span><span className="flex items-center gap-2 text-sm font-semibold"><Calendar size={18} />Mis llamadas</span><span className="block text-sm mt-2">Próximas con tu asesor</span></span>
      <span className="text-4xl font-bold" style={{ fontFamily: 'var(--robin-font-display)' }}>{loading || error ? '—' : upcoming.length}</span>
    </button>
    <Card><CardHeader title="Mis llamadas" icon={Calendar} /><CardContent className="space-y-4">
      {loading && <p role="status" className="flex gap-2 items-center text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Cargando llamadas…</p>}
      {error && <div role="alert"><p>{error}</p><Btn variant="secondary" onClick={load}>Reintentar</Btn></div>}
      {!loading && !error && upcoming.length === 0 && <p className="text-sm text-slate-500">Aún no tienes llamadas programadas. Reserva una llamada con tu asesor cuando lo necesites.</p>}
      {!loading && !error && upcoming.map(booking => <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-3" key={booking.id}>
        <div><time className="font-semibold" dateTime={booking.start_at}>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(booking.start_at))}</time><p className="text-sm text-slate-500">{booking.topic} · {booking.duration_min} min</p></div>
        <div className="flex gap-3 items-center"><Badge tone={booking.cancellation_requested_at ? 'amber' : 'green'}>{booking.cancellation_requested_at ? 'Cancelación solicitada' : 'Confirmada'}</Badge>{booking.meet_join_url && <a href={booking.meet_join_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Entrar a la llamada</a>}</div>
      </div>)}
      <Btn onClick={() => setActive('llamadas')}>Reservar llamada con mi asesor</Btn>
    </CardContent></Card>
  </div>;
}
