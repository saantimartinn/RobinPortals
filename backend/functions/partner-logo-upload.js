/**
 * POST /api/sub-admin/partner-logo · Sube un logo público para un partner.
 * Body: { data_url, partner_id? }
 * Gate: sólo sesión subscriber_admin. Máximo 2 MB una vez decodificado.
 */
const crypto = require('node:crypto');
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

const BUCKET = 'partner-logos';
const MAX_BYTES = 2 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function parseImageDataUrl(value) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''));
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_BYTES) return null;
  const validSignature =
    (match[1] === 'image/png' && buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (match[1] === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (match[1] === 'image/webp' && buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!validSignature) return null;
  return { buffer, contentType: match[1], extension: MIME_EXTENSIONS[match[1]] };
}

function safeSegment(value) {
  const clean = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return clean || crypto.randomUUID();
}

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
    const owner = safeSegment(body.partner_id);
    const path = `${owner}/logo-${Date.now()}.${image.extension}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, image.buffer, {
      contentType: image.contentType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (!data || !data.publicUrl) throw new Error('logo_public_url_missing');
    return json({ ok: true, logo_url: data.publicUrl, path });
  } catch (error) {
    console.error('partner-logo-upload error', error);
    return serverError(error);
  }
};

exports._test = { parseImageDataUrl, safeSegment, MAX_BYTES };
