/**
 * POST /api/sub-admin/partner-logo · Sube un logo público para un partner.
 * Body: { data_url, partner_id? }
 * Gate: sólo sesión subscriber_admin. Máximo 2 MB una vez decodificado.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { MAX_BYTES, parseImageDataUrl, safeSegment, uploadPartnerLogo } = require('../lib/partner-logo');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (session.role !== 'subscriber_admin') return json({ error: 'forbidden' }, { statusCode: 403 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const image = parseImageDataUrl(body.data_url);
  if (!image) return json({ error: 'invalid_logo', detail: 'Usa PNG, JPG o WebP de hasta 2 MB.' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { logoUrl, path } = await uploadPartnerLogo(sb, image, body.partner_id);
    return json({ ok: true, logo_url: logoUrl, path });
  } catch (error) {
    console.error('partner-logo-upload error', error);
    return serverError(error);
  }
};

exports._test = { parseImageDataUrl, safeSegment, MAX_BYTES };
