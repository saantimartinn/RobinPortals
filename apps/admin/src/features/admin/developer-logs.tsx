import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Search } from "lucide-react";
import { listDeveloperLogs, listPlatformLogs } from "@/services/developer-logs";
import type { DeveloperLog, DeveloperLogFilters, PlatformLog, PlatformLogResponse } from "@/services/developer-logs";

const initialFilters: DeveloperLogFilters = { portal: "all", source: "", result: "", search: "" };
const portalNames: Record<string, string> = { admin_crm: "Admin CRM", portal: "Admin y Alumno", robinjr: "Robin Jr", community: "Community" };

function resultKind(result: string) {
  if (/error|fail|rejected|invalid/i.test(result)) return "error";
  if (/success|ok|processed|sent|completed|passed/i.test(result)) return "success";
  return "neutral";
}

function RobinLogs() {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [entries, setEntries] = useState<DeveloperLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const requestRef = useRef(0);

  const load = useCallback(async (cursor?: string | null) => {
    const request = ++requestRef.current;
    setLoading(true); setError("");
    try {
      const page = await listDeveloperLogs(filters, cursor);
      if (request !== requestRef.current) return;
      if (page.errors.length) throw new Error(`No se pudieron consultar: ${page.errors.map((item) => portalNames[item.portal] || item.portal).join(", ")}`);
      setEntries((current) => cursor ? [...current, ...page.entries] : page.entries);
      setNextCursor(page.next_cursor);
      setAsOf(page.as_of);
      if (!cursor) setExpanded(null);
    } catch (cause) { if (request === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los registros"); }
    finally { if (request === requestRef.current) setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); return () => { requestRef.current += 1; }; }, [load, refresh]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draft });
    if (JSON.stringify(draft) === JSON.stringify(filters)) setRefresh((value) => value + 1);
  }

  return <div className="developer-logs">
    <form className="panel developer-logs-filters" onSubmit={applyFilters}>
      <label>Portal<select value={draft.portal} onChange={(event) => setDraft({ ...draft, portal: event.target.value })}>
        <option value="all">Todos</option><option value="portal">Admin y Alumno</option><option value="robinjr">Robin Jr</option><option value="community">Community</option>
      </select></label>
      <label>Origen<input value={draft.source} maxLength={80} placeholder="Ej. revolut, holded" onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label>
      <label>Resultado<input value={draft.result} maxLength={80} placeholder="Ej. error, ok" onChange={(event) => setDraft({ ...draft, result: event.target.value })} /></label>
      <label>Buscar<input value={draft.search} maxLength={100} placeholder="Origen o mensaje" onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></label>
      <button className="ui-button" type="submit" disabled={loading}><Search aria-hidden="true" /> Aplicar filtros</button>
      <button className="ui-button outline" type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><RefreshCw aria-hidden="true" /> Actualizar</button>
    </form>

    {error && <div className="release-tests-error" role="alert"><AlertCircle aria-hidden="true" />{error}</div>}
    <section className="panel developer-logs-list" aria-label="Registros">
      <header><div><h2>Actividad reciente</h2><p>{loading && entries.length === 0 ? "Cargando…" : `${entries.length} registros mostrados`}{asOf ? ` · consulta de ${new Date(asOf).toLocaleString("es-ES")}` : ""}</p></div></header>
      {entries.length === 0 && !loading && !error && <div className="developer-logs-empty">No hay registros para estos filtros.</div>}
      <div className="developer-logs-rows">{entries.map((entry) => {
        const key = `${entry.portal}:${entry.id}`;
        const open = expanded === key;
        return <article className="developer-log-row" key={key}>
          <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : key)}>
            <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("es-ES")}</time>
            <span className="developer-log-portal">{portalNames[entry.portal]}</span>
            <span className="developer-log-source">{entry.source || "Sin origen"}</span>
            <span className={`developer-log-result ${resultKind(entry.result)}`}>{entry.result || "Sin resultado"}</span>
            <span className="developer-log-message">{entry.message || "Sin mensaje"}</span>
            {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
          {open && <div className="developer-log-detail"><dl><div><dt>Portal</dt><dd>{portalNames[entry.portal]}</dd></div><div><dt>Origen</dt><dd>{entry.source || "—"}</dd></div><div><dt>Resultado</dt><dd>{entry.result || "—"}</dd></div><div><dt>Fecha</dt><dd>{new Date(entry.created_at).toLocaleString("es-ES")}</dd></div><div><dt>ID del registro</dt><dd><code>{entry.id}</code></dd></div><div><dt>Mensaje</dt><dd>{entry.message || "—"}</dd></div></dl></div>}
        </article>;
      })}</div>
      <footer>{nextCursor && <button type="button" className="ui-button outline" disabled={loading} onClick={() => void load(nextCursor)}>{loading ? "Cargando…" : "Cargar más"}</button>}</footer>
    </section>
  </div>;
}

const supabaseSources = [
  ["all", "Todos los servicios"], ["edge_logs", "API Gateway"], ["postgres_logs", "Postgres"],
  ["postgrest_logs", "PostgREST"], ["auth_logs", "Auth"], ["auth_audit_logs", "Auditoría Auth"],
  ["storage_logs", "Storage"], ["realtime_logs", "Realtime"], ["function_edge_logs", "Funciones · peticiones"],
  ["function_logs", "Funciones · consola"], ["supavisor_logs", "Pool de conexiones"],
  ["pgbouncer_logs", "PgBouncer"], ["pg_upgrade_logs", "Actualización Postgres"],
] as const;

function PlatformLogs({ provider }: { provider: "netlify" | "supabase" }) {
  const defaultWindow = provider === "supabase" ? "1h" : "24h";
  const [windowValue, setWindowValue] = useState(defaultWindow);
  const [source, setSource] = useState("all");
  const [project, setProject] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ window: defaultWindow, source: "all", project: "all", search: "" });
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<PlatformLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    listPlatformLogs({ provider, ...query }).then((data) => { if (active) setResult(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los registros"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provider, query, reload]);

  useEffect(() => {
    if (result?.status !== "loading") return;
    const timer = window.setTimeout(() => setReload((current) => current + 1), 4000);
    return () => window.clearTimeout(timer);
  }, [result]);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { window: windowValue, source, project, search };
    if (JSON.stringify(next) === JSON.stringify(query)) setReload((current) => current + 1);
    else setQuery(next);
  }

  const entries = result?.entries || [];
  return <div className="developer-logs">
    <form className="panel developer-logs-filters" onSubmit={apply}>
      <label>Periodo<select value={windowValue} onChange={(event) => setWindowValue(event.target.value)}><option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option></select></label>
      {provider === "supabase" && <label>Proyecto<select value={project} onChange={(event) => setProject(event.target.value)}><option value="all">Todos</option><option value="admin_crm">Admin CRM</option><option value="portal">Admin y Alumno</option><option value="robinjr">Robin Jr</option><option value="community">Community</option></select></label>}
      <label>Tipo<select value={source} onChange={(event) => setSource(event.target.value)}>{provider === "netlify" ? <><option value="all">Todos</option><option value="functions">Funciones</option><option value="edge-functions">Edge Functions</option><option value="deploy">Despliegues</option></> : supabaseSources.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
      <label>Buscar<input value={search} maxLength={100} placeholder="Nombre o mensaje" onChange={(event) => setSearch(event.target.value)} /></label>
      <button className="ui-button" type="submit" disabled={loading}><Search aria-hidden="true" /> Aplicar filtros</button>
      <button className="ui-button outline" type="button" disabled={loading} onClick={() => setReload((current) => current + 1)}><RefreshCw aria-hidden="true" /> Actualizar</button>
    </form>
    {error && <div className="release-tests-error" role="alert"><AlertCircle aria-hidden="true" />{error}</div>}
    {result?.status === "loading" && <div className="panel developer-logs-notice" role="status">Consultando los registros de Netlify…</div>}
    {result?.status === "needs_token" && <div className="panel developer-logs-notice"><strong>{provider === "netlify" ? "Falta acceso a Netlify Logs." : "Falta acceso de lectura a Supabase Logs."}</strong>{provider === "netlify" ? <p>Inicia sesión con <code>netlify login</code> en local o configura <code>NETLIFY_AUTH_TOKEN</code> como variable privada de Functions en producción.</p> : <><p>Configura <code>SUPABASE_MANAGEMENT_ACCESS_TOKEN</code> en el entorno privado del servidor con el permiso <code>analytics_logs_read</code>. Las claves service role de los portales no sirven para la API de gestión.</p><div className="developer-logs-provider-links">{Object.entries(result.projects || {}).filter(([, ref]) => !!ref).map(([name, ref]) => <a key={name} href={`https://supabase.com/dashboard/project/${ref}/logs/explorer`} target="_blank" rel="noopener noreferrer">Abrir logs de {portalNames[name]}</a>)}</div></>}</div>}
    {result?.status === "unavailable" && <div className="panel developer-logs-notice"><strong>No se pudieron recuperar estos registros.</strong><p>{provider === "netlify" ? result.reason === "netlify_site_missing" ? "No se encontró el sitio de Netlify. Vincula este proyecto o configura NETLIFY_LOGS_SITE_ID." : "Revisa el token privado de Netlify y el acceso al sitio vinculado." : "Revisa el token de gestión de Supabase, el acceso a los proyectos y los límites del plan."}</p></div>}
    {!!result?.errors?.length && <div className="release-tests-error" role="alert"><AlertCircle aria-hidden="true" />{result.errors.map((item) => `${portalNames[item.portal] || item.portal}: ${item.code}`).join(" · ")}</div>}
    <section className="panel developer-logs-list" aria-label={`Registros de ${provider}`}>
      <header><div><h2>Actividad reciente</h2><p>{loading ? "Cargando…" : `${entries.length} registros mostrados`}</p></div></header>
      {!loading && result?.status === "ok" && entries.length === 0 && <div className="developer-logs-empty">No se encontraron registros en este periodo y con estos filtros.</div>}
      <div className="developer-logs-rows">{entries.map((entry: PlatformLog, index) => {
        const key = `${entry.portal}:${entry.id}:${index}`;
        const open = expanded === key;
        return <article className="developer-log-row" key={key}>
          <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : key)}>
            <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("es-ES")}</time>
            <span className="developer-log-portal">{provider === "netlify" ? entry.source : portalNames[entry.portal]}</span>
            <span className="developer-log-source">{entry.name || entry.source}</span>
            <span className={`developer-log-result ${resultKind(entry.result)}`}>{entry.result || "—"}</span>
            <span className="developer-log-message">{entry.message || "Sin mensaje"}</span>
            {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
          {open && <div className="developer-log-detail"><dl><div><dt>Origen</dt><dd>{entry.source}</dd></div><div><dt>Nombre o proyecto</dt><dd>{entry.name}</dd></div><div><dt>Nivel</dt><dd>{entry.result}</dd></div><div><dt>Fecha</dt><dd>{new Date(entry.created_at).toLocaleString("es-ES")}</dd></div><div><dt>ID</dt><dd><code>{entry.id}</code></dd></div><div><dt>Mensaje</dt><dd>{entry.message || "—"}</dd></div></dl></div>}
        </article>;
      })}</div>
    </section>
  </div>;
}

export function DeveloperLogs() {
  const [tab, setTab] = useState<"robin" | "netlify" | "supabase">("robin");
  return <div className="developer-logs-workspace">
    <div className="developer-logs-tabs" role="tablist" aria-label="Origen de registros">
      {([ ["robin", "Eventos Robin"], ["netlify", "Netlify"], ["supabase", "Supabase"] ] as const).map(([id, name]) => <button type="button" role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>{name}</button>)}
    </div>
    {tab === "robin" ? <RobinLogs /> : <PlatformLogs key={tab} provider={tab} />}
  </div>;
}
