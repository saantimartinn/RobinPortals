// Netlify handler for its internal or scheduled entry; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { readApplicationIdentity, canUseRobinPlan } = require('../lib/application-permissions');

const TABLES = new Set([
  'subscribers', 'partners', 'community_events', 'event_rsvps', 'service_requests',
  'notifications', 'notification_recipients', 'discount_codes', 'friendships',
  'direct_messages', 'challenges', 'challenge_submissions', 'subscription_faqs',
  'subscription_invoices', 'webhook_log',
]);
const DEVELOPER_EMAIL = 'santimartin1203@gmail.com';

async function requireDeveloper(event) {
  const session = readSessionFromEvent(event);
  if (!session) return { error: 'unauthorized', statusCode: 401 };
  if (session.role !== 'subscriber_admin') return { error: 'developer_admin_required', statusCode: 403 };
  const identity = await readApplicationIdentity(event);
  if (!canUseRobinPlan(identity) || String(identity.email || '').trim().toLowerCase() !== DEVELOPER_EMAIL) {
    return { error: 'developer_admin_required', statusCode: 403 };
  }
  return { session };
}

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'POST']);
  if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    const access = await requireDeveloper(event);
    if (access.error) return json({ error: access.error }, { statusCode: access.statusCode });
    const sb = getSupabase();
    if (event.httpMethod === 'GET') {
      const table = String(event.queryStringParameters?.table || '');
      if (!TABLES.has(table)) return json({ error: 'unknown_table' }, { statusCode: 400 });
      const rawPage = Number(event.queryStringParameters?.page || 1);
      const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
      const pageSize = 50;
      const { data, count, error } = await sb.from(table).select('*', { count: 'exact' })
        .order('created_at', { ascending: false, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return json({ table, rows: data || [], total: count || 0, page, pageSize, tables: [...TABLES] });
    }

    const body = parseJsonBody(event);
    if (body?.action === 'sql') {
      const statement = String(body.statement || '').trim();
      if (!statement || statement.length > 50000) return json({ error: 'invalid_statement' }, { statusCode: 400 });
      const { data, error } = await sb.rpc('admin_execute_sql', { statement });
      if (error) throw error;
      return json({ result: data });
    }

    const table = String(body?.table || '');
    const id = body?.id;
    const column = String(body?.column || '');
    if (!TABLES.has(table) || !id || !/^[a-z][a-z0-9_]*$/i.test(column) || column === 'id' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
      return json({ error: 'invalid_update' }, { statusCode: 400 });
    }
    const { data: existing, error: lookupError } = await sb.from(table).select('*').eq('id', id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return json({ error: 'record_not_found' }, { statusCode: 404 });
    if (!Object.prototype.hasOwnProperty.call(existing, column)) return json({ error: 'unknown_column' }, { statusCode: 400 });
    const { data: row, error } = await sb.from(table).update({ [column]: body.value }).eq('id', id).select('*').single();
    if (error) throw error;
    return json({ table, row });
  } catch (error) {
    return serverError(error, 'sub_admin.developer_database');
  }
};
