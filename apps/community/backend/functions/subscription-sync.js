const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError } = require('../lib/http');
const { syncOne } = require('../lib/revolut-subscription-sync');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: record, error } = await sb.from('revolut_subscriptions')
      .select('*').eq('subscriber_id', session.uid).maybeSingle();
    if (error) throw error;
    if (!record) return json({ error: 'subscription_not_found' }, { statusCode: 404 });
    const result = await syncOne(sb, record);
    return json(result);
  } catch (error) {
    console.error('subscription-sync error', error);
    return serverError(error);
  }
};
