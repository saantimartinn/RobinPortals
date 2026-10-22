// Issue a short-lived RobinJr handoff ticket from the common application session.
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  if (body.target !== 'robinjr') return json({ error: 'invalid_sso_target' }, { statusCode: 400 });

  try {
    if (session.auth_source === 'external_client' && session.external_identity) {
      const identity = session.external_identity;
      const ticket = jwt.sign(
        {
          uid: session.uid,
          purpose: 'portal_sso',
          target: 'robinjr',
          external_identity: identity,
        },
        process.env.JWT_SECRET,
        { expiresIn: '90s', algorithm: 'HS256' }
      );
      return json({ ticket });
    }
    const { data: user, error } = await getSupabase()
      .from('users')
      .select('id, lead_id, username, email, role')
      .eq('id', session.uid)
      .single();
    if (error || !user) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const ticket = jwt.sign(
      { uid: user.id, purpose: 'portal_sso', target: 'robinjr' },
      process.env.JWT_SECRET,
      { expiresIn: '90s', algorithm: 'HS256' }
    );
    return json({ ticket });
  } catch (error) {
    return serverError(error, 'auth.sso_ticket');
  }
};
