const { getSupabase } = require('../lib/supabase');
const {
  hashPassword,
  verifyPassword,
  readSessionFromEvent,
} = require('../lib/auth');
const { principalTable } = require('../lib/principal');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const { current_password, new_password } = body;
  if (!current_password || !new_password || new_password.length < 8) {
    return json({ error: 'invalid_fields' }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    const table = principalTable(session.role);
    const { data: user, error } = await sb.from(table).select('*').eq('id', session.uid).single();
    if (error || !user) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!verifyPassword(current_password, user.password_hash)) {
      return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    }
    const hash = hashPassword(new_password);
    const { error: e2 } = await sb.from(table).update({ password_hash: hash }).eq('id', user.id);
    if (e2) throw e2;
    return json({ ok: true });
  } catch (e) {
    console.error('change-password error', e);
    return serverError(e);
  }
};
