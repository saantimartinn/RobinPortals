import { getLocale, t, useLocale } from "../../../../../packages/i18n/react.jsx";
// Portal view or navigation module for bookings portal; the application shell owns session state.
import { formatDateTime } from "../client-utils.js";
import { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { NAVY } from "../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader } from "../ui.jsx";
import { bookingsList, bookingsCreate, bookingsCancel, bookingsAvailability } from "../api.js";

const PENDING_BOOKING_MESSAGE = "Ya tienes una llamada reservada. Podrás reservar otra cuando haya pasado o tu asesor la cancele. Solicitar su cancelación no libera la reserva hasta que tu asesor la apruebe.";

export function Reservas({ reserveLabel = 'Reservar Meet', timeZone, bookingNotice = '' } = {}) {
  useLocale();
  const formatBooking = (value, options) => timeZone
    ? new Intl.DateTimeFormat(getLocale(), { ...options, timeZone }).format(new Date(value))
    : formatDateTime(value, options);
  const [serverBookings, setServerBookings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastCreated, setLastCreated] = useState(null);

  // Disponibilidad real del asesor (Google Calendar free/busy)
  const [avDays, setAvDays] = useState([]);
  const [avLoading, setAvLoading] = useState(true);
  const [advisorName, setAdvisorName] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [slotMin, setSlotMin] = useState(30);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityError, setAvailabilityError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const res = await bookingsList();
        if (!cancel) setServerBookings(res.bookings || []);
      } catch (e) {
        if (!cancel) setError(e.message || "No se pudieron cargar las reservas.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (bookingNotice) { setAvLoading(false); return; }
    let cancel = false;
    (async () => {
      setAvLoading(true); setAvailabilityError('');
      try {
        const res = await bookingsAvailability({ days: 14 });
        if (cancel) return;
        let days = res.days || [];
        if (timeZone) {
          const localDays = new Map();
          for (const day of days) for (const slot of day.slots || []) {
            const date = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(slot.start));
            if (!localDays.has(date)) localDays.set(date, []);
            localDays.get(date).push({ ...slot, label: formatBooking(slot.start, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) });
          }
          days = [...localDays].sort(([a], [b]) => a.localeCompare(b)).map(([date, slots]) => ({ date, slots }));
        }
        setAvDays(days);
        setAdvisorName(res.advisor || "");
        setCalendarConnected(res.calendar_connected !== false);
        if (res.slot_min) setSlotMin(res.slot_min);
        const firstWithSlots = days.find((d) => (d.slots || []).length > 0);
        setSelectedDate((prev) => prev || (firstWithSlots ? firstWithSlots.date : (days[0] ? days[0].date : "")));
      } catch (e) {
        if (!cancel) { setAvDays([]); setAvailabilityError(e.data?.error === 'no_admin_assigned' ? 'Todavía no tienes asesor asignado. Contacta con soporte.' : 'No hemos podido consultar el calendario de tu asesor. Inténtalo de nuevo.'); }
      } finally {
        if (!cancel) setAvLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [refreshKey, timeZone, bookingNotice]);

  async function reserve() {
    if (loading || serverBookings === null || busy) return;
    setError("");
    if (upcoming.length) { setError(PENDING_BOOKING_MESSAGE); return; }
    if (!selectedSlot) { setError("Selecciona un hueco disponible."); return; }
    setBusy(true);
    try {
      const res = await bookingsCreate({ start_at: selectedSlot, duration_min: slotMin });
      setLastCreated(res.booking || null);
      if (res.booking) setServerBookings((previous) => [...(previous || []), res.booking]);
      setSelectedSlot("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      if (e.status === 409 && e.data?.error === "booking_pending") {
        setError(PENDING_BOOKING_MESSAGE);
        setSelectedSlot("");
        setRefreshKey((k) => k + 1);
      } else if (e.status === 409 && e.data?.error === "slot_unavailable") {
        setError("Ese horario ya no está disponible. Elige otro; dejamos al menos 15 minutos entre llamadas.");
        setSelectedSlot("");
        setRefreshKey((k) => k + 1);
      } else {
        setError(e.message || "No se pudo crear la reserva.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestCancellation(booking) {
    if (!window.confirm(t("¿Solicitar la cancelación de esta llamada? Seguirá confirmada hasta que tu asesor la apruebe."))) return;
    setError(""); setCancellingId(booking.id);
    try {
      await bookingsCancel(booking.id, "request");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message || "No se pudo enviar la solicitud.");
    } finally {
      setCancellingId(null);
    }
  }

  const upcoming = (serverBookings || []).filter((b) => b.status === "scheduled" && new Date(b.start_at).getTime() + (timeZone ? Number(b.duration_min || 30) * 60000 : 0) > Date.now())
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const bookingBlocked = !!bookingNotice || loading || serverBookings === null || upcoming.length > 0;
  const dayObj = avDays.find((d) => d.date === selectedDate) || null;
  const daySlots = dayObj ? (dayObj.slots || []) : [];
  const fmtDayBtn = (dstr) => {
    const dd = new Date(dstr + "T12:00:00");
    return {
      wd: new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(dd),
      dm: new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "short" }).format(dd),
    };
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t("Reservar llamada")} subtitle={advisorName ? t("Con tu asesor {0} · vía Google Meet", [advisorName]) : t("Con tu asesor Robin · vía Google Meet")} icon={Calendar} />
        <CardContent>
          {bookingNotice && <p role="status" className="text-sm text-amber-700 mb-3">{t(bookingNotice)}</p>}
          {loading && <div className="text-xs text-slate-500 mb-3">{t("Comprobando tus reservas…")}</div>}
          {upcoming.length > 0 && <div role="status" className="text-xs text-slate-600 mb-3">{t(PENDING_BOOKING_MESSAGE)}</div>}
          {!bookingBlocked && avLoading && <div className="text-xs text-slate-500 mb-3">{t("Cargando disponibilidad…")}</div>}
          {!bookingBlocked && !avLoading && !calendarConnected && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              {timeZone ? t('El calendario de tu asesor no está disponible. Contacta con soporte o vuelve a intentarlo.') : t('Mostrando horario orientativo. Confirmaremos el hueco con tu asesor.')}
            </div>
          )}

          {!bookingBlocked && !avLoading && avDays.length > 0 && (
            <>
              <div className="text-xs font-semibold text-slate-600 mb-2 ">{t("Día")}</div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {avDays.map((d) => {
                  const f = fmtDayBtn(d.date);
                  const has = (d.slots || []).length > 0;
                  const sel = d.date === selectedDate;
                  return (
                    <button key={d.date} type="button" disabled={!has}
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(""); setError(""); }}
                      className={"flex-shrink-0 rounded-xl border px-3 py-2 text-center min-w-[68px] " + (sel ? "border-transparent text-white" : has ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300" : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed")}
                      style={sel ? { background: NAVY } : undefined}>
                      <div className="text-[10px] ">{f.wd}</div>
                      <div className="text-sm font-semibold">{f.dm}</div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold text-slate-600 mb-2 ">{t("Hora (")}{slotMin}{t(" min)")}</div>
              <div className="text-[11px] text-slate-500 mb-2">{t("Hay al menos 15 minutos libres entre llamadas de un mismo mentor.")}</div>
              {daySlots.length === 0 ? (
                <div className="text-xs text-slate-500 mb-4">{t("Sin huecos disponibles este día.")}</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {daySlots.map((sl) => {
                    const sel = sl.start === selectedSlot;
                    return (
                      <button key={sl.start} type="button"
                        onClick={() => { setSelectedSlot(sl.start); setError(""); }}
                        className={"rounded-lg border px-2 py-2 text-sm font-medium " + (sel ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}
                        style={sel ? { background: NAVY } : undefined}>
                        {t(sl.label)}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!bookingBlocked && !avLoading && avDays.length === 0 && (
            <div className="text-xs text-slate-500 mb-4">{t("No hay disponibilidad para mostrar ahora mismo.")}</div>
          )}

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{t(error)}</div>
          )}
          {timeZone && availabilityError && <div role="alert" className="text-sm text-rose-700 mb-3">{t(availabilityError)} <button className="underline" onClick={() => setRefreshKey(k => k + 1)}>{t("Reintentar")}</button></div>}
          <div className="flex items-center gap-3">
            <Btn variant="primary" onClick={reserve} disabled={bookingBlocked || busy || !selectedSlot}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t(" Reservando…")}</> : <><Calendar className="h-3.5 w-3.5" /> {t(reserveLabel)}</>}
            </Btn>
            <div className="text-[11px] text-slate-400">{t("Zona horaria ")}{timeZone || 'Europe/Madrid'}{t(" · te llegará un email con el enlace.")}</div>
          </div>

          {lastCreated && (
            <div className="mt-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <div className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />{t(" ¡Reserva creada!")}</div>
              {lastCreated.meet_join_url && (
                <div className="mt-2">
                  <a href={lastCreated.meet_join_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold underline" style={{ color: NAVY }}>{t("Abrir Google Meet")}</a>
                </div>
              )}
              {lastCreated.start_at && (
                <div className="text-xs text-slate-600 mt-1">
                  {formatBooking(new Date(lastCreated.start_at), { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("Llamadas confirmadas")} subtitle={t("{0} reserva(s)", [upcoming.length])} icon={Calendar} />
        <CardContent className="space-y-2">
          {error && <div className="text-xs text-rose-700">{t(error)}</div>}
          {loading && <div className="text-xs text-slate-500">{t("Cargando…")}</div>}
          {!loading && upcoming.length === 0 && (
            <div className="text-xs text-slate-500">{t("Aún no tienes llamadas reservadas.")}</div>
          )}
          {upcoming.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {formatBooking(new Date(b.start_at), { weekday: "long", day: "2-digit", month: "long" })} · {formatBooking(new Date(b.start_at), { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs text-slate-400 truncate">{b.topic} · {b.duration_min} min</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {b.cancellation_requested_at ? (
                  <Badge tone="amber">{t("Cancelación solicitada")}</Badge>
                ) : new Date(b.start_at).getTime() > Date.now() ? (
                  <button type="button" disabled={cancellingId === b.id}
                    onClick={() => requestCancellation(b)}
                    className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">
                    {cancellingId === b.id ? t("Enviando…") : t("Solicitar cancelación")}
                  </button>
                ) : null}
                {b.meet_join_url && (
                  <a href={b.meet_join_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold underline" style={{ color: NAVY }}>{t("Entrar")}</a>
                )}
                {!b.cancellation_requested_at && <Badge tone="green">{t("Confirmada")}</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {timeZone && <Card><CardHeader title={t("Historial de llamadas")} icon={Calendar} /><CardContent className="space-y-3">
        {!loading && (serverBookings || []).filter(b => !upcoming.some(next => next.id === b.id)).length === 0 && <p className="text-sm text-slate-500">{t("Todavía no hay otras llamadas.")}</p>}
        {(serverBookings || []).filter(b => !upcoming.some(next => next.id === b.id)).map(b => <div key={b.id} className="flex flex-wrap justify-between gap-2 text-sm"><time dateTime={b.start_at}>{formatBooking(b.start_at, { dateStyle: 'medium', timeStyle: 'short' })}</time><Badge>{b.status === 'cancelled' ? t('Cancelada') : b.status === 'scheduled' ? t('Programada') : b.status}</Badge></div>)}
      </CardContent></Card>}
    </div>
  );
}
