const { safeRow } = require('./developer-logs');
const { netlifyLogs } = require('./netlify-logs');

const SUPABASE_SOURCES = new Set(['all', 'edge_logs', 'postgres_logs', 'postgrest_logs', 'auth_logs', 'auth_audit_logs', 'storage_logs', 'realtime_logs', 'function_edge_logs', 'function_logs', 'supavisor_logs', 'pgbouncer_logs', 'pg_upgrade_logs']);
const WINDOWS = new Set(['1h', '24h']);

function windowOption(value) { return WINDOWS.has(value) ? value : '24h'; }
function cleanMessage(value) {
  return safeRow({ id: 'temporary', source: '', result: '', message: String(value || ''), created_at: '' }, 'portal').message;
}

function projectRef(url) {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9]{8,})\.supabase\.co$/);
    return match?.[1] || null;
  } catch { return null; }
}

async function supabaseLogs({ window = '24h', source = 'all', project = 'all', search = '' } = {}) {
  if (!SUPABASE_SOURCES.has(source)) throw new Error('invalid_source');
  if (!['all', 'portal', 'robinjr', 'community', 'admin_crm'].includes(project)) throw new Error('invalid_project');
  const projects = {
    admin_crm: projectRef(process.env.ADMIN_SUPABASE_URL),
    portal: projectRef(process.env.SUPABASE_URL),
    robinjr: projectRef(process.env.ROBIN_JR_SUPABASE_URL),
    community: projectRef(process.env.ROBIN_PLAN_SUPABASE_URL),
  };
  const token = process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return { status: 'needs_token', reason: 'supabase_management_token_missing', entries: [], projects };
  const selected = project === 'all' ? Object.entries(projects) : [[project, projects[project]]];
  if (selected.some(([, ref]) => !ref)) return { status: 'unavailable', reason: 'supabase_project_missing', entries: [], projects };
  const end = new Date();
  const start = new Date(end.getTime() - (windowOption(window) === '1h' ? 3600000 : 86400000 - 60000));
  const sourceClause = source === 'all' ? '' : ` where source = '${source}'`;
  const sql = `select timestamp, id, source, severity_text, event_message from logs${sourceClause} order by timestamp desc limit 100`;
  const queried = await Promise.all(selected.map(async ([label, ref]) => {
    const endpoint = new URL(`https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs`);
    endpoint.searchParams.set('sql', sql);
    endpoint.searchParams.set('iso_timestamp_start', start.toISOString());
    endpoint.searchParams.set('iso_timestamp_end', end.toISOString());
    try {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) return { label, error: `http_${response.status}` };
      const body = await response.json();
      if (body.error) return { label, error: 'query_failed' };
      return { label, entries: (body.result || []).map((row) => ({
        id: String(row.id || ''), portal: label, source: String(row.source || '').slice(0, 80),
        name: label, result: String(row.severity_text || '').slice(0, 80),
        message: cleanMessage(row.event_message), created_at: row.timestamp,
      })) };
    } catch { return { label, error: 'request_failed' }; }
  }));
  const errors = queried.filter((item) => item.error).map((item) => ({ portal: item.label, code: item.error }));
  const term = String(search).trim().toLowerCase().slice(0, 100);
  const entries = queried.flatMap((item) => item.entries || [])
    .filter((item) => !term || `${item.source} ${item.message}`.toLowerCase().includes(term))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100 * selected.length);
  return { status: errors.length === selected.length ? 'unavailable' : 'ok', entries, errors, window: windowOption(window), projects };
}

module.exports = { netlifyLogs, supabaseLogs, projectRef, SUPABASE_SOURCES };
