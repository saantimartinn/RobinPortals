// Portal view or navigation module for bookings portal; the application shell owns session state.
import { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { NAVY } from "../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader } from "../ui.jsx";
import { bookingsList, bookingsCreate, bookingsAvailability } from "../api.js";

export function Reservas() {
  const [serverBookings, setServerBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastCreated, setLastCreated] = useState(null);

  // Disponibilidad real del asesor (Google Calendar free/busy)
  const [avDays, setAvDays] = useState([]);
  const [avLoading, setAvLoading] = useState(true);
  const [advisorName, setAdvisorName] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [slotMin, setSlotMin] = useState(60);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError("");
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
    let cancel = false;
    (async () => {
      setAvLoading(true);
      try {
        const res = await bookingsAvailability({ days: 14 });
        if (cancel) return;
        const days = res.days || [];
        setAvDays(days);
        setAdvisorName(res.advisor || "");
        setCalendarConnected(res.calendar_connected !== false);
        if (res.slot_min) setSlotMin(res.slot_min);
        const firstWithSlots = days.find((d) => (d.slots || []).length > 0);
        setSelectedDate((prev) => prev || (firstWithSlots ? firstWithSlots.date : (days[0] ? days[0].date : "")));
      } catch (e) {
        if (!cancel) setAvDays([]);
      } finally {
        if (!cancel) setAvLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [refreshKey]);

  async function reserve() {
    setError("");
    if (!selectedSlot) { setError("Selecciona un hueco disponible."); return; }
    setBusy(true);
    try {
      const res = await bookingsCreate({ start_at: selectedSlot, duration_min: slotMin });
      setLastCreated(res.booking || null);
      setSelectedSlot("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message || "No se pudo crear la reserva.");
    } finally {
      setBusy(false);
    }
  }

  const upcoming = serverBookings.filter((b) => b.status !== "cancelled")
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const dayObj = avDays.find((d) => d.date === selectedDate) || null;
  const daySlots = dayObj ? (dayObj.slots || []) : [];
  const fmtDayBtn = (dstr) => {
    const dd = new Date(dstr + "T12:00:00");
    return {
      wd: new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(dd),
      dm: new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(dd),
    };
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Reservar llamada" subtitle={advisorName ? ("Con tu asesor " + advisorName + " · vía Google Meet") : "Con tu asesor Robin · vía Google Meet"} icon={Calendar} />
        <CardContent>
          {avLoading && <div className="text-xs text-slate-500 mb-3">Cargando disponibilidad…</div>}
          {!avLoading && !calendarConnected && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Mostrando horario orientativo. Confirmaremos el hueco con tu asesor.
            </div>
          )}

          {!avLoading && avDays.length > 0 && (
            <>
              <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Día</div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {avDays.map((d) => {
                  const f = fmtDayBtn(d.date);
                  const has = (d.slots || []).length > 0;
                  const sel = d.date === selectedDate;
                  return (
                    <button key={d.date} type="button" disabled={!has}
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(""); }}
                      className={"flex-shrink-0 rounded-xl border px-3 py-2 text-center min-w-[68px] " + (sel ? "border-transparent text-white" : has ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300" : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed")}
                      style={sel ? { background: NAVY } : undefined}>
                      <div className="text-[10px] uppercase tracking-wide">{f.wd}</div>
                      <div className="text-sm font-semibold">{f.dm}</div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Hora ({slotMin} min)</div>
              {daySlots.length === 0 ? (
                <div className="text-xs text-slate-500 mb-4">Sin huecos disponibles este día.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {daySlots.map((sl) => {
                    const sel = sl.start === selectedSlot;
                    return (
                      <button key={sl.start} type="button"
                        onClick={() => setSelectedSlot(sl.start)}
                        className={"rounded-lg border px-2 py-2 text-sm font-medium " + (sel ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}
                        style={sel ? { background: NAVY } : undefined}>
                        {sl.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!avLoading && avDays.length === 0 && (
            <div className="text-xs text-slate-500 mb-4">No hay disponibilidad para mostrar ahora mismo.</div>
          )}

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</div>
          )}
          <div className="flex items-center gap-3">
            <Btn variant="primary" onClick={reserve} disabled={busy || !selectedSlot}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reservando…</> : <><Calendar className="h-3.5 w-3.5" /> Reservar Meet</>}
            </Btn>
            <div className="text-[11px] text-slate-400">Zona horaria Europe/Madrid · te llegará un email con el enlace.</div>
          </div>

          {lastCreated && (
            <div className="mt-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <div className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> ¡Reserva creada!
              </div>
              {lastCreated.meet_join_url && (
                <div className="mt-2">
                  <a href={lastCreated.meet_join_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold underline" style={{ color: NAVY }}>
                    Abrir Google Meet
                  </a>
                </div>
              )}
              {lastCreated.start_at && (
                <div className="text-xs text-slate-600 mt-1">
                  {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(lastCreated.start_at))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Llamadas confirmadas" subtitle={`${upcoming.length} reserva(s)`} icon={Calendar} />
        <CardContent className="space-y-2">
          {loading && <div className="text-xs text-slate-500">Cargando…</div>}
          {!loading && upcoming.length === 0 && (
            <div className="text-xs text-slate-500">Aún no tienes llamadas reservadas.</div>
          )}
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(b.start_at))} · {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_at))}
                </div>
                <div className="text-xs text-slate-400 truncate">{b.topic} · {b.duration_min} min</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {b.meet_join_url && (
                  <a href={b.meet_join_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold underline" style={{ color: NAVY }}>
                    Entrar
                  </a>
                )}
                <Badge tone="green">Confirmada</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
