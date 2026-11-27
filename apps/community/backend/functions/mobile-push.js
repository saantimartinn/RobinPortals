const { getSupabase } = require('../lib/supabase');
const { readApplicationIdentity } = require('../lib/application-permissions');
const { json, serverError } = require('../lib/http');
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
  try {
    const identity = await readApplicationIdentity(event);
    if (!identity || identity.is_application_admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const sb = getSupabase();
    const queries = [
      ...(identity.external_source === 'community' && identity.external_identity_id ? [['id', identity.external_identity_id]] : []),
      ...(identity.lead_id ? [['lead_id', identity.lead_id]] : []),
    ];
    const users = new Map();
    for (const [field, value] of queries) {
      const { data, error } = await sb.from('subscribers').select('id,role,subscription_status').eq(field, value).limit(2);
      if (error) throw error;
      for (const user of data || []) users.set(user.id, user);
    }
    if (users.size !== 1) return json({ error: 'account_not_linked' }, { statusCode: 403 });
    const user = [...users.values()][0];
    if (user.role !== 'subscriber' || !['active', 'trialing'].includes(user.subscription_status)) return json({ error: 'inactive_subscription' }, { statusCode: 403 });
    await registerDevice(sb, user.id, JSON.parse(event.body || '{}').token);
    return json({ ok: true });
  } catch (error) { return serverError(error, 'mobile.push.register'); }
};
