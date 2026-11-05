const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join, resolve } = require('node:path');
const { safeRow } = require('./developer-logs');

const SOURCES = new Set(['functions', 'edge-functions', 'deploy']);
const WINDOWS = new Set(['1h', '24h']);
const cache = new Map();

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function credentials() {
  const siteId = process.env.NETLIFY_LOGS_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID
    || (process.env.ROBIN_LOCAL_TESTS === 'true' ? readJson(resolve(__dirname, '../../..', '.netlify/state.json'))?.siteId : null);
  let token = process.env.NETLIFY_AUTH_TOKEN || null;
  if (!token && process.env.ROBIN_LOCAL_TESTS === 'true') {
    const config = readJson(join(homedir(), 'Library/Preferences/netlify/config.json'));
    token = config?.users?.[config.userId]?.auth?.token || Object.values(config?.users || {})[0]?.auth?.token || null;
  }
  return { siteId, token };
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  return response.json();
}

function message(value) {
  return safeRow({ id: 'netlify', source: '', result: '', message: String(value || ''), created_at: '' }, 'portal').message;
}

function entry(source, name, level, value, timestamp, id) {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return null;
  const createdAt = new Date(time).toISOString();
  return {
    id: String(id || `${source}:${name}:${createdAt}`), portal: 'netlify', source, name: String(name || '').slice(0, 100),
    result: String(level || 'info').slice(0, 80), message: message(value), created_at: createdAt,
  };
}

async function pagedLogs(baseUrl, token, from, to) {
  const logs = [];
  let cursor;
  for (let page = 0; page < 3; page += 1) {
    const url = new URL(baseUrl);
    url.searchParams.set('from', String(from));
    url.searchParams.set('to', String(to));
    if (cursor) url.searchParams.set('cursor', cursor);
    const body = await requestJson(url, token);
    logs.push(...(body.logs || []));
    cursor = body.pagination?.next;
    if (!cursor) break;
  }
  return logs;
}

async function functionLogs(siteId, token, from, to) {
  const listing = await requestJson(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/functions`, token);
  const functions = listing.functions || [];
  let next = 0;
  let failures = 0;
  const entries = [];
  async function worker() {
    while (next < functions.length) {
      const fn = functions[next++];
      if (!fn?.n) continue;
      const branch = fn.branch ? `branch/${encodeURIComponent(fn.branch)}/` : '';
      const url = `https://analytics.services.netlify.com/v2/sites/${encodeURIComponent(siteId)}/${branch}function_logs/${encodeURIComponent(fn.n)}`;
      try {
        const rows = await pagedLogs(url, token, from, to);
        entries.push(...rows.map((row, index) => entry('functions', fn.n, row.level, row.message, row.ts, `${fn.n}:${row.ts}:${index}`)).filter(Boolean));
      } catch { failures += 1; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(10, functions.length) }, () => worker()));
  return { entries, failures, total: functions.length };
}

async function edgeLogs(siteId, token, from, to) {
  const url = `https://analytics.services.netlify.com/v2/sites/${encodeURIComponent(siteId)}/edge_function_logs`;
  const rows = await pagedLogs(url, token, from, to);
  return rows.map((row, index) => entry('edge-functions', row.function_name || row.name || 'Edge Function', row.level, row.message, row.ts, `edge:${row.ts}:${index}`)).filter(Boolean);
}

async function deployLogs(siteId, token, from) {
  const base = `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`;
  let rows;
  try { rows = await requestJson(`${base}?per_page=10`, token); }
  catch { rows = await requestJson(`${base}?per_page=2`, token); }
  return rows.filter((row) => Date.parse(row.created_at) >= from).map((row) => entry(
    'deploy', row.branch || row.context || 'production', row.state, row.commit_message || row.title || `Despliegue ${row.state}`,
    row.published_at || row.updated_at || row.created_at, row.id,
  )).filter(Boolean);
}

async function netlifyLogs({ window = '24h', source = 'all', search = '' } = {}) {
  if (source !== 'all' && !SOURCES.has(source)) throw new Error('invalid_source');
  const since = WINDOWS.has(window) ? window : '24h';
  const term = String(search).trim().toLowerCase().slice(0, 100);
  const { siteId, token } = credentials();
  if (!siteId) return { status: 'unavailable', reason: 'netlify_site_missing', entries: [] };
  if (!token) return { status: 'needs_token', reason: 'netlify_token_missing', entries: [] };
  const cacheKey = JSON.stringify([siteId, since, source, term]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.result;
  const now = Date.now();
  const from = now - (since === '1h' ? 3600000 : 86400000);
  const selected = source === 'all' ? [...SOURCES] : [source];
  const results = await Promise.all(selected.map(async (item) => {
    try {
      if (item === 'functions') return { source: item, ...(await functionLogs(siteId, token, from, now)) };
      if (item === 'edge-functions') return { source: item, entries: await edgeLogs(siteId, token, from, now) };
      return { source: item, entries: await deployLogs(siteId, token, from) };
    } catch (cause) { return { source: item, entries: [], error: cause.message || 'request_failed' }; }
  }));
  const errors = results.flatMap((item) => {
    if (item.error) return [{ portal: item.source, code: item.error }];
    if (item.failures) return [{ portal: item.source, code: `${item.failures}/${item.total} consultas fallidas` }];
    return [];
  });
  const entries = results.flatMap((item) => item.entries)
    .filter((item) => !term || `${item.source} ${item.name} ${item.message}`.toLowerCase().includes(term))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
  const result = { status: results.every((item) => item.error || (item.total > 0 && item.failures === item.total)) ? 'unavailable' : 'ok', entries, errors, window: since };
  if (cache.size > 30) cache.clear();
  cache.set(cacheKey, { result, expires: Date.now() + 60000 });
  return result;
}

module.exports = { netlifyLogs };
