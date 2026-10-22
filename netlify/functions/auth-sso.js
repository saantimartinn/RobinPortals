// Exchange the common platform ticket for a RobinJr session after checking this portal's own user table.
const { getSupabase } = require('../../lib/supabase');
const { signSession, buildSessionCookie } = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { isApplicationAdmin } = require('../../lib/authorization');

const VERIFY_URL = 'https://project-robin.com/portal/api/auth/sso-verify';

async function verifyPlatformTicket(ticket) {
  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function findPortalUser(sb, identity) {
  const fields = [
    ...(identity.source === 'robinjr' || !identity.source ? [['id', identity.id]] : []),
    ['lead_id', identity.lead_id],
    ['email', identity.email && String(identity.email).trim().toLowerCase()],
    ['username', identity.username],
  ].filter(([, value]) => value);
  const found = new Map();
  for (const [field, value] of fields) {
    const { data, error } = await sb.from('users').select('*').eq(field, value).limit(2);
    if (error) throw error;
    if (data?.length > 1) return { ambiguous: true };
    if (data?.[0]) found.set(String(data[0].id), data[0]);
  }
  if (found.size > 1) return { ambiguous: true };
  return { user: found.values().next().value || null };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body || typeof body.ticket !== 'string') return json({ error: 'invalid_ticket' }, { statusCode: 400 });
  try {
    const identity = await verifyPlatformTicket(body.ticket);
    if (!identity?.id) return json({ error: 'invalid_ticket' }, { statusCode: 401 });
    const { user, ambiguous } = await findPortalUser(getSupabase(), identity);
    if (ambiguous) return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    if (!user && !identity.is_application_admin) {
      return json({ error: 'robinjr_account_required' }, { statusCode: 403 });
    }
    if (user && isApplicationAdmin(user) && !identity.is_application_admin) {
      return json({ error: 'robinjr_admin_account_required' }, { statusCode: 403 });
    }
    const sessionUser = user || {
      id: identity.id,
      lead_id: identity.lead_id,
      username: identity.username,
      email: identity.email,
      nombre: identity.nombre,
      apellidos: identity.apellidos,
    };
    sessionUser.auth_source = identity.is_application_admin ? 'application_admin' : 'application_sso';
    if (identity.is_application_admin) {
      sessionUser.is_application_admin = true;
      sessionUser.is_pro_admin = true;
      sessionUser.visible_tabs = identity.visible_tabs || [];
      sessionUser.application_identity = identity;
    }
    return json({ ok: true }, { cookies: [buildSessionCookie(signSession(sessionUser))] });
  } catch (error) {
    return serverError(error, 'auth.sso');
  }
};
