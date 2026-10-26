// Receives portal issues and suggestions, including from people unable to log in.
const { readSessionFromEvent } = require('../../lib/auth');
const { sendEmail } = require('../../lib/email');
const { json, methodNotAllowed, parseJsonBody, verifyOrigin } = require('../../lib/http');

const SUPPORT_EMAIL = 'santiago.martin.ab@gmail.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  if (String(event.body || '').length > 10000) return json({ error: 'too_large' }, { statusCode: 413 });
  const body = parseJsonBody(event);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_json' }, { statusCode: 400 });
  // A hidden field absorbs basic automated submissions without notifying support.
  if (body.website) return json({ ok: true });

  const kind = body.kind === 'suggestion' ? 'Sugerencia' : body.kind === 'problem' ? 'Problema' : null;
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim();
  const page = String(body.page || '').trim();
  if (!kind || email.length > 254 || !EMAIL_PATTERN.test(email) || message.length < 15 || message.length > 3000 || !page.startsWith('/') || page.length > 300 || page.startsWith('//')) {
    return json({ error: 'invalid_fields' }, { statusCode: 400 });
  }

  const session = readSessionFromEvent(event);
  const subject = `[Portal Robin] ${kind} comunicado`;
  const text = [
    `Tipo: ${kind}`,
    `Contacto: ${email}`,
    `Cuenta: ${session?.uid || 'Sin iniciar sesión'}`,
    `Página: ${page}`,
    '',
    'Mensaje:',
    message,
  ].join('\n');
  const result = await sendEmail({ to: SUPPORT_EMAIL, subject, text, reply_to: email, tag: 'portal_report' });
  if (!result.sent) {
    console.error(JSON.stringify({ operation: 'portal.report_problem', result: 'error', error_code: result.reason || 'email_failed' }));
    return json({ error: 'delivery_failed' }, { statusCode: 502 });
  }
  return json({ ok: true });
};
