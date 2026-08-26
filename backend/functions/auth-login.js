const { getSupabase } = require('../lib/supabase');
const { verifyPassword, signSession, buildSessionCookie } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const { username, password } = body;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) return json({ error: 'missing_fields' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const u = String(username).trim();
    // Consultas eq separadas: no interpolar entradas en filtros PostgREST.
    let user = null;
    for (const field of ['username', 'email', 'lead_id']) {
      const { data, error } = await sb.from('subscribers').select('*').eq(field, u).limit(1);
      if (error) throw error;
      if (data?.[0]) { user = data[0]; break; }
    }
    if (user && !require('../lib/principal').isSubscriberRole(user.role)) user = null;

    if (!user) return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    if (!verifyPassword(password, user.password_hash)) {
      return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    }

    const token = signSession(user);
    const cookie = buildSessionCookie(token);


    return json(
      {
        ok: true,
        user: { id: user.id, username: user.username, role: user.role },
      },
      { cookies: [cookie] }
    );
  } catch (e) {
    console.error('login error', e);
    return serverError(e);
  }
};
