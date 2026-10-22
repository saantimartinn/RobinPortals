// Admin feature UI for robin plan developer database; the application shell selects this view.
import React, { useCallback, useEffect, useState } from "react";
import { subAdminDatabase, subAdminDatabaseExecuteSql, subAdminDatabaseUpdate } from "../../api/index.js";
import "./robin-plan-developer-database.css";

const TABLE_LABELS = {
  subscribers: "Suscriptores y admins", partners: "Partners", community_events: "Eventos y contenido",
  event_rsvps: "Inscripciones a eventos", service_requests: "Solicitudes", notifications: "Notificaciones",
  notification_recipients: "Destinatarios de notificaciones", discount_codes: "Códigos de descuento",
  friendships: "Amistades", direct_messages: "Mensajes directos", challenges: "Retos",
  challenge_submissions: "Entregas de retos", subscription_faqs: "FAQs",
  subscription_invoices: "Facturas de suscripción", webhook_log: "Registro de webhooks",
};

function format(value) {
  if (value === null || value === undefined) return "NULL";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function parse(text, oldValue) {
  if (text === "NULL") return null;
  if (text.startsWith("JSON:")) return JSON.parse(text.slice(5));
  if (typeof oldValue === "boolean") {
    if (text !== "true" && text !== "false") throw new Error("Escribe true o false.");
    return text === "true";
  }
  if (typeof oldValue === "number") {
    const result = Number(text);
    if (!Number.isFinite(result)) throw new Error("Introduce un número válido.");
    return result;
  }
  if (oldValue && typeof oldValue === "object") return JSON.parse(text);
  return text;
}

export function RobinPlanDeveloperDatabase() {
  const [tables, setTables] = useState(Object.keys(TABLE_LABELS));
  const [table, setTable] = useState("subscribers");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("tables");
  const [statement, setStatement] = useState("SELECT * FROM public.subscribers ORDER BY created_at DESC LIMIT 20;");
  const [sqlResult, setSqlResult] = useState(null);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const result = await subAdminDatabase(table, page);
      setRows(result.rows || []); setTotal(result.total || 0); setPageSize(result.pageSize || 50);
      if (result.tables?.length) setTables(result.tables);
    } catch (cause) { setError(cause.message || "No se pudieron leer los datos"); }
    finally { setBusy(false); }
  }, [table, page]);
  useEffect(() => { void load(); }, [load]);
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  async function save() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const result = await subAdminDatabaseUpdate(table, editing.id, editing.column, parse(editing.text, editing.original));
      setRows(current => current.map(row => row.id === editing.id ? result.row : row));
      setEditing(null);
    } catch (cause) { setError(cause.message || "No se pudo guardar el cambio"); }
    finally { setBusy(false); }
  }
  async function runSql(event) {
    event.preventDefault();
    if (!statement.trim()) return;
    setBusy(true); setError(""); setSqlResult(null);
    try {
      const result = await subAdminDatabaseExecuteSql(statement);
      setSqlResult(result.result);
    } catch (cause) { setError(cause.message || "No se pudo ejecutar la consulta"); }
    finally { setBusy(false); }
  }
  return <section className="robin-plan-dev-db">
    <header><div><h2>{view === "sql" ? "Consola SQL · The Robin Plan" : `Base de datos · ${table}`}</h2><p>{view === "sql" ? "Ejecuta consultas sobre la base de datos de suscripciones." : `${total} registros · ${columns.length || "—"} columnas · pulsa una celda para editar`}</p></div>{view === "tables" && <button type="button" disabled={busy} onClick={() => void load()}>Actualizar</button>}</header>
    <div className="robin-plan-dev-db-tabs" role="tablist" aria-label="Herramientas de base de datos">
      <button type="button" role="tab" aria-selected={view === "tables"} onClick={() => setView("tables")}>Tablas</button>
      <button type="button" role="tab" aria-selected={view === "sql"} onClick={() => setView("sql")}>Consola SQL</button>
    </div>
    {error && <p className="robin-plan-dev-db-error" role="alert">{error}</p>}
    {view === "sql" && <form className="robin-plan-dev-db-sql" onSubmit={runSql}>
      <label htmlFor="robin-plan-sql">SQL · base de datos de The Robin Plan</label>
      <textarea id="robin-plan-sql" rows={10} spellCheck={false} value={statement} onChange={event => setStatement(event.target.value)} />
      <div><span>Una instrucción por ejecución.</span><button type="submit" disabled={busy || !statement.trim()}>{busy ? "Ejecutando…" : "Ejecutar SQL"}</button></div>
      {sqlResult !== null && <pre className="robin-plan-dev-db-result" aria-live="polite">{JSON.stringify(sqlResult, null, 2)}</pre>}
    </form>}
    {view === "tables" && <>
    <label className="robin-plan-dev-db-select">Tabla<select value={table} onChange={event => { setPage(1); setTable(event.target.value); }}>
      {tables.map(name => <option key={name} value={name}>{TABLE_LABELS[name] || name} · {name}</option>)}
    </select></label>
    <div className="robin-plan-dev-db-scroll"><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={String(row.id)}>{columns.map(column => <td key={column}>{column === "id" ? <span title={format(row[column])}>{format(row[column])}</span> : <button type="button" title={`${column}: ${format(row[column])}`} onClick={() => setEditing({ id: row.id, column, original: row[column], text: format(row[column]) })}>{format(row[column])}</button>}</td>)}</tr>)}</tbody></table></div>
    {!busy && !rows.length && <p className="robin-plan-dev-db-empty">La tabla está vacía.</p>}
    <footer><button type="button" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" disabled={busy || page * pageSize >= total} onClick={() => setPage(value => value + 1)}>Siguiente</button></footer>
    </>}
    {editing && <div className="robin-plan-dev-db-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="robin-plan-cell-title"><h2 id="robin-plan-cell-title">Editar {editing.column}</h2><p>{table} · {editing.id}</p><textarea rows={7} autoFocus spellCheck={false} value={editing.text} onChange={event => setEditing({ ...editing, text: event.target.value })} /><small>Usa NULL para guardar nulo y JSON: para establecer manualmente un número, booleano, objeto o lista.</small><div><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</button></div></section></div>}
  </section>;
}
