// Verify common-login credentials against Community's subscriber store without issuing a local cookie.
const { getSupabase } = require('../lib/supabase');
const { verifyPassword } = require('../lib/auth');
const { isSubscriberRole } = require('../lib/principal');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const origin = event.headers?.origin || event.headers?.Origin;
  if (origin && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return json({ error: 'invalid_credentials' }, { statusCode: 401 });
  }
  try {
    const sb = getSupabase();
    const identifier = body.username.trim();
    const candidates = new Map();
    for (const field of ['username', 'email', 'lead_id']) {
      const { data, error } = await sb.from('subscribers').select('*').eq(field, identifier).limit(2);
      if (error) throw error;
      if (data?.length > 1) return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
      if (data?.[0] && isSubscriberRole(data[0].role)) candidates.set(String(data[0].id), data[0]);
    }
    const verified = [...candidates.values()].filter((user) => user.password_hash && verifyPassword(body.password, user.password_hash));
    if (verified.length > 1) return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    if (verified.length !== 1) return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    const user = verified[0];
    return json({ identity: {
      id: user.id,
      lead_id: user.lead_id || null,
      username: user.username || user.email,
      email: user.email || null,
      nombre: user.nombre || null,
      apellidos: user.apellidos || null,
      role: user.role,
      source: 'community',
    } });
  } catch (error) {
    return serverError(error, 'auth.verify_login');
  }
};
