// Admin workspace module for admin reservas; AdminPortal composes these views.
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { NAVY } from "../../theme.js";
import { Badge, Card, CardContent, CardHeader } from "../../ui.jsx";
import { bookingsList, bookingsCancel } from "../../api.js";

export function AdminReservas({ client }) {
  /* AdminReservas v2 — lee bookings reales de la API (filtradas por user_id del cliente) */
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await bookingsList(client.id);
        if (!cancel) setBookings(res.bookings || []);
      } catch (e) {
        if (!cancel) setError(e.message || "No se pudieron cargar las reservas.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [client.id, refreshKey]);

  async function changeBooking(booking, action) {
    if (action !== "reject" && !window.confirm(action === "approve"
      ? "¿Aprobar la cancelación? Se eliminará el evento de Google Calendar y se avisará a los invitados."
      : "¿Cancelar esta llamada? Se eliminará el evento de Google Calendar y se avisará a los invitados.")) return;
    setError(""); setBusyId(booking.id);
    try {
      await bookingsCancel(booking.id, action);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message || "No se pudo actualizar la llamada.");
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = bookings.filter((b) => b.status === "scheduled" && new Date(b.start_at).getTime() > Date.now())
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const past = bookings.filter((b) => new Date(b.start_at) < new Date(Date.now() - 60 * 60_000))
    .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Próximas llamadas" subtitle={`Con ${client.nombre || ""} ${client.apellidos || ""}`} icon={Calendar} />
        <CardContent>
          {loading && <div className="text-xs text-slate-500">Cargando…</div>}
          {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
          {!loading && upcoming.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-6">Aún no hay reservas. El alumno puede reservar desde su portal.</div>
          )}
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(b.start_at))} · {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_at))}
                </div>
                <div className="text-xs text-slate-400 truncate">{b.topic} · {b.duration_min} min</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {b.cancellation_requested_at ? (
                  <>
                    <Badge tone="amber">Solicita cancelar</Badge>
                    <button type="button" disabled={busyId === b.id} onClick={() => changeBooking(b, "approve")}
                      className="text-xs font-semibold text-emerald-700 underline disabled:opacity-50">Aprobar</button>
                    <button type="button" disabled={busyId === b.id} onClick={() => changeBooking(b, "reject")}
                      className="text-xs font-semibold text-slate-600 underline disabled:opacity-50">Rechazar</button>
                  </>
                ) : (
                  <button type="button" disabled={busyId === b.id} onClick={() => changeBooking(b, "cancel")}
                    className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Cancelar llamada</button>
                )}
                {b.meet_join_url && (
                  <a href={b.meet_join_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold underline" style={{ color: NAVY }}>
                    Entrar a Meet
                  </a>
                )}
                {!b.cancellation_requested_at && <Badge tone="green">Confirmada</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader title="Histórico" subtitle={`${past.length} llamada(s) pasadas`} icon={Calendar} />
          <CardContent className="space-y-2">
            {past.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm text-slate-700 truncate">
                    {new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(b.start_at))} · {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_at))}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{b.topic}</div>
                </div>
                <Badge tone="slate">{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
