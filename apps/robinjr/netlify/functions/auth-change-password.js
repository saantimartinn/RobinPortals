// Netlify handler for /api/auth/change-password; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const {
  verifyPassword,
  readSessionFromEvent,
} = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { passwordPolicy } = require('../../shared/password-policy.cjs');
const { readApplicationIdentity } = require('../../lib/application-identity');
const { storePasswordWithoutHash } = require('../../../../packages/auth/password-storage.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session && !event.headers?.cookie && !event.headers?.Cookie) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return json({ error: 'invalid_fields' }, { statusCode: 400 });
  }
  if (!passwordPolicy(new_password).ok) return json({ error: 'weak_password' }, { statusCode: 400 });

  try {
    const identity = await readApplicationIdentity(event);
    const userId = identity?.auth_source === 'external_client' && identity.external_source === 'robinjr'
      ? identity.external_identity_id
      : !identity && session ? session.uid : null;
    if (!userId) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const sb = getSupabase();
    const { data: user, error } = await sb.from('users').select('id,password_hash').eq('id', userId).single();
    if (error || !user) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!verifyPassword(current_password, user.password_hash)) {
      return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    }
    const storedPassword = storePasswordWithoutHash(new_password);
    const { error: e2 } = await sb.from('users').update({ password_hash: storedPassword }).eq('id', user.id);
    if (e2) throw e2;
    return json({ ok: true });
  } catch (e) {
    console.error('change-password error', e);
    return serverError(e);
  }
};
