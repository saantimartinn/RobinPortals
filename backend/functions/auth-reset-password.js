const { getSupabase } = require('../lib/supabase');
const { hashPassword, verifyPasswordResetToken, isCurrentPasswordResetToken } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token) return json({ error: 'invalid_or_expired_token' }, { statusCode: 400, headers: { 'Cache-Control': 'no-store' } });
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return json({ error: 'weak_password' }, { statusCode: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const payload = verifyPasswordResetToken(token);
  if (!payload) return json({ error: 'invalid_or_expired_token' }, { statusCode: 400, headers: { 'Cache-Control': 'no-store' } });

  try {
    const sb = getSupabase();
    const { data: user, error } = await sb.from('subscribers')
      .select('id,password_hash,role')
      .eq('id', payload.uid)
      .maybeSingle();
    if (error) throw error;
    if (!user || !require('../lib/principal').isSubscriberRole(user.role) || !isCurrentPasswordResetToken(payload, user.password_hash)) {
      return json({ error: 'invalid_or_expired_token' }, { statusCode: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: updated, error: updateError } = await sb.from('subscribers')
      .update({ password_hash: hashPassword(password) })
      .eq('id', user.id)
      .eq('password_hash', user.password_hash)
      .select('id')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: 'invalid_or_expired_token' }, { statusCode: 400, headers: { 'Cache-Control': 'no-store' } });
    return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('reset-password error', e);
    return serverError(e);
  }
};
