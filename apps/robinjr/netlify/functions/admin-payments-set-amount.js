/**
 * Legacy endpoint kept for existing clients. Robin Jr installments now have a
 * fixed amount, so authorized admins receive a clear conflict response.
 */
const { readSessionFromEvent } = require('../../lib/auth');
const { getSessionUser } = require('../../lib/session-user');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../../lib/http');
const { getSupabase } = require('../../lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  try {
    const sb = getSupabase();
    const { data: admin } = await getSessionUser(sb, session, 'id, email, username, role');
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });
    return json({ error: 'robin_jr_installments_are_fixed' }, { statusCode: 409 });
  } catch (error) {
    return serverError(error);
  }
};
