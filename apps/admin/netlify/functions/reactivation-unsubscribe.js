const { getAdminSupabase } = require('../../lib/admin-supabase');
const { readUnsubscribeToken, rows } = require('../../lib/lead-reactivation');
const { escapeHtml } = require('../../lib/lead-reactivation-content');

function page(title, body, statusCode = 200) {
  return { statusCode, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' }, body: `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Robin</title><body style="background:#FEFBE5;color:#263C6A;font:17px/1.6 Arial;margin:32px auto;padding:24px;max-width:600px"><h1>${title}</h1>${body}</body></html>` };
}

exports.handler = async event => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return page('Método no permitido', '', 405);
  const token = String(event.queryStringParameters?.token || '');
  if (!token && event.queryStringParameters?.test === '1') return page('Correo de prueba', '<p>No estás inscrito en esta secuencia. No hay correos futuros que cancelar.</p>');
  let identity;
  try { identity = readUnsubscribeToken(token); }
  catch (_) { return page('Enlace no válido', '<p>Este enlace de baja no es válido. Escríbenos a hello@project-robin.com para que lo revisemos.</p>', 400); }
  try {
    const db = getAdminSupabase();
    const enrollment = await rows(db.from('crm_lead_reactivations').select('id,email').eq('id', identity.sub).eq('email', identity.email).maybeSingle());
    if (!enrollment) return page('Enlace no válido', '<p>No encontramos esta inscripción.</p>', 400);
    // GET never unsubscribes: mail scanners and link previews can open it safely.
    if (event.httpMethod === 'GET') return page('Dejar de recibir estos correos', `<p>Puedes cancelar los correos comerciales de reactivación de Robin.</p><form method="POST" action="?token=${escapeHtml(encodeURIComponent(token))}"><button type="submit" style="padding:14px 22px;background:#ECB450;color:#263C6A;border:0;font:inherit">Confirmar baja</button></form>`);
    await rows(db.rpc('suppress_reactivation_email', { p_email: enrollment.email, p_reason: 'unsubscribe' }));
    return page('Baja confirmada', '<p>No recibirás más correos comerciales de esta secuencia.</p>');
  } catch (_) { return page('No se pudo completar la baja', '<p>Vuelve a intentarlo o escríbenos a hello@project-robin.com.</p>', 503); }
};
