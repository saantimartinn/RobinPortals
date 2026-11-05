const SOURCES = ['portal', 'robinjr', 'community'];
const PAGE_SIZE = 40;

function readFilters(params = {}) {
  const portal = SOURCES.includes(params.portal) ? params.portal : 'all';
  const source = String(params.source || '').trim().slice(0, 80);
  const result = String(params.result || '').trim().slice(0, 80);
  const search = String(params.search || '').trim().slice(0, 100);
  return { portal, source, result, search };
}

function decodeCursor(value, filters) {
  if (!value) return { asOf: new Date().toISOString(), offsets: { portal: 0, robinjr: 0, community: 0 } };
  try {
    const cursor = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (JSON.stringify(cursor.filters) !== JSON.stringify(filters)) throw new Error('filters_changed');
    if (!Number.isFinite(Date.parse(cursor.asOf)) || Date.parse(cursor.asOf) > Date.now() + 60000) throw new Error('invalid_date');
    if (!SOURCES.every((key) => Number.isSafeInteger(cursor.offsets?.[key]) && cursor.offsets[key] >= 0 && cursor.offsets[key] <= 100000)) throw new Error('invalid_offsets');
    return { asOf: cursor.asOf, offsets: cursor.offsets };
  } catch { throw new Error('invalid_cursor'); }
}

function cleanMessage(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 2000)
    .replace(/https?:\/\/[^\s,;]+/gi, '[enlace oculto]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo oculto]')
    .replace(/"(authorization|api_key|token|secret|password)"\s*:\s*"[^"]*"/gi, '"$1":"[oculto]"')
    .replace(/\b(authorization|bearer|api[_ -]?key|token|secret|password|contrase(?:ñ|n)a)\s*[:= ]\s*[^\s,;]+/gi, '$1: [oculto]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[valor oculto]')
    .slice(0, 600);
}

function safeRow(row, portal) {
  return {
    id: String(row.id), portal,
    source: String(row.source || '').slice(0, 80),
    result: String(row.result || '').slice(0, 80),
    message: cleanMessage(row.message),
    created_at: row.created_at,
  };
}

function safeSearch(value) {
  return value.replace(/[%_(),.*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function querySource(client, portal, filters, cursor) {
  let query = client.from('webhook_log')
    .select('id,source,result,message,created_at')
    .lte('created_at', cursor.asOf)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (filters.source) query = query.ilike('source', `%${safeSearch(filters.source)}%`);
  if (filters.result) query = query.ilike('result', `%${safeSearch(filters.result)}%`);
  if (filters.search) {
    const term = safeSearch(filters.search);
    if (term) query = query.or(`source.ilike.%${term}%,message.ilike.%${term}%`);
  }
  const offset = cursor.offsets[portal];
  const { data, error } = await query.range(offset, offset + PAGE_SIZE);
  if (error) throw new Error(`${portal}: ${error.code || 'query_failed'}`);
  return (data || []).map((row) => safeRow(row, portal));
}

async function listDeveloperLogs(clients, params = {}) {
  const filters = readFilters(params);
  const cursor = decodeCursor(params.cursor, filters);
  const portals = filters.portal === 'all' ? SOURCES : [filters.portal];
  const settled = await Promise.allSettled(portals.map((portal) => querySource(clients[portal], portal, filters, cursor)));
  const errors = settled.flatMap((item, index) => item.status === 'rejected' ? [{ portal: portals[index], code: item.reason?.message || 'query_failed' }] : []);
  if (errors.length) return { entries: [], next_cursor: null, errors, as_of: cursor.asOf };
  const all = settled.flatMap((item) => item.value).sort((a, b) =>
    b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const entries = all.slice(0, PAGE_SIZE);
  const offsets = { ...cursor.offsets };
  for (const entry of entries) offsets[entry.portal] += 1;
  const next_cursor = all.length > PAGE_SIZE
    ? Buffer.from(JSON.stringify({ asOf: cursor.asOf, offsets, filters })).toString('base64url')
    : null;
  return { entries, next_cursor, errors: [], as_of: cursor.asOf };
}

module.exports = { listDeveloperLogs, readFilters, safeRow };
