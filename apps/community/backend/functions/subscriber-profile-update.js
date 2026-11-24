/**
 * POST /api/subscriber/profile  Body: { nombre?, apellidos?, email?, ciudad?, profile_extra? }
 * Edición mínima de perfil para suscriptores (Ajustes). Email duplicado → 409.
 * Las fotos se gestionan por /api/subscriber/avatar y nunca se guardan aquí como data URL.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { subscriberAvatarUrl } = require('../lib/subscriber-avatars');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  if (Object.prototype.hasOwnProperty.call(body, 'avatar_url')) {
    return json({ error: 'avatar_upload_endpoint_required' }, { statusCode: 400 });
  }

  const update = {};
  if (typeof body.nombre === 'string') update.nombre = body.nombre.trim();
  if (typeof body.apellidos === 'string') update.apellidos = body.apellidos.trim();
  if (typeof body.email === 'string' && body.email.trim()) update.email = body.email.trim().toLowerCase();
  if (typeof body.ciudad === 'string') update.ciudad = body.ciudad.trim() || null;

  const hasExtra = body.profile_extra && typeof body.profile_extra === 'object' && !Array.isArray(body.profile_extra);
  if (!Object.keys(update).length && !hasExtra) return json({ error: 'nothing_to_update' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    if (update.email) {
      const { data: dupe, error: eDupe } = await sb
        .from('subscribers').select('id').eq('email', update.email).neq('id', session.uid).limit(1);
      if (eDupe) throw eDupe;
      if (dupe && dupe[0]) return json({ error: 'email_in_use' }, { statusCode: 409 });
    }

    let data = null;
    if (Object.keys(update).length) {
      const res = await sb.from('subscribers').update(update).eq('id', session.uid).select('*').single();
      if (res.error) throw res.error;
      data = res.data;
    }

    // Campos extendidos de perfil (tolerante a columna inexistente)
    let extraSaved = false;
    if (hasExtra) {
      const res = await sb.from('subscribers').update({ profile_extra: body.profile_extra }).eq('id', session.uid).select('id, profile_extra').single();
      if (res.error) {
        console.error('subscriber-profile-update profile_extra error (¿falta migración profile_extra?)', res.error.message || res.error);
      } else {
        extraSaved = true;
      }
    }

    if (!data) {
      const res = await sb.from('subscribers').select('*').eq('id', session.uid).single();
      if (!res.error) data = res.data;
    }

    const avatarUrl = await subscriberAvatarUrl(sb, data);
    return json({
      ok: true,
      extra_saved: extraSaved,
      user: {
        id: data && data.id,
        nombre: data && data.nombre,
        apellidos: data && data.apellidos,
        email: data && data.email,
        ciudad: data && data.ciudad,
        avatar_url: avatarUrl,
        profile_extra: (data && data.profile_extra) || (hasExtra ? body.profile_extra : null),
      },
    });
  } catch (e) {
    console.error('subscriber-profile-update error', e);
    return serverError(e);
  }
};
