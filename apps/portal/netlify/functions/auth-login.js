// Netlify handler for /api/auth/login; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { verifyPassword, signSession, buildSessionCookie } = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { findIdentityCandidates, resolvePasswordCandidate } = require('../../lib/identity');
const { createOperationLogger } = require('../../lib/observability');

const IDENTITY_PROVIDERS = [
  ['robinjr', 'https://robinjr.netlify.app/.netlify/functions/auth-verify-login'],
  ['community', 'https://suscriptions-santi.netlify.app/.netlify/functions/auth-verify-login'],
];

async function verifyExternalIdentity(url, username, password) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401) return { status: 'invalid' };
  if (response.status === 409) return { status: 'ambiguous' };
  if (!response.ok) throw new Error('identity_provider_unavailable');
  const payload = await response.json();
  return payload?.identity ? { status: 'ok', identity: payload.identity } : { status: 'invalid' };
}

async function findExternalIdentity(username, password) {
  const results = await Promise.allSettled(IDENTITY_PROVIDERS.map(([, url]) => verifyExternalIdentity(url, username, password)));
  const identities = [];
  let providerUnavailable = false;
  for (const result of results) {
    if (result.status === 'rejected') providerUnavailable = true;
    else if (result.value.status === 'ambiguous') return { status: 'ambiguous' };
    else if (result.value.status === 'ok') identities.push(result.value.identity);
  }
  if (!identities.length) return providerUnavailable ? { status: 'unavailable' } : { status: 'invalid' };
  const emails = new Set(identities.map((identity) => String(identity.email || '').trim().toLowerCase()).filter(Boolean));
  const leadIds = new Set(identities.map((identity) => String(identity.lead_id || '').trim()).filter(Boolean));
  if (emails.size > 1 || (emails.size === 0 && leadIds.size > 1)) return { status: 'ambiguous' };
  const identity = identities[0];
  return {
    status: 'ok',
    identity: {
      ...identity,
      source: identity.source || IDENTITY_PROVIDERS[0][0],
      available_portals: [...new Set(identities.map((item) => item.source).filter(Boolean))],
    },
  };
}

exports.handler = async (event) => {
  const log = createOperationLogger(event, { operation: 'auth.login', actor_role: 'anonymous' });
  log.start();
  if (event.httpMethod !== 'POST') {
    log.warn('rejected', { error_code: 'method_not_allowed' });
    return methodNotAllowed(['POST']);
  }
  if (!verifyOrigin(event)) {
    log.warn('rejected', { error_code: 'bad_origin' });
    return json({ error: 'bad_origin' }, { statusCode: 403 });
  }
  const body = parseJsonBody(event);
  if (!body) {
    log.warn('rejected', { error_code: 'invalid_json' });
    return json({ error: 'invalid_json' }, { statusCode: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    log.warn('rejected', { error_code: 'missing_fields' });
    return json({ error: 'missing_fields' }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    const candidates = await findIdentityCandidates(sb, username);
    const resolved = resolvePasswordCandidate(candidates, password, verifyPassword);
    if (resolved.status === 'invalid') {
      const external = await findExternalIdentity(username, password);
      if (external.status === 'ambiguous') {
        log.warn('rejected', { error_code: 'ambiguous_identity' });
        return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
      }
      if (external.status === 'unavailable') {
        log.warn('rejected', { error_code: 'identity_provider_unavailable' });
        return json({ error: 'identity_provider_unavailable' }, { statusCode: 503 });
      }
      if (external.status !== 'ok') {
        log.warn('rejected', { error_code: 'invalid_credentials' });
        return json({ error: 'invalid_credentials' }, { statusCode: 401 });
      }
      const identity = external.identity;
      const externalUser = {
        id: 'external:' + identity.source + ':' + identity.id,
        lead_id: identity.lead_id,
        username: identity.username || identity.email,
        email: identity.email,
        nombre: identity.nombre,
        apellidos: identity.apellidos,
        role: 'client',
        auth_source: 'external_client',
        external_identity: identity,
        available_portals: identity.available_portals,
      };
      const cookie = buildSessionCookie(signSession(externalUser));
      log.success({ actor_id: externalUser.id, actor_role: 'external_client', entity_type: 'session' });
      return json({ ok: true, user: { id: externalUser.id, username: externalUser.username, role: externalUser.role } }, { cookies: [cookie] });
    }
    if (resolved.status === 'ambiguous') {
      log.warn('rejected', { error_code: 'ambiguous_identity', count: candidates.length });
      return json({ error: 'ambiguous_identity' }, { statusCode: 409 });
    }
    const user = resolved.candidate.row;

    const token = signSession(user);
    const cookie = buildSessionCookie(token);

    let next_step = null;
    if (user.requires_onboarding) next_step = user.dni_completed ? 'profile' : 'dni';

    log.success({ actor_id: user.id, actor_role: user.role, entity_type: 'session' });
    return json(
      {
        ok: true,
        requires_onboarding: !!user.requires_onboarding,
        next_step,
        user: { id: user.id, username: user.username, role: user.role },
      },
      { cookies: [cookie] }
    );
  } catch (e) {
    log.failure(e);
    return serverError(e);
  }
};
