const { getSupabase } = require('../../lib/supabase');
const { getJuniorSupabase } = require('../../lib/junior-supabase');
const { getSubscriptionsSupabase } = require('../../lib/subscriptions-supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { listDeveloperLogs } = require('../../lib/developer-logs');
const { json, methodNotAllowed, serverError } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const portal = getSupabase();
    const { data: admin, error } = await portal.from('users').select('id,email,role').eq('id', session.uid).single();
    if (error || !admin || !isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });
    const params = event.queryStringParameters || {};
    if (params.portal && !['all', 'portal', 'robinjr', 'community'].includes(params.portal)) return json({ error: 'invalid_portal' }, { statusCode: 400 });
    const clients = {
      portal,
      robinjr: params.portal === 'all' || !params.portal || params.portal === 'robinjr' ? getJuniorSupabase() : null,
      community: params.portal === 'all' || !params.portal || params.portal === 'community' ? getSubscriptionsSupabase() : null,
    };
    try { return json(await listDeveloperLogs(clients, params)); }
    catch (cause) {
      if (cause.message === 'invalid_cursor') return json({ error: 'invalid_cursor' }, { statusCode: 400 });
      throw cause;
    }
  } catch (error) { return serverError(error, 'admin.developer_logs'); }
};
