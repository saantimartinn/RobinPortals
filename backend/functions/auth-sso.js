const { parse: parseCookies } = require('cookie');
const { getSupabase } = require('../lib/supabase');
const { signSession, buildSessionCookie } = require('../lib/auth');
const { isSubscriberRole } = require('../lib/principal');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../lib/http');

const APPLICATION_ME_URL = 'https://project-robin.com/portal/api/me';

async function readApplicationIdentity(event) {
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const token = parseCookies(cookieHeader).robin_portal_session;
  if (!token) return null;
  const response = await fetch(APPLICATION_ME_URL, {
    headers: { Cookie: `robin_portal_session=${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user && typeof user.email === 'string' ? user : null;
}

async function findSubscriber(sb, identity) {
  const email = String(identity.email || '').trim();
  const lookups = [
    ['email', email],
    ['email', email.toLowerCase()],
    ['lead_id', identity.lead_id],
  ].filter(([, value]) => value);
  let ambiguous = false;
  for (const [field, value] of lookups) {
    const { data, error } = await sb.from('subscribers').select('id, lead_id, username, email, role').eq(field, value).limit(2);
    if (error) throw error;
    if (data?.length > 1) { ambiguous = true; continue; }
    if (data?.length === 1) {
      return isSubscriberRole(data[0].role) ? { user: data[0] } : {};
    }
  }
  return ambiguous ? { ambiguous: true } : {};
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    const identity = await readApplicationIdentity(event);
    if (!identity) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const { user, ambiguous } = await findSubscriber(getSupabase(), identity);
    if (ambiguous) return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    if (!user) return json({ error: 'subscription_account_required' }, { statusCode: 403 });
    const cookie = buildSessionCookie(signSession(user));
    return json({ ok: true }, { cookies: [cookie] });
  } catch (error) {
    return serverError(error, 'auth.sso');
  }
};
