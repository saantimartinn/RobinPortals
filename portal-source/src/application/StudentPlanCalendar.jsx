// Student plan view combines booked calls with dated career requirements.
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Loader2, MessageCircle } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "../ui.jsx";
import { bookingsList, documentsList } from "../api.js";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const today = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function makePlanItems(bookings, documents) {
  const documentItems = (documents || [])
    .filter((document) => document.deadline)
    .map((document) => ({
      id: `document-${document.id}`,
      date: String(document.deadline).slice(0, 10),
      title: document.name,
      detail: document.status === "validated" ? "Documento validado" : "Fecha límite de entrega",
      kind: "document",
    }));
  const calls = (bookings || [])
    .filter((booking) => booking.status !== "cancelled" && booking.start_at)
    .map((booking) => {
      const start = new Date(booking.start_at);
      return {
        id: `booking-${booking.id}`,
        date: dateKey(start),
        time: new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(start),
        title: booking.topic || "Llamada con tu asesor",
        detail: `${booking.duration_min || 30} min`,
        kind: "call",
      };
    });
  return [...documentItems, ...calls].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
}

function formatSelectedDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function StudentPlanCalendar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => {
    const now = today();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today()));

  useEffect(() => {
    let cancelled = false;
    Promise.all([bookingsList(), documentsList()])
      .then(([bookingResult, documentResult]) => {
        if (!cancelled) setItems(makePlanItems(bookingResult.bookings || [], documentResult.documents || []));
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || "No se pudo cargar tu plan."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const itemMap = useMemo(() => items.reduce((map, item) => {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date).push(item);
    return map;
  }, new Map()), [items]);

  const calendarDays = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
      return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
    });
  }, [month]);

  const selectedItems = itemMap.get(selectedDate) || [];
  const monthLabel = month.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const todayKey = dateKey(today());

  function shiftMonth(delta) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelectedDate(dateKey(next));
  }
  function goToToday() {
    const now = today();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(dateKey(now));
  }

  return (
    <div className="space-y-5">
      <Card className="student-plan-card">
        <CardHeader title="Mi plan" subtitle="Tus fechas importantes y llamadas, organizadas en un calendario" icon={CalendarDays} />
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando tu plan…</div>
          ) : error ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>
          ) : (
            <div className="student-plan-layout">
              <section className="student-calendar" aria-label="Calendario mensual">
                <div className="student-calendar-toolbar">
                  <div><span className="student-calendar-eyebrow">CALENDARIO</span><h2>{monthLabel}</h2></div>
                  <div className="student-calendar-controls">
                    <button type="button" onClick={goToToday} className="student-calendar-today">Hoy</button>
                    <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior" className="student-calendar-arrow"><ChevronLeft size={17} /></button>
                    <button type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente" className="student-calendar-arrow"><ChevronRight size={17} /></button>
                  </div>
                </div>
                <div className="student-calendar-grid" role="grid" aria-label={monthLabel}>
                  {WEEKDAYS.map((day, index) => <div key={`${day}-${index}`} className="student-calendar-weekday" role="columnheader">{day}</div>)}
                  {calendarDays.map(({ date, key, inMonth }) => {
                    const dayItems = itemMap.get(key) || [];
                    const selected = key === selectedDate;
                    const isToday = key === todayKey;
                    const kinds = [...new Set(dayItems.map((item) => item.kind))];
                    return (
                      <button key={key} type="button" role="gridcell" aria-pressed={selected}
                        aria-label={`${formatSelectedDate(key)}${dayItems.length ? `, ${dayItems.length} elemento(s)` : ""}`}
                        onClick={() => setSelectedDate(key)}
                        className={`student-calendar-day ${inMonth ? "" : "is-outside"} ${selected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}>
                        <span className="student-calendar-day-number">{date.getDate()}</span>
                        <span className="student-calendar-dots" aria-hidden="true">
                          {kinds.slice(0, 3).map((kind) => <i key={kind} className={`is-${kind}`} />)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="student-calendar-legend">
                  <span><i className="is-document" />Documentos</span>
                  <span><i className="is-call" />Llamadas</span>
                </div>
              </section>

              <aside className="student-plan-agenda" aria-live="polite">
                <div className="student-plan-agenda-heading"><span className="student-calendar-eyebrow">TU AGENDA</span><h3>{formatSelectedDate(selectedDate)}</h3></div>
                {selectedItems.length === 0 ? (
                  <div className="student-plan-empty"><CalendarDays size={23} /><strong>Un día libre</strong><span>No tienes nada apuntado para esta fecha.</span></div>
                ) : (
                  <div className="student-plan-items">
                    {selectedItems.map((item) => {
                      const Icon = item.kind === "call" ? MessageCircle : FileText;
                      const label = item.kind === "call" ? "Llamada" : "Documento";
                      const tone = item.kind === "call" ? "blue" : "green";
                      return (
                        <article key={item.id} className={`student-plan-item is-${item.kind}`}>
                          <span className="student-plan-item-icon"><Icon size={16} /></span>
                          <div className="student-plan-item-copy"><div className="student-plan-item-top"><Badge tone={tone}>{label}</Badge>{item.time && <time>{item.time}</time>}</div><strong>{item.title}</strong><span>{item.detail}</span></div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </aside>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
