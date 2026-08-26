/**
 * POST /api/subscriber/profile  Body: { nombre?, apellidos?, email?, ciudad?, avatar_url? }
 * Edición mínima de perfil para suscriptores (Ajustes). Email duplicado → 409.
 *
 * avatar_url: foto de perfil (data URL base64 ya redimensionada en cliente). Se guarda
 * en users.avatar_url. Se actualiza por separado para que, si la columna aún no existe
 * (migración pendiente), no rompa el guardado del resto de campos.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const update = {};
  if (typeof body.nombre === 'string') update.nombre = body.nombre.trim();
  if (typeof body.apellidos === 'string') update.apellidos = body.apellidos.trim();
  if (typeof body.email === 'string' && body.email.trim()) update.email = body.email.trim().toLowerCase();
  if (typeof body.ciudad === 'string') update.ciudad = body.ciudad.trim() || null;

  const hasAvatar = typeof body.avatar_url === 'string';
  const hasExtra = body.profile_extra && typeof body.profile_extra === 'object' && !Array.isArray(body.profile_extra);
  if (!Object.keys(update).length && !hasAvatar && !hasExtra) return json({ error: 'nothing_to_update' }, { statusCode: 400 });

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

    // Avatar por separado (tolerante a columna inexistente)
    let avatarSaved = false;
    let avatarUrl = null;
    if (hasAvatar) {
      const val = body.avatar_url ? String(body.avatar_url) : null;
      const res = await sb.from('subscribers').update({ avatar_url: val }).eq('id', session.uid).select('id, avatar_url').single();
      if (res.error) {
        console.error('subscriber-profile-update avatar error (¿falta migración avatar_url?)', res.error.message || res.error);
      } else {
        avatarSaved = true;
        avatarUrl = res.data ? res.data.avatar_url : val;
      }
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

    return json({
      ok: true,
      avatar_saved: avatarSaved,
      extra_saved: extraSaved,
      user: {
        id: data && data.id,
        nombre: data && data.nombre,
        apellidos: data && data.apellidos,
        email: data && data.email,
        ciudad: data && data.ciudad,
        avatar_url: avatarUrl != null ? avatarUrl : (data && data.avatar_url) || null,
        profile_extra: (data && data.profile_extra) || (hasExtra ? body.profile_extra : null),
      },
    });
  } catch (e) {
    console.error('subscriber-profile-update error', e);
    return serverError(e);
  }
};
