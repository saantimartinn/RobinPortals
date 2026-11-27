const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, serverError } = require('../../lib/http');
const { isApplicationAdmin } = require('../../lib/authorization');
const { registerDevice, unregisterDevice } = require('../../../../packages/notifications/mobile-devices.cjs');

exports.handler = async event => {
  if (!['POST', 'DELETE'].includes(event.httpMethod)) return json({ error: 'method_not_allowed' }, { statusCode: 405 });
  if (event.headers?.['x-robin-native-client'] !== 'ios') return json({ error: 'forbidden' }, { statusCode: 403 });
  if (event.httpMethod === 'DELETE') {
    try {
      await unregisterDevice(getSupabase(), JSON.parse(event.body || '{}').token);
      return json({ ok: true });
    } catch (error) { return serverError(error, 'mobile.push.unregister'); }
  }
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    if (session.auth_source === 'external_client') return json({ error: 'forbidden' }, { statusCode: 403 });
    const { data: user, error } = await sb.from('users').select('id,role,email').eq('id', session.uid).single();
    if (error || !user || isApplicationAdmin(user)) return json({ error: 'forbidden' }, { statusCode: 403 });
    const body = JSON.parse(event.body || '{}');
    await registerDevice(sb, user.id, body.token);
    return json({ ok: true });
  } catch (error) { return serverError(error, 'mobile.push.register'); }
};
