const { getSupabase } = require('../../lib/supabase');
const { isApplicationAdmin } = require('../../lib/authorization');
const { sendEmail } = require('../../lib/email');
const { issueResetToken } = require('../../lib/password-reset');
const { publicBaseUrl } = require('../../lib/operational-config');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  if (String(event.body || '').length > 2000) return json({ error: 'too_large' }, { statusCode: 413 });
  const body = parseJsonBody(event);
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';
  if (!identifier || identifier.length > 254 || /\s/.test(identifier)) return json({ error: 'invalid_fields' }, { statusCode: 400 });

  // Always return the same response so the form cannot reveal which accounts exist.
  const accepted = json({ ok: true });
  try {
    const sb = getSupabase();
    const byEmail = identifier.includes('@');
    const { data: matches, error } = await sb.from('users')
      .select('id,email,username,role,password_hash')
      .eq(byEmail ? 'email' : 'username', byEmail ? identifier.toLowerCase() : identifier)
      .limit(2);
    if (error) throw error;
    if (matches?.length !== 1) return accepted;
    const user = matches[0];
    if (!user.email || !user.password_hash || isApplicationAdmin(user)) return accepted;

    const token = issueResetToken(user);
    const login = new URL('/login', publicBaseUrl());
    login.hash = `reset=${encodeURIComponent(token)}`;
    const name = String(user.username || user.email);
    const text = `Hola,\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta Robin (${name}).\n\nAbre este enlace durante los próximos 20 minutos:\n${login.toString()}\n\nSi no has solicitado el cambio, puedes ignorar este correo. Tu contraseña actual seguirá funcionando.\n\nEl equipo de Robin`;
    const result = await sendEmail({ to: user.email, subject: 'Restablece tu contraseña de Robin', text, tag: 'password_reset' });
    if (!result.sent) console.error(JSON.stringify({ operation: 'auth.reset_request', result: 'error', error_code: result.reason || 'email_failed' }));
    return accepted;
  } catch (error) {
    return serverError(error, 'auth.reset_request');
  }
};
