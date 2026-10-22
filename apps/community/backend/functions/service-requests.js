/**
 * /api/service-requests
 *   GET  → lista MIS solicitudes (servicios incluidos + soporte), más recientes primero.
 *   POST → crea una solicitud { service_key?, category?, title, details? }
 * Cubre "Servicios" (self-service: bureaucratic support, housing, mentor call...)
 * y "Soporte" (task/request submission + status tracking) con el mismo backend.
 *
 * Al crear una solicitud se envía además un email de aviso a hello@project-robin.com
 * (best-effort vía lib/email → Resend) para que el equipo la reciba en el buzón.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { sendEmail } = require('../lib/email');

// Buzón principal (solicitado) + copia al buzón de operaciones ya verificado en Resend,
// para garantizar la entrega aunque hello@ aún no esté configurado como destino.
const SUPPORT_INBOX = ['hello@project-robin.com', 'projectrobinn@gmail.com'];

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  if (event.httpMethod === 'GET') {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('service_requests').select('*').eq('user_id', session.uid).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ requests: data || [] });
    } catch (e) {
      console.error('service-requests GET error', e);
      return serverError(e);
    }
  }

  if (event.httpMethod === 'POST') {
    if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
    const body = parseJsonBody(event);
    if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
    const title = (body.title || '').trim();
    if (!title) return json({ error: 'missing_title' }, { statusCode: 400 });
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from('service_requests').insert({
        user_id: session.uid,
        service_key: body.service_key || null,
        category: body.category || 'servicio',
        title,
        details: body.details || null,
        status: 'open',
      }).select('*').single();
      if (error) throw error;

      // --- Aviso por email al equipo (best-effort, no bloquea la respuesta) ---
      try {
        let who = '';
        try {
          const { data: u } = await sb
            .from('subscribers').select('nombre, apellidos, email, ciudad').eq('id', session.uid).single();
          if (u) {
            const fullName = `${u.nombre || ''} ${u.apellidos || ''}`.trim();
            who = `${fullName || u.email || 'Suscriptor'}${u.email ? ` <${u.email}>` : ''}${u.ciudad ? ` · ${u.ciudad}` : ''}`;
          }
        } catch (_) {}

        const cat = body.category || 'servicio';
        const subject = `Nueva solicitud de suscriptor: ${title}`;
        const lines = [
          `Se ha recibido una nueva solicitud desde el portal de suscriptores.`,
          ``,
          `Suscriptor: ${who || session.uid}`,
          `Categoría: ${cat}`,
          body.service_key ? `Servicio: ${body.service_key}` : null,
          `Asunto: ${title}`,
          `Detalles: ${body.details || '—'}`,
        ].filter(Boolean);
        const text = lines.join('\n');
        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">
          <p>Se ha recibido una nueva solicitud desde el portal de suscriptores.</p>
          <table cellpadding="4" style="border-collapse:collapse">
            <tr><td><strong>Suscriptor</strong></td><td>${escapeHtml(who || session.uid)}</td></tr>
            <tr><td><strong>Categoría</strong></td><td>${escapeHtml(cat)}</td></tr>
            ${body.service_key ? `<tr><td><strong>Servicio</strong></td><td>${escapeHtml(body.service_key)}</td></tr>` : ''}
            <tr><td><strong>Asunto</strong></td><td>${escapeHtml(title)}</td></tr>
            <tr><td valign="top"><strong>Detalles</strong></td><td>${escapeHtml(body.details || '—')}</td></tr>
          </table>
        </div>`;
        let replyTo;
        try {
          const { data: u2 } = await sb.from('subscribers').select('email').eq('id', session.uid).single();
          if (u2 && u2.email) replyTo = u2.email;
        } catch (_) {}
        const mailRes = await sendEmail({ to: SUPPORT_INBOX, subject, text, html, tag: 'service_request_notif', reply_to: replyTo });
        try {
          await sb.from('webhook_log').insert({
            source: 'service_request_email',
            payload: { to: SUPPORT_INBOX, subject, tag: 'service_request_notif' },
            result: mailRes && mailRes.sent ? 'sent' : 'not_sent',
            message: mailRes ? JSON.stringify(mailRes).slice(0, 500) : 'no_result',
          });
        } catch (_) {}
      } catch (mailErr) {
        console.error('service-requests email notify error', mailErr);
      }

      return json({ ok: true, request: data });
    } catch (e) {
      console.error('service-requests POST error', e);
      return serverError(e);
    }
  }

  return methodNotAllowed(['GET', 'POST']);
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
