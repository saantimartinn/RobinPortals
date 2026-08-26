/**
 * Envío de correos al cliente. Usa Resend (https://resend.com) si
 * está configurada la env var RESEND_API_KEY.
 * Si no, registra el intento en webhook_log y devuelve { sent: false }.
 *
 * Variables:
 *   RESEND_API_KEY     → API key de Resend
 *   RESEND_FROM        → "Project Robin <no-reply@projectrobin.com>"
 */
const { getSupabase } = require('./supabase');

async function sendEmail({ to, subject, html, text, tag, attachments, cc, bcc, reply_to, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Project Robin <no-reply@projectrobin.com>';
  if (!to) return { sent: false, reason: 'missing_to' };

  if (!key) {
    // Fallback: registrar en webhook_log para tener trazabilidad
    try {
      const sb = getSupabase();
      await sb.from('webhook_log').insert({
        source: 'email_fallback',
        payload: { tag: tag || null },
        result: 'not_sent',
        message: 'RESEND_API_KEY no configurada — correo no enviado',
      });
    } catch (_) {}
    return { sent: false, reason: 'no_provider' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text, attachments, reply_to: reply_to || replyTo || undefined, cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined, bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: 'provider_error', detail: data };
    return { sent: true, id: data.id };
  } catch (e) {
    return { sent: false, reason: 'exception', detail: e.message };
  }
}

module.exports = { sendEmail };
