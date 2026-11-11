// Netlify handler for /api/admin/meta/insights; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError } = require('../../lib/http');

const number = (value) => Number(value || 0);
const CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_REFRESH_MS = 5 * 60 * 1000;
const snapshotCache = new Map();

function selectedRange(params = {}) {
  const from = String(params.from || '').trim();
  const to = String(params.to || '').trim();
  if (!from && !to) return null;
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(from) || !validDate(to) || from > to) throw new Error('invalid_date_range');
  return { since: from, until: to };
}

function actionValue(items, preferredTypes) {
  for (const type of preferredTypes) {
    const match = (items || []).find((item) => item.action_type === type);
    if (match) return number(match.value);
  }
  return 0;
}

function metrics(row = {}) {
  const spend = number(row.spend);
  const leads = actionValue(row.actions, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead']);
  const purchases = actionValue(row.actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  const revenue = actionValue(row.action_values, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  return {
    spend,
    impressions: number(row.impressions),
    clicks: number(row.clicks),
    reach: number(row.reach),
    ctr: number(row.ctr),
    cpc: number(row.cpc),
    cpm: number(row.cpm),
    leads,
    purchases,
    revenue,
    cpl: leads ? spend / leads : 0,
    cac: purchases ? spend / purchases : 0,
    roas: spend ? revenue / spend : 0,
  };
}

async function graph(path, params = {}) {
  const version = process.env.META_API_VERSION || 'v26.0';
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN no configurado');
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  Object.entries({ ...params, access_token: token }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Meta API ${response.status}`);
  return payload;
}

async function adAccountId() {
  const configured = String(process.env.META_AD_ACCOUNT_ID || '').trim();
  if (configured) return configured.startsWith('act_') ? configured : `act_${configured}`;
  const accounts = await graph('me/adaccounts', { fields: 'id,account_status', limit: 100 });
  const active = (accounts.data || []).find((account) => Number(account.account_status) === 1) || accounts.data?.[0];
  if (!active?.id) throw new Error('No se encontró una cuenta publicitaria accesible');
  return active.id;
}

async function graphPages(path, params) {
  const data = [];
  let after;
  const seen = new Set();
  do {
    const page = await graph(path, { ...params, ...(after ? { after } : {}) });
    data.push(...(page.data || []));
    after = page.paging?.next ? page.paging?.cursors?.after : null;
    if (page.paging?.next && (!after || seen.has(after))) throw new Error('meta_pagination_incomplete');
    if (after) seen.add(after);
  } while (after);
  return { data };
}

async function loadSnapshot(range) {
  const accountId = await adAccountId();
  const period = range ? { time_range: JSON.stringify(range) } : { date_preset: 'last_30d' };
  const fields = 'campaign_id,campaign_name,spend,impressions,clicks,reach,ctr,cpc,cpm,actions,action_values';
  const [summaryResult, campaignsResult, dailyResult, accountResult] = await Promise.all([
    graph(`${accountId}/insights`, { fields, ...period, level: 'account', limit: 1 }),
    graphPages(`${accountId}/insights`, { fields, ...period, level: 'campaign', limit: 500 }),
    graphPages(`${accountId}/insights`, { fields: 'date_start,spend,cpm', ...period, level: 'account', time_increment: 1, limit: 100 }),
    graph(accountId, { fields: 'name,currency,timezone_name' }),
  ]);
  const statuses = await graphPages(`${accountId}/campaigns`, { fields: 'id,effective_status', limit: 500 });
  const statusById = Object.fromEntries((statuses.data || []).map((item) => [item.id, item.effective_status]));
  const campaigns = (campaignsResult.data || []).map((row) => ({ id: row.campaign_id, name: row.campaign_name || 'Campaña sin nombre', status: statusById[row.campaign_id] || 'UNKNOWN', ...metrics(row) })).sort((a, b) => b.spend - a.spend);
  return { period: range ? 'custom' : 'last_30d', account: { id: accountId, name: accountResult.name || accountId, currency: accountResult.currency || 'EUR', timezone: accountResult.timezone_name || '' }, summary: metrics(summaryResult.data?.[0]), campaigns, daily: (dailyResult.data || []).map((row) => ({ date: row.date_start, spend: number(row.spend), cpm: number(row.cpm) })), syncedAt: new Date().toISOString() };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: admin, error } = await sb.from('users').select('id,email,username,role').eq('id', session.uid).single();
    if (error || !admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });

    let range;
    try { range = selectedRange(event.queryStringParameters || {}); }
    catch (_) { return json({ error: 'invalid_date_range', detail: 'Selecciona una fecha de inicio y fin válidas, en ese orden.' }, { statusCode: 400 }); }
    const cacheKey = range ? `${range.since}:${range.until}` : 'last_30d';
    let entry = snapshotCache.get(cacheKey);
    if (!entry) {
      if (snapshotCache.size >= 30) {
        const evictable = [...snapshotCache].find(([, value]) => !value.pending);
        if (evictable) snapshotCache.delete(evictable[0]);
      }
      entry = { snapshot: null, cachedAt: 0, pending: null };
      snapshotCache.set(cacheKey, entry);
    }
    const age = Date.now() - entry.cachedAt;
    const force = event.queryStringParameters?.refresh === '1';
    if (entry.snapshot && age < (force ? MIN_REFRESH_MS : CACHE_TTL_MS)) return json(entry.snapshot);
    if (!entry.pending) entry.pending = loadSnapshot(range).then((snapshot) => { entry.snapshot = snapshot; entry.cachedAt = Date.now(); return snapshot; }).finally(() => { entry.pending = null; });
    try { return json(await entry.pending); }
    catch (error) {
      if (entry.snapshot) return json({ ...entry.snapshot, stale: true });
      if (/too many calls|rate limit/i.test(String(error?.message || ''))) return json({ error: 'meta_rate_limited', detail: 'Meta ha limitado temporalmente las consultas. Espera unos minutos antes de actualizar de nuevo.' }, { statusCode: 429 });
      throw error;
    }
  } catch (error) {
    return serverError(error, 'admin.meta_insights');
  }
};
