/**
 * /api/social · Red social de suscriptores (The Robin Plan).
 *   GET  -> { me, directory[], friends[], incoming[], outgoing[] }
 *   POST { action: 'request'|'accept'|'decline'|'cancel'|'remove', target_id }
 * Gate: sesión de suscriptor (role 'subscriber' o 'subscriber_admin').
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

function isSub(role) { return role === 'subscriber' || role === 'subscriber_admin'; }
function displayName(u) { return `${u.nombre || ''} ${u.apellidos || ''}`.trim() || u.email || u.username || 'Robin'; }

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!isSub(session.role)) return json({ error: 'forbidden' }, { statusCode: 403 });
  const uid = session.uid;

  try {
    const sb = getSupabase();

    if (event.httpMethod === 'POST') {
      if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
      const body = parseJsonBody(event) || {};
      const action = body.action;
      const target = body.target_id;
      if (!target || target === uid) return json({ error: 'bad_target' }, { statusCode: 400 });

      // Fila existente en cualquier dirección
      const { data: rows } = await sb.from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${uid},addressee_id.eq.${target}),and(requester_id.eq.${target},addressee_id.eq.${uid})`)
        .limit(1);
      const rel = rows && rows[0];

      if (action === 'request') {
        if (rel) {
          if (rel.status === 'accepted') return json({ ok: true, status: 'accepted' });
          // si el otro ya me había mandado solicitud pendiente -> aceptar
          if (rel.status === 'pending' && rel.addressee_id === uid) {
            await sb.from('friendships').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', rel.id);
            return json({ ok: true, status: 'accepted' });
          }
          // reactivar una declinada que yo envié
          await sb.from('friendships').update({ status: 'pending', requester_id: uid, addressee_id: target, responded_at: null }).eq('id', rel.id);
          return json({ ok: true, status: 'pending' });
        }
        const { error } = await sb.from('friendships').insert({ requester_id: uid, addressee_id: target, status: 'pending' });
        if (error) throw error;
        return json({ ok: true, status: 'pending' });
      }

      if (action === 'accept') {
        if (!rel || rel.addressee_id !== uid || rel.status !== 'pending') return json({ error: 'no_request' }, { statusCode: 400 });
        await sb.from('friendships').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', rel.id);
        return json({ ok: true, status: 'accepted' });
      }
      if (action === 'decline') {
        if (!rel || rel.addressee_id !== uid) return json({ error: 'no_request' }, { statusCode: 400 });
        await sb.from('friendships').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', rel.id);
        return json({ ok: true, status: 'declined' });
      }
      if (action === 'cancel' || action === 'remove') {
        if (rel) await sb.from('friendships').delete().eq('id', rel.id);
        return json({ ok: true, status: 'none' });
      }
      return json({ error: 'bad_action' }, { statusCode: 400 });
    }

    if (event.httpMethod !== 'GET') return methodNotAllowed(['GET', 'POST']);

    // ---- GET: directorio + estados ----
    const { data: subs } = await sb.from('subscribers')
      .select('id, nombre, apellidos, email, username, ciudad, avatar_url')
      .or('is_subscriber.eq.true,role.eq.subscriber')
      .neq('id', uid);

    const { data: rels } = await sb.from('friendships')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    const relByOther = {};
    (rels || []).forEach((r) => {
      const other = r.requester_id === uid ? r.addressee_id : r.requester_id;
      relByOther[other] = r;
    });

    const friends = [], incoming = [], outgoing = [], directory = [];
    (subs || []).forEach((u) => {
      const card = { id: u.id, name: displayName(u), ciudad: u.ciudad || null, avatar_url: u.avatar_url || null };
      const r = relByOther[u.id];
      let status = 'none';
      if (r) {
        if (r.status === 'accepted') status = 'friends';
        else if (r.status === 'pending') status = r.requester_id === uid ? 'outgoing' : 'incoming';
        else status = 'none';
      }
      card.status = status;
      if (status === 'friends') friends.push(card);
      else if (status === 'incoming') incoming.push(card);
      else if (status === 'outgoing') outgoing.push(card);
      directory.push(card);
    });

    return json({ me: { id: uid }, directory, friends, incoming, outgoing });
  } catch (e) {
    console.error('social error', e);
    return serverError(e);
  }
};
