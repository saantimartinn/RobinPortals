// Admin feature module for lead inbox; the feature registry connects it to the authenticated shell.
import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Plus, Search, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Contact, LostReason } from "@/types/domain";
import { adminDataClient, type FutureLead, type WebBooking } from "@/services/admin-data";
import type { FeatureModuleProps } from './feature-shared';
import { lostReasonLabel, lostReasonOptions, Title, ContactDrawer } from './feature-shared';
import { type InboxView, type LostLeadSection, type EventLeadSection, type ReservationLeadSection, LeadGroupRow, emptyLeadGroupRow, leadEntryTimestamp, leadDaysWithoutContact, formatLeadEntry, inboxCampaignLabel, matchesInboxView, leadInboxSection } from "./lead-shared";
import { leadCourseGroup, leadCourseGroups } from "./lead-course-group.mjs";

export function LeadInbox({ currentUser, admins, contacts, leadOwners, leadStages, leadLostDates, onAssignLead, onMoveLead, onDeleteLead, onAddLead, onAddLeads, onSetLeadHeat, onSetLeadContactRole, onSetLeadCourse, notify }: FeatureModuleProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [view, setView] = useState<InboxView>(() => {
    const initialView = new URLSearchParams(window.location.search).get("view");
    return initialView === "lost" || initialView === "eventos" || initialView === "reservas" ? initialView : "all";
  });
  const [lostSection, setLostSection] = useState<LostLeadSection>(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    return section === "definitive" || section === "overdue" ? section : "future";
  });
  const [eventSection, setEventSection] = useState<EventLeadSection>(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    return section === "canarias" || section === "valencia" || section === "webinar-21-11" ? section : "lisboa";
  });
  const [reservationSection, setReservationSection] = useState<ReservationLeadSection>(() => new URLSearchParams(window.location.search).get("section") === "retargeting" ? "retargeting" : "general");
  const [now, setNow] = useState(Date.now);
  const [futureLeads, setFutureLeads] = useState<FutureLead[]>([]);
  const [futureLoading, setFutureLoading] = useState(false);
  const [futureError, setFutureError] = useState("");
  const [futureRetry, setFutureRetry] = useState(0);
  const [bookings, setBookings] = useState<WebBooking[] | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingRetry, setBookingRetry] = useState(0);
  const [addingLead, setAddingLead] = useState(false);
  const [manualLead, setManualLead] = useState({ name: "", email: "", phone: "", notes: "", owner: "", source: "organic" });
  const [savingLead, setSavingLead] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupRows, setGroupRows] = useState<LeadGroupRow[]>(() => Array.from({ length: 6 }, emptyLeadGroupRow));
  const [savingGroup, setSavingGroup] = useState(false);
  const [pendingLost, setPendingLost] = useState<Contact | null>(null);
  const [lostReason, setLostReason] = useState<LostReason | "">("");
  const [lostReasonDetail, setLostReasonDetail] = useState("");
  const isLost = view === "lost";
  const isEvents = view === "eventos";
  const isFuture = isLost && lostSection === "future";
  const canAssign = !isLost || lostSection === "overdue";
  const futureById = useMemo(() => new Map(futureLeads.map((lead) => [lead.id, lead])), [futureLeads]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    const refreshAge = () => setNow(Date.now());
    window.addEventListener("focus", refreshAge);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshAge); };
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (isLost) { url.searchParams.set("view", "lost"); url.searchParams.set("section", lostSection); }
    else if (isEvents) { url.searchParams.set("view", "eventos"); url.searchParams.set("section", eventSection); }
    else if (view === "reservas") { url.searchParams.set("view", "reservas"); url.searchParams.set("section", reservationSection); }
    else { url.searchParams.delete("view"); url.searchParams.delete("section"); }
    window.history.replaceState(null, "", url);
  }, [isLost, isEvents, lostSection, eventSection, view, reservationSection]);
  useEffect(() => {
    if (!isFuture) return;
    let active = true;
    setFutureLoading(true);
    setFutureError("");
    const load = () => adminDataClient.listFutureLeads()
      .then((rows) => { if (active) { setFutureLeads(rows); setFutureError(""); } })
      .catch((error) => { if (active) setFutureError(error instanceof Error ? error.message : "Error de conexión"); })
      .finally(() => { if (active) setFutureLoading(false); });
    void load();
    const unsubscribe = adminDataClient.subscribe(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, [isFuture, futureRetry]);
  const sectionContacts = useMemo(() => isFuture ? futureLeads : contacts.filter((contact) => {
    const stage = leadStages[contact.id] || contact.stage || "Por contactar";
    const section = leadInboxSection(contact, stage, leadOwners[contact.id] ?? contact.owner, now);
    return isLost ? section === lostSection : section === "active" && matchesInboxView(contact, view, eventSection, reservationSection);
  }), [contacts, futureLeads, isFuture, isLost, lostSection, eventSection, reservationSection, leadOwners, leadStages, now, view]);
  const list = useMemo(() => sectionContacts.filter((contact) => {
    if (!`${contact.name} ${contact.email} ${contact.phone} ${contact.source} ${contact.campaign} ${inboxCampaignLabel(contact)} ${contact.formName || ""} ${contact.course || ""} ${contact.country || ""} ${contact.comment || ""}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (sourceFilter !== "all" && contact.source !== sourceFilter) return false;
    if (campaignFilter !== "all" && inboxCampaignLabel(contact) !== campaignFilter) return false;
    if (courseFilter !== "all" && leadCourseGroup(contact.course) !== courseFilter) return false;
    return true;
  }).sort((a, b) => leadEntryTimestamp(view === "reservas" ? b.retargetingReservationAt || b.createdAt : b.createdAt) - leadEntryTimestamp(view === "reservas" ? a.retargetingReservationAt || a.createdAt : a.createdAt) || b.id.localeCompare(a.id)), [sectionContacts, query, sourceFilter, campaignFilter, courseFilter, view]);
  useEffect(() => {
    if (view !== "reservas") return;
    let active = true;
    setBookings(null);
    setBookingError("");
    adminDataClient.listBookings()
      .then((rows) => { if (active) setBookings(rows); })
      .catch((error) => { if (active) { setBookings([]); setBookingError(error instanceof Error ? error.message : "Error de conexión"); } });
    return () => { active = false; };
  }, [view, bookingRetry]);
  const bookingByEmail = useMemo(() => {
    const grouped = new Map<string, WebBooking[]>();
    for (const booking of bookings || []) {
      if (!Number.isFinite(Date.parse(booking.start))) continue;
      for (const rawEmail of booking.emails || []) {
        const email = rawEmail.trim().toLowerCase();
        if (email) grouped.set(email, [...(grouped.get(email) || []), booking]);
      }
    }
    const selected = new Map<string, WebBooking>();
    const now = Date.now();
    for (const [email, matches] of grouped) {
      matches.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      selected.set(email, matches.find((booking) => Date.parse(booking.start) >= now) || matches[matches.length - 1]);
    }
    return selected;
  }, [bookings]);
  const sources = useMemo(() => [...new Set(sectionContacts.map((contact) => contact.source).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [sectionContacts]);
  const campaigns = useMemo(() => [...new Set(sectionContacts.map(inboxCampaignLabel).filter((campaign) => campaign !== "—" && campaign !== "Campaña pendiente" && campaign !== "Página no registrada"))].sort((a, b) => a.localeCompare(b, "es")), [sectionContacts]);
  const activeFilters = [sourceFilter, campaignFilter, courseFilter].filter((value) => value !== "all").length;
  function resetFilters() { setQuery(""); setSourceFilter("all"); setCampaignFilter("all"); setCourseFilter("all"); }
  function openLost(contact: Contact) {
    setPendingLost(contact);
    setLostReason("");
    setLostReasonDetail("");
  }
  function confirmLost(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingLost || !lostReason || (lostReason === "other" && !lostReasonDetail.trim())) return;
    if (!leadOwners[pendingLost.id]) onAssignLead(pendingLost.id, currentUser);
    onMoveLead(pendingLost.id, "Lost", { lostReason, lostReasonDetail: lostReason === "other" ? lostReasonDetail.trim() : "" });
    notify(`${pendingLost.name} enviado a Lost definitivos`);
    setPendingLost(null);
  }
  async function saveLeadGroup(event: React.FormEvent) {
    event.preventDefault();
    const populated = groupRows.filter((row) => Object.entries(row).some(([key, value]) => key !== "heat" && key !== "taskStatus" && String(value).trim()));
    if (!populated.length) { notify("Añade al menos un lead antes de guardar el grupo"); return; }
    const missingName = populated.find((row) => !row.name.trim());
    if (missingName) { notify(`Completa el nombre del lead en la fila ${groupRows.indexOf(missingName) + 1}`); return; }
    setSavingGroup(true);
    try {
      await onAddLeads(populated.map((row) => ({ name: row.name, email: row.email, phone: row.phone, schoolName: row.schoolName, area: row.area, leadType: row.leadType, lifecycle: row.lifecycle, taskStatus: row.taskStatus, heat: Number.isFinite(Number(row.heat)) ? Number(row.heat) : 50, campaign: row.campaign, notes: row.notes, owner: row.owner, source: row.source || (row.schoolName ? "schools" : "other"), groupName: groupName.trim() })));
      notify(`Grupo guardado: ${populated.length} leads añadidos a la bandeja`);
      setAddingGroup(false); setGroupName(""); setGroupRows(Array.from({ length: 6 }, emptyLeadGroupRow));
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo guardar el grupo de leads"); }
    finally { setSavingGroup(false); }
  }
  function exportLeads() {
    const rows = list;
    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Nombre", "Email", "Teléfono", "Origen", "Campaña", "Curso", "País", "Interés", "Responsable", "Días sin contactar", "Heat", "Motivo Lost", "Detalle Lost", "Comentario", "Fecha de alta", ...(isFuture ? ["Curso académico", "Fecha de archivo"] : [])];
    const body = rows.map((contact) => [contact.name, contact.email, contact.phone, contact.source, inboxCampaignLabel(contact), leadCourseGroup(contact.course), contact.country || "Otros", contact.interest || "", (isFuture ? contact.owner : leadOwners[contact.id] ?? contact.owner) || "Sin asignar", leadDaysWithoutContact(contact, Boolean(contact.owner), now) ?? "", contact.heat ?? "", lostReasonLabel(contact.lostReason), contact.lostReasonDetail || "", contact.comment || "", contact.createdAt || "", ...(isFuture ? [futureById.get(contact.id)?.academicYear || "", futureById.get(contact.id)?.archivedAt || ""] : [])].map(csvCell).join(","));
    const blob = new Blob([`\uFEFF${headers.map(csvCell).join(",")}\n${body.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `leads-robin-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
    notify(`${rows.length} leads exportados a CSV`);
  }
  return (
    <div className="page">
      <Title name="Bandeja de entrada de leads" sub="Asigna cada nuevo lead o márcalo como Lost." eyebrow="Inicio / Vista global">
        <Badge variant="outline">{list.length} {view === "reservas" ? list.length === 1 ? "reserva" : "reservas" : "leads"}</Badge>
      </Title>
      <div className="module-toolbar">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, email o canal…" /></label>
        <Button variant="outline" onClick={() => setFiltersOpen((open) => !open)}><Filter />Filtros{activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}</Button>
        <Button variant="outline" onClick={exportLeads} disabled={isFuture && (futureLoading || Boolean(futureError))}><Download />Exportar CSV</Button>
        {!isLost && <><Button variant="outline" onClick={() => setAddingGroup(true)}><Plus />Añadir grupo</Button>
        <Button onClick={() => setAddingLead(true)}><Plus />Añadir lead</Button></>}
      </div>
      {filtersOpen && <section className="lead-filters panel"><label>Origen<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">Todos los orígenes</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label><label>Campaña<select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}><option value="all">Todas las campañas</option>{campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}</select></label><label>Curso<select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">Todos los cursos</option>{leadCourseGroups.map((course) => <option key={course} value={course}>{course}</option>)}</select></label><button type="button" onClick={() => { setSourceFilter("all"); setCampaignFilter("all"); setCourseFilter("all"); }}>Limpiar filtros</button></section>}
      <nav className="inbox-views" aria-label="Secciones de la bandeja">
        {INBOX_VIEWS.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); resetFilters(); }}>{label}</button>)}
      </nav>
      {isLost && <section className="inbox-subsections" aria-label="Lost leads">
        <nav className="inbox-views" aria-label="Subsecciones de Lost leads">
          {LOST_SECTIONS.map(([key, label]) => <button key={key} type="button" aria-pressed={lostSection === key} onClick={() => { setLostSection(key); resetFilters(); }}>{label}</button>)}
        </nav>
        <p className="assignment-note">{lostSection === "future" ? "Leads guardados para retomar en próximos cursos." : lostSection === "definitive" ? "Leads descartados definitivamente, con su motivo de pérdida." : "Leads que han pasado más de 30 días sin asignar en la bandeja. Ya no aparecen en las pestañas de entrada."}</p>
      </section>}
      {isEvents && <section className="inbox-subsections" aria-label="Eventos">
        <nav className="inbox-views" aria-label="Subsecciones de Eventos">
          {EVENT_SECTIONS.map(([key, label]) => <button key={key} type="button" aria-pressed={eventSection === key} onClick={() => { setEventSection(key); resetFilters(); }}>{label}</button>)}
        </nav>
        <p className="assignment-note">Leads de {EVENT_SECTIONS.find(([key]) => key === eventSection)?.[2]}.</p>
      </section>}
      {view === "reservas" && <section className="inbox-subsections" aria-label="Reservas">
        <nav className="inbox-views" aria-label="Subsecciones de Reservas">
          {RESERVATION_SECTIONS.map(([key, label]) => <button key={key} type="button" aria-pressed={reservationSection === key} onClick={() => { setReservationSection(key); resetFilters(); }}>{label}</button>)}
        </nav>
        <p className="assignment-note">{reservationSection === "retargeting" ? "Reservas de reactivación y retargeting. Conservan la campaña original y cuentan como llamadas reservadas, sin añadir leads nuevos a las métricas de captación." : "Leads recibidos mediante el formulario «Reserva de consulta», pendientes de asignación."}</p>
      </section>}
      {view === "recomendador" && <p className="assignment-note">Leads procedentes del recomendador de carreras. Se muestran únicamente en esta pestaña.</p>}
      {view === "reservas" && bookingError && <p className="assignment-note" role="alert">No se pudieron cargar las fechas del calendario ({bookingError}). <button type="button" onClick={() => setBookingRetry((retry) => retry + 1)}>Reintentar</button></p>}
      {isFuture && futureError && <p className="assignment-note" role="alert">{futureError}. <button type="button" onClick={() => setFutureRetry((retry) => retry + 1)}>Reintentar</button></p>}
      <section className="panel inbox-panel" aria-busy={isFuture && futureLoading}>
        <div className="data-table">
          <table>
            <thead><tr><th>Lead</th><th>Entrada</th>{view === "reservas" && <th>Cita (hora de Madrid)</th>}<th>Origen</th><th>Campaña</th><th>Curso</th><th>País</th><th>Interés</th><th>{canAssign ? "Asignar a" : "Responsable"}</th>{isFuture ? <><th>Curso académico</th><th>Fecha de archivo</th></> : <><th>Días sin contactar</th><th>{canAssign ? "Marcar como Lost" : "Motivo Lost"}</th>{isLost && <th>{lostSection === "overdue" ? "Desde" : "Fecha Lost"}</th>}</>}</tr></thead>
            <tbody>
              {isFuture && (futureLoading || futureError) ? <tr><td colSpan={10} className="empty-copy">{futureLoading ? "Cargando leads de próximos cursos…" : "No se ha podido cargar esta sección."}</td></tr> : list.length === 0 && <tr><td colSpan={view === "reservas" || isLost && !isFuture ? 11 : 10} className="empty-copy">{query || activeFilters ? "No hay leads que coincidan con la búsqueda y los filtros." : isLost ? lostSection === "future" ? "No hay leads guardados para próximos cursos." : lostSection === "definitive" ? "No hay lost definitivos." : "No hay leads con más de 30 días en la bandeja." : view === "reservas" ? reservationSection === "retargeting" ? "No hay reservas de retargeting pendientes de asignación." : "No hay leads del formulario «Reserva de consulta» pendientes." : "No hay leads pendientes en esta sección."}</td></tr>}
              {!(isFuture && (futureLoading || futureError)) && list.map((contact) => (
                <tr key={contact.id} className={isFuture ? "archived-lead" : canAssign ? "unassigned-lead" : ""} onClick={isFuture ? undefined : () => setSelected(contact)}>
                  <td>{isFuture ? <><b>{contact.name}</b><small>{contact.email}</small><small>{contact.phone}</small></> : <button type="button" className="lead-name-button" onClick={() => setSelected(contact)}>{contact.formName === "colegios" && <small className="school-lead-label">Colegios</small>}<b className={contact.formName === "colegios" ? "school-lead-name" : ""}>{contact.name}</b><small>{contact.email}</small></button>}</td>
                  <td><time className="lead-entry-time" dateTime={view === "reservas" ? contact.retargetingReservationAt || contact.createdAt : contact.createdAt}>{formatLeadEntry(view === "reservas" ? contact.retargetingReservationAt || contact.createdAt : contact.createdAt)}</time></td>
                  {view === "reservas" && <td>{bookings === null ? "Cargando…" : bookingError ? "No disponible" : <BookingDate booking={bookingByEmail.get((contact.retargetingReservationEmail || contact.email).trim().toLowerCase())} />}</td>}
                  <td><span className="lead-source-readonly">{contact.source || "—"}</span></td>
                  <td><span className="lead-source-readonly">{inboxCampaignLabel(contact)}</span></td>
                  <td>{leadCourseGroup(contact.course)}</td>
                  <td>{contact.country || "Otros"}</td>
                  <td>{contact.interest || ""}</td>
                  <td>
                    {canAssign ? <select
                      className="owner-select"
                      aria-label={`Asignar a: ${contact.name}`}
                      value={leadOwners[contact.id] || ""}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        onAssignLead(contact.id, event.target.value);
                        notify(`${contact.name} asignado a ${event.target.value}`);
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {admins.map((admin) => <option key={admin}>{admin}</option>)}
                    </select> : (isFuture ? contact.owner : leadOwners[contact.id] ?? contact.owner) || "Sin asignar"}
                  </td>
                  {isFuture ? <><td>{futureById.get(contact.id)?.academicYear || "—"}</td><td>{formatLeadEntry(futureById.get(contact.id)?.archivedAt)}</td></> : <>
                    <td><span className="days-without-contact">{leadDaysWithoutContact(contact, Boolean(leadOwners[contact.id]), now) ?? "—"}</span></td>
                    <td>{canAssign ? <button type="button" className="inbox-lost-action" aria-label={`Marcar como Lost: ${contact.name}`} onClick={(event) => { event.stopPropagation(); openLost(contact); }}>LOST</button> : <>{lostReasonLabel(contact.lostReason)}{contact.lostReasonDetail && <small>{contact.lostReasonDetail}</small>}</>}</td>
                    {isLost && <td>{formatLeadEntry(lostSection === "overdue" && leadEntryTimestamp(contact.createdAt) > 0 ? new Date(leadEntryTimestamp(contact.createdAt) + 30 * 86400000).toISOString() : leadLostDates[contact.id] || contact.lostAt)}</td>}
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {canAssign && <p className="assignment-note"><UserCheck /> Al asignar un lead, aparecerá inmediatamente en el CRM personal del usuario seleccionado.</p>}
      {pendingLost && (
        <div className="drawer-wrap outcome-dialog-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingLost(null); }}>
          <form className="manual-lead-card crm-outcome-card" role="dialog" aria-modal="true" aria-labelledby="inbox-lost-title" onSubmit={confirmLost}>
            <button className="drawer-close" type="button" aria-label="Cerrar" onClick={() => setPendingLost(null)}>×</button>
            <span>Enviar a Lost</span>
            <h2 id="inbox-lost-title">{pendingLost.name}</h2>
            <p>Selecciona el motivo de la pérdida. El lead aparecerá en Lost leads → Lost definitivos.</p>
            <label>Motivo
              <select required autoFocus value={lostReason} onChange={(event) => { setLostReason(event.target.value as LostReason | ""); if (event.target.value !== "other") setLostReasonDetail(""); }}>
                <option value="">Seleccionar motivo…</option>
                {lostReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {lostReason === "other" && <label>Explicación breve
              <input required maxLength={120} value={lostReasonDetail} onChange={(event) => setLostReasonDetail(event.target.value)} placeholder="Escribe el motivo" />
            </label>}
            <div className="manual-lead-actions">
              <Button type="button" variant="outline" onClick={() => setPendingLost(null)}>Cancelar</Button>
              <Button type="submit" disabled={!lostReason || (lostReason === "other" && !lostReasonDetail.trim())}>Marcar como Lost</Button>
            </div>
          </form>
        </div>
      )}
      {addingLead && <div className="drawer-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddingLead(false); }}><form className="manual-lead-card" onSubmit={async (event) => { event.preventDefault(); setSavingLead(true); try { await onAddLead(manualLead); notify(`${manualLead.name} añadido correctamente`); setManualLead({ name: "", email: "", phone: "", notes: "", owner: "", source: "organic" }); setAddingLead(false); } catch (error) { notify(error instanceof Error ? error.message : "No se pudo crear el lead"); } finally { setSavingLead(false); } }}><button className="drawer-close" type="button" onClick={() => setAddingLead(false)}>×</button><span>Nuevo lead</span><h2>Añadir manualmente</h2><p>El lead quedará en Por contactar.</p><label>Nombre<input required value={manualLead.name} onChange={(event) => setManualLead((lead) => ({ ...lead, name: event.target.value }))} /></label><div className="manual-lead-row"><label>Email<input type="email" value={manualLead.email} onChange={(event) => setManualLead((lead) => ({ ...lead, email: event.target.value }))} /></label><label>Teléfono<input value={manualLead.phone} onChange={(event) => setManualLead((lead) => ({ ...lead, phone: event.target.value }))} /></label></div><label>Origen<select value={manualLead.source} onChange={(event) => setManualLead((lead) => ({ ...lead, source: event.target.value }))}><option value="organic">Orgánico</option><option value="organic_social">Orgánico RRSS</option><option value="referral">Referidos</option><option value="schools">Colegios</option><option value="google_ads">Google Ads</option><option value="tiktok_ads">TikTok Ads</option><option value="email">Email</option><option value="events">Eventos</option><option value="other">Otros</option></select></label><label>Asignar a<select value={manualLead.owner} onChange={(event) => setManualLead((lead) => ({ ...lead, owner: event.target.value }))}><option value="">Sin asignar</option>{admins.map((admin) => <option key={admin}>{admin}</option>)}</select></label><label>Notas<textarea value={manualLead.notes} onChange={(event) => setManualLead((lead) => ({ ...lead, notes: event.target.value }))} /></label><div className="manual-lead-actions"><Button type="button" variant="outline" onClick={() => setAddingLead(false)}>Cancelar</Button><Button type="submit" disabled={savingLead}>{savingLead ? "Guardando…" : "Crear lead"}</Button></div></form></div>}
      {addingGroup && <div className="lead-sheet-backdrop"><form className="lead-sheet" onSubmit={saveLeadGroup}>
        <header><div><span>Captura en grupo</span><h2>Añadir grupo de leads</h2><p>Rellena una fila por persona. Los campos corresponden a la ficha CRM de Supabase; las filas vacías se ignoran.</p></div><button type="button" className="drawer-close" aria-label="Cerrar" onClick={() => setAddingGroup(false)}>×</button></header>
        <label className="lead-sheet-group">Nombre del grupo<input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Ej. Visita Colegio San José · Madrid" /></label>
        <div className="lead-sheet-scroll"><table><thead><tr><th>Nombre *</th><th>Correo electrónico</th><th>Teléfono</th><th>Centro educativo</th><th>Área</th><th>Tipo</th><th>Ciclo de vida</th><th>Estado de tarea</th><th>Heat</th><th>Origen</th><th>Campaña</th><th>Notas / comentario</th><th>Responsable</th><th></th></tr></thead><tbody>
          {groupRows.map((row, index) => <tr key={index}>
            <td><input aria-label={`Nombre, fila ${index + 1}`} required={Object.entries(row).some(([key, value]) => key !== "heat" && key !== "taskStatus" && String(value).trim())} value={row.name} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} placeholder="Nombre del lead" /></td>
            <td><input aria-label="Correo electrónico" type="email" value={row.email} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, email: event.target.value } : item))} /></td>
            <td><input aria-label="Teléfono" value={row.phone} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, phone: event.target.value } : item))} /></td>
            <td><input aria-label="Centro educativo" value={row.schoolName} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, schoolName: event.target.value } : item))} /></td>
            <td><select aria-label="Área" value={row.area} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, area: event.target.value } : item))}><option value="">—</option>{["Concreto", "Psycology", "Engineering", "Health", "International studies", "Business", "chemistry"].map((option) => <option key={option}>{option}</option>)}</select></td>
            <td><select aria-label="Tipo de lead" value={row.leadType} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, leadType: event.target.value } : item))}><option value="">—</option>{["General", "Delft", "Llegada", "Mentoría", "LATAM", "ESPECIAL"].map((option) => <option key={option}>{option}</option>)}</select></td>
            <td><select aria-label="Ciclo de vida" value={row.lifecycle} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, lifecycle: event.target.value } : item))}><option value="">—</option>{["LOST 25-26", "LOST", "26-27", "INSIDE", "28-29", "27-28", "año que viene", "25-26"].map((option) => <option key={option}>{option}</option>)}</select></td>
            <td><select aria-label="Estado de tarea" value={row.taskStatus} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, taskStatus: event.target.value } : item))}><option value="">—</option>{["Sin empezar", "En progreso", "Listo"].map((option) => <option key={option}>{option}</option>)}</select></td>
            <td><input aria-label="Heat" type="number" min="0" max="100" value={row.heat} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, heat: event.target.value } : item))} /></td>
            <td><select aria-label="Origen" value={row.source} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, source: event.target.value } : item))}><option value="">Auto</option><option value="schools">Colegios</option><option value="organic">Orgánico</option><option value="organic_social">Orgánico RRSS</option><option value="referral">Referidos</option><option value="website">Página web</option><option value="meta">Meta Ads</option><option value="google_ads">Google Ads</option><option value="tiktok_ads">TikTok Ads</option><option value="email">Email</option><option value="events">Eventos</option><option value="other">Otros</option></select></td>
            <td><input aria-label="Campaña" value={row.campaign} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, campaign: event.target.value } : item))} /></td>
            <td><textarea aria-label="Notas o comentario" value={row.notes} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} /></td>
            <td><select aria-label="Responsable" value={row.owner} onChange={(event) => setGroupRows((rows) => rows.map((item, i) => i === index ? { ...item, owner: event.target.value } : item))}><option value="">Sin asignar</option>{admins.map((admin) => <option key={admin}>{admin}</option>)}</select></td>
            <td><button className="lead-sheet-remove" type="button" aria-label={`Quitar fila ${index + 1}`} onClick={() => setGroupRows((rows) => rows.length > 1 ? rows.filter((_, i) => i !== index) : [emptyLeadGroupRow()])}><X /></button></td>
          </tr>)}
        </tbody></table></div>
        <footer><Button type="button" variant="outline" onClick={() => setGroupRows((rows) => [...rows, emptyLeadGroupRow()])}><Plus />Añadir fila</Button><span>{groupRows.filter((row) => row.name.trim()).length} leads listos</span><div><Button type="button" variant="outline" onClick={() => setAddingGroup(false)}>Cancelar</Button><Button type="submit" disabled={savingGroup}>{savingGroup ? "Guardando…" : "Guardar grupo"}</Button></div></footer>
      </form></div>}
      {selected && <ContactDrawer contact={{ ...selected, owner: leadOwners[selected.id] || "Sin asignar", stage: leadStages[selected.id] }} admins={admins} heat={selected.heat || 50} onHeatChange={(value) => onSetLeadHeat(selected.id, value)} onOwnerChange={(owner) => { onAssignLead(selected.id, owner); notify(`${selected.name} asignado a ${owner}`); }} onContactRoleChange={(value) => onSetLeadContactRole(selected.id, value)} onCourseChange={async (course) => { const id = selected.id; await onSetLeadCourse(id, course); setSelected((contact) => contact?.id === id ? { ...contact, course } : contact); }} onDeleteLead={async (id) => { await onDeleteLead(id); notify(`${selected.name} eliminado correctamente`); }} onClose={() => setSelected(null)} leadMode />}
    </div>
  );
}

const bookingDateFormatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });
const bookingTimeFormatter = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });

function BookingDate({ booking }: { booking?: WebBooking }) {
  if (!booking) return <>Sin cita vinculada</>;
  const date = new Date(booking.start);
  return <time className="lead-entry-time" dateTime={booking.start}>{bookingDateFormatter.format(date)} · {bookingTimeFormatter.format(date)}</time>;
}

const INBOX_VIEWS: Array<[InboxView, string]> = [["all", "General"], ["España", "España"], ["Portugal", "Portugal"], ["recomendador", "Recomendador"], ["eventos", "Eventos"], ["reservas", "Reservas"], ["lost", "Lost leads"]];
const LOST_SECTIONS: Array<[LostLeadSection, string]> = [["future", "Año que viene"], ["definitive", "Lost definitivos"], ["overdue", ">30 days leads"]];
const EVENT_SECTIONS: Array<[EventLeadSection, string, string]> = [["lisboa", "U Lisboa", "Unitour Lisboa"], ["canarias", "U Canarias", "Unitour Canarias"], ["valencia", "U Valencia", "Unitour Valencia"], ["webinar-21-11", "Webinar 21-11", "Webinar 21-11"]];
const RESERVATION_SECTIONS: Array<[ReservationLeadSection, string]> = [["general", "General"], ["retargeting", "Retargeting"]];
