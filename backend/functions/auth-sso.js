// Netlify handler for /api/auth/sso; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../lib/supabase');
const { signSession, buildSessionCookie } = require('../lib/auth');
const { isSubscriberRole } = require('../lib/principal');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../lib/http');
const { readApplicationIdentity, canUseRobinPlan } = require('../lib/application-permissions');

async function findSubscriber(sb, identity) {
  const email = String(identity.email || '').trim();
  const lookups = [
    ['email', email],
    ['email', email.toLowerCase()],
    ['lead_id', identity.lead_id],
    ...(identity.external_source === 'community' && identity.external_identity_id ? [['id', identity.external_identity_id]] : []),
  ].filter(([, value]) => value);
  let ambiguous = false;
  for (const [field, value] of lookups) {
    const { data, error } = await sb.from('subscribers').select('id, lead_id, username, email, role, subscription_status').eq(field, value).limit(2);
    if (error) throw error;
    // Nota: no elegimos una cuenta si un identificador duplicado puede enlazar a otra persona.
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
    if (identity.is_application_admin === true && canUseRobinPlan(identity)) {
      const adminSession = {
        id: identity.id,
        lead_id: identity.lead_id,
        username: identity.username || identity.email,
        email: identity.email,
        role: 'subscriber_admin',
        auth_source: 'application_admin',
      };
      return json({ ok: true }, { cookies: [buildSessionCookie(signSession(adminSession))] });
    }
    const { user, ambiguous } = await findSubscriber(getSupabase(), identity);
    if (ambiguous) return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    if (!user) return json({ error: 'subscription_account_required' }, { statusCode: 403 });
    if (user.role === 'subscriber_admin' && !canUseRobinPlan(identity)) return json({ error: 'robin_plan_access_denied' }, { statusCode: 403 });
    if (user.role === 'subscriber' && !['active', 'trialing'].includes(user.subscription_status)) {
      return json({ error: 'active_subscription_required' }, { statusCode: 403, cookies: [buildSessionCookie('', { clear: true })] });
    }
    user.auth_source = 'application_sso';
    const cookie = buildSessionCookie(signSession(user));
    return json({ ok: true }, { cookies: [cookie] });
  } catch (error) {
    return serverError(error, 'auth.sso');
  }
};
