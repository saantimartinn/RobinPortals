// Atomically reserve this announcement's single appearance for the signed-in account.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

function createPortalUpdateNoticeHandler(deps = {}) {
  const database = deps.getSupabase || getSupabase;
  const readSession = deps.readSessionFromEvent || readSessionFromEvent;
  return async (event) => {
    if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
    if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
    const session = readSession(event);
    if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (session.auth_source === 'external_client') return json({ error: 'forbidden' }, { statusCode: 403 });
    const body = parseJsonBody(event);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || (body.already_seen !== undefined && typeof body.already_seen !== 'boolean')) {
      return json({ error: 'invalid_json' }, { statusCode: 400 });
    }
    try {
      const sb = database();
      const { data: user, error: userError } = await sb.from('users')
        .select('id, role, email, username').eq('id', session.uid).maybeSingle();
      if (userError) throw userError;
      if (!user) return json({ error: 'unauthorized' }, { statusCode: 401 });
      if (isApplicationAdmin(user)) return json({ error: 'forbidden' }, { statusCode: 403 });
      const { data, error } = await sb.from('users')
        .update({ portal_update_notice_seen_at: new Date().toISOString() })
        .eq('id', user.id).is('portal_update_notice_seen_at', null).select('id').maybeSingle();
      if (error) throw error;
      return json({ show: Boolean(data) && body.already_seen !== true });
    } catch (error) {
      return serverError(error, 'portal_update_notice');
    }
  };
}

exports.createPortalUpdateNoticeHandler = createPortalUpdateNoticeHandler;
exports.handler = createPortalUpdateNoticeHandler();
