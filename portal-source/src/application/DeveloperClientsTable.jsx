import React, { useCallback, useEffect, useState } from "react";
import { adminDeveloperClients, adminDeveloperClientUpdate } from "../api.js";
import "./developer-clients-table.css";

function display(value) {
  if (value === null || value === undefined) return "NULL";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function parseValue(text, original) {
  if (text === "NULL") return null;
  if (typeof original === "boolean") {
    if (text !== "true" && text !== "false") throw new Error("Escribe true o false.");
    return text === "true";
  }
  if (typeof original === "number") {
    const value = Number(text);
    if (!Number.isFinite(value)) throw new Error("Introduce un número válido.");
    return value;
  }
  return original && typeof original === "object" ? JSON.parse(text) : text;
}

export function DeveloperClientsTable() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const result = await adminDeveloperClients(page);
      setRows(result.rows); setTotal(result.total); setPageSize(result.pageSize);
    } catch (cause) { setError(cause.message || "No se pudieron cargar los clientes"); }
    finally { setBusy(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  async function save() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const result = await adminDeveloperClientUpdate(editing.id, editing.column, parseValue(editing.text, editing.original));
      setRows((current) => current.map((row) => row.id === editing.id ? result.row : row));
      setEditing(null);
    } catch (cause) { setError(cause.message || "No se pudo guardar el campo"); }
    finally { setBusy(false); }
  }
  return <section className="robin-developer-table">
    <header><div><h2>Tabla completa · users</h2><p>{total} clientes · {columns.length} columnas · pulsa una celda para editarla</p></div><button type="button" onClick={() => void load()} disabled={busy}>Actualizar</button></header>
    {error && <p className="robin-developer-error" role="alert">{error}</p>}
    <div className="robin-developer-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{column === "id" ? <span title={display(row[column])}>{display(row[column])}</span> : <button type="button" title={`${column}: ${display(row[column])}`} onClick={() => setEditing({ id: row.id, column, original: row[column], text: display(row[column]) })}>{display(row[column])}</button>}</td>)}</tr>)}</tbody></table></div>
    {!busy && rows.length === 0 && <p className="robin-developer-empty">No hay clientes en esta página.</p>}
    <footer><button type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" disabled={busy || page * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Siguiente</button></footer>
    {editing && <div className="robin-developer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="robin-cell-title"><h2 id="robin-cell-title">Editar {editing.column}</h2><p>Cliente {editing.id}</p><textarea aria-label={`Valor de ${editing.column}`} value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} rows={6} autoFocus spellCheck={false} /><small>Escribe NULL para guardar un valor nulo. Objetos y listas se editan como JSON.</small><div><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar"}</button></div></section></div>}
  </section>;
}
