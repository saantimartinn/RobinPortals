const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { netlifyLogs, supabaseLogs } = require('../../lib/platform-logs');
const { json, methodNotAllowed, serverError } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: admin, error } = await sb.from('users').select('id,email,role').eq('id', session.uid).single();
    if (error || !admin || !isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });
    const q = event.queryStringParameters || {};
    if (q.provider === 'netlify') return json(await netlifyLogs(q));
    if (q.provider === 'supabase') return json(await supabaseLogs(q));
    return json({ error: 'invalid_provider' }, { statusCode: 400 });
  } catch (cause) {
    if (/^invalid_(source|project)$/.test(cause.message)) return json({ error: cause.message }, { statusCode: 400 });
    return serverError(cause, 'admin.platform_logs');
  }
};
