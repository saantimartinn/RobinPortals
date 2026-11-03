const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../lib/http');
const revolut = require('../lib/revolut-subscriptions');
const { syncOne } = require('../lib/revolut-subscription-sync');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: row, error } = await sb.from('revolut_subscriptions').select('*').eq('subscriber_id', session.uid).maybeSingle();
    if (error) throw error;
    if (!row?.subscription_id || row.state === 'cancelled') return json({ error: 'subscription_not_active' }, { statusCode: 409 });
    await revolut.cancelSubscription(row.subscription_id);
    await syncOne(sb, row);
    return json({ ok: true });
  } catch (error) {
    console.error('subscription-cancel error', error);
    return serverError(error);
  }
};
