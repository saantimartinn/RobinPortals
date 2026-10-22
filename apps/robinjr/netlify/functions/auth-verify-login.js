// Verify common-login credentials against the RobinJr account store without creating a local session.
const { getSupabase } = require('../../lib/supabase');
const { verifyPassword } = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { findIdentityCandidates, resolvePasswordCandidate } = require('../../lib/identity');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const origin = event.headers?.origin || event.headers?.Origin;
  if (origin && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return json({ error: 'invalid_credentials' }, { statusCode: 401 });
  }
  try {
    const candidates = await findIdentityCandidates(getSupabase(), body.username);
    const resolved = resolvePasswordCandidate(candidates, body.password, verifyPassword);
    if (resolved.status === 'ambiguous') return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    if (resolved.status !== 'ok') return json({ error: 'invalid_credentials' }, { statusCode: 401 });
    const user = resolved.candidate.row;
    return json({ identity: {
      id: user.id,
      lead_id: user.lead_id || null,
      username: user.username || user.email,
      email: user.email || null,
      nombre: user.nombre || null,
      apellidos: user.apellidos || null,
      role: user.role,
      source: 'robinjr',
    } });
  } catch (error) {
    return serverError(error, 'auth.verify_login');
  }
};
