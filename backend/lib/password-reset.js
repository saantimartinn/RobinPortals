const { getSupabase } = require('./supabase');
const { hashPassword, signPasswordResetToken, verifyPasswordResetToken, isCurrentPasswordResetToken } = require('./auth');
const { sendEmail } = require('./email');

const GENERIC_RESPONSE = {
  ok: true,
  message: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.',
};

function resetUrl(event, token) {
  let base = process.env.PUBLIC_BASE_URL || process.env.URL || '';
  if (!base) {
    const host = event.headers && (event.headers.host || event.headers.Host);
    if (host) base = `https://${host}`;
  }
  base = String(base).replace(/\/therobinplan\/?$/, '').replace(/\/$/, '');
  return `${base}/therobinplan/?reset_token=${encodeURIComponent(token)}`;
}

function emailHtml(url, name) {
  const greeting = name ? `Hola ${String(name).replace(/[<>&"']/g, '')},` : 'Hola,';
  return `
    <div style="background:#f6f4ef;padding:32px 16px;font-family:Arial,sans-serif;color:#172033">
      <div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;padding:32px;border:1px solid #e7e5e4">
        <div style="font-family:Georgia,serif;font-size:25px;font-weight:700;color:#183568">The Robin Plan</div>
        <p style="margin-top:28px">${greeting}</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p style="margin:28px 0">
          <a href="${url}" style="display:inline-block;background:#183568;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700">Crear una nueva contraseña</a>
        </p>
        <p style="font-size:14px;color:#64748b">Este enlace caduca en 30 minutos y dejará de funcionar en cuanto cambies la contraseña.</p>
        <p style="font-size:14px;color:#64748b">Si no has solicitado este cambio, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.</p>
      </div>
    </div>`;
}

async function requestPasswordReset(event, rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || email.length > 254) return GENERIC_RESPONSE;

  const sb = getSupabase();
  const { data, error } = await sb.from('subscribers')
    .select('id,email,nombre,password_hash,role')
    .eq('email', email)
    .limit(1);
  if (error) throw error;
  const user = data && data[0];
  if (!user || !user.password_hash || !require('./principal').isSubscriberRole(user.role)) return GENERIC_RESPONSE;

  const marker = `subscriber:${user.id}`;
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await sb.from('webhook_log')
    .select('id')
    .eq('source', 'password_reset_request')
    .eq('message', marker)
    .gte('created_at', since)
    .limit(1);
  if (recentError) throw recentError;
  if (recent && recent[0]) return GENERIC_RESPONSE;

  const token = signPasswordResetToken(user);
  const url = resetUrl(event, token);
  const delivery = await sendEmail({
    to: user.email,
    subject: 'Restablece tu contraseña de The Robin Plan',
    html: emailHtml(url, user.nombre),
    text: `Restablece tu contraseña de The Robin Plan: ${url}\n\nEl enlace caduca en 30 minutos. Si no lo has solicitado, ignora este correo.`,
    tag: 'password-reset',
  });
  await sb.from('webhook_log').insert({
    source: 'password_reset_request',
    payload: { sent: !!delivery.sent, provider_id: delivery.id || null },
    result: delivery.sent ? 'sent' : 'not_sent',
    message: marker,
  });
  return GENERIC_RESPONSE;
}

async function applyPasswordReset(token, password) {
  if (!token) return { ok: false, error: 'invalid_or_expired_token' };
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    return { ok: false, error: 'weak_password' };
  }
  const payload = verifyPasswordResetToken(token);
  if (!payload) return { ok: false, error: 'invalid_or_expired_token' };

  const sb = getSupabase();
  const { data: user, error } = await sb.from('subscribers')
    .select('id,password_hash,role')
    .eq('id', payload.uid)
    .maybeSingle();
  if (error) throw error;
  if (!user || !require('./principal').isSubscriberRole(user.role) || !isCurrentPasswordResetToken(payload, user.password_hash)) {
    return { ok: false, error: 'invalid_or_expired_token' };
  }

  const { data: updated, error: updateError } = await sb.from('subscribers')
    .update({ password_hash: hashPassword(password) })
    .eq('id', user.id)
    .eq('password_hash', user.password_hash)
    .select('id')
    .maybeSingle();
  if (updateError) throw updateError;
  return updated ? { ok: true } : { ok: false, error: 'invalid_or_expired_token' };
}

module.exports = { GENERIC_RESPONSE, requestPasswordReset, applyPasswordReset, resetUrl, emailHtml };
