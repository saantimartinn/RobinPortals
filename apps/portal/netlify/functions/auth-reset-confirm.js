const { getSupabase } = require('../../lib/supabase');
const { buildSessionCookie } = require('../../lib/auth');
const { storePasswordWithoutHash } = require('../../../../packages/auth/password-storage.cjs');
const { isApplicationAdmin } = require('../../lib/authorization');
const { readResetToken, passwordVersion } = require('../../lib/password-reset');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { passwordPolicy } = require('../../shared/password-policy.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  if (String(event.body || '').length > 4000) return json({ error: 'too_large' }, { statusCode: 413 });
  const body = parseJsonBody(event);
  const token = typeof body?.token === 'string' ? body.token : '';
  const newPassword = body?.new_password;
  if (!token || !passwordPolicy(newPassword).ok) return json({ error: 'invalid_fields' }, { statusCode: 400 });
  const payload = readResetToken(token);
  if (!payload) return json({ error: 'invalid_or_expired_link' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { data: user, error } = await sb.from('users')
      .select('id,email,role,password_hash')
      .eq('id', payload.uid)
      .maybeSingle();
    if (error) throw error;
    if (!user || isApplicationAdmin(user) || String(user.email || '').trim().toLowerCase() !== payload.email || passwordVersion(user.password_hash) !== payload.version) {
      return json({ error: 'invalid_or_expired_link' }, { statusCode: 400 });
    }
    const { data: updated, error: updateError } = await sb.from('users')
      .update({ password_hash: storePasswordWithoutHash(newPassword) })
      .eq('id', user.id)
      .eq('password_hash', user.password_hash)
      .select('id');
    if (updateError) throw updateError;
    if (!updated?.length) return json({ error: 'invalid_or_expired_link' }, { statusCode: 400 });
    return json({ ok: true }, { cookies: [buildSessionCookie('', { clear: true })] });
  } catch (error) {
    return serverError(error, 'auth.reset_confirm');
  }
};
