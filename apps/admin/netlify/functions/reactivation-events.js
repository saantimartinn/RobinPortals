const { getAdminSupabase } = require('../../lib/admin-supabase');
const { verifyEmailEvent } = require('../../lib/reactivation-webhook');
const { rows } = require('../../lib/lead-reactivation');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { CAMPAIGN_ID } = require('../../lib/lead-reactivation-content');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  let payload;
  try { payload = verifyEmailEvent(event); }
  catch (_) { return json({ error: 'invalid_signature' }, { statusCode: 401 }); }
  const status = String(payload.type || '').replace(/^email\./, '');
  if (!['delivered', 'bounced', 'complained', 'suppressed', 'failed'].includes(status) || !payload.data?.email_id) return json({ ok: true });
  if (payload.data.tags?.campaign !== CAMPAIGN_ID || !/^[a-f0-9-]{36}$/i.test(payload.data.tags?.message_id || '')) return json({ ok: true });
  try {
    const db = getAdminSupabase();
    for (const email of payload.data.to || []) await rows(db.rpc('record_reactivation_email_event', { p_message_id: payload.data.tags.message_id, p_provider_id: payload.data.email_id, p_status: status, p_email: email }));
    return json({ ok: true });
  } catch (error) { return serverError(error, 'crm.reactivation_event'); }
};
