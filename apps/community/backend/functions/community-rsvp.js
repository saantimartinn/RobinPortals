/**
 * POST /api/community/rsvp  Body: { event_id, status: 'going'|'interested'|'cancelled' }
 * Upsert de asistencia del suscriptor a un evento de comunidad.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { getFriendIds } = require('../lib/social');

const VALID = ['going', 'interested', 'cancelled'];

async function notifyFriendsOfRsvp(sb, uid, eventId) {
  const friendIds = await getFriendIds(sb, uid);
  if (!friendIds.length) return;
  const { data: me } = await sb.from('subscribers').select('nombre, apellidos, email').eq('id', uid).single();
  const { data: ev } = await sb.from('community_events').select('title').eq('id', eventId).single();
  const who = `${(me && me.nombre) || ''} ${(me && me.apellidos) || ''}`.trim() || (me && me.email) || 'Un amigo';
  const evTitle = (ev && ev.title) || 'un evento';
  const title = 'Un amigo se ha apuntado a un evento';
  const content = `${who} se ha apuntado a "${evTitle}". ¡Ap\u00fantate t\u00fa tambi\u00e9n y coincid\u00eds!`;
  const { data: notif, error: e1 } = await sb.from('notifications')
    .insert({ title, content, type: 'info', created_by: 'system:friend-rsvp' })
    .select('id').single();
  if (e1 || !notif) return;
  const rows = friendIds.map((fid) => ({ notification_id: notif.id, user_id: fid, status: 'pending' }));
  await sb.from('notification_recipients').insert(rows);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const eventId = body.event_id;
  const status = VALID.includes(body.status) ? body.status : 'going';
  if (!eventId) return json({ error: 'missing_event_id' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('event_rsvps')
      .upsert({ event_id: eventId, user_id: session.uid, status }, { onConflict: 'event_id,user_id' });
    if (error) throw error;

    // Avisar a los amigos cuando el usuario se apunta ('going') — pop-up al iniciar sesión.
    if (status === 'going') {
      try { await notifyFriendsOfRsvp(sb, session.uid, eventId); } catch (e) { console.error('notifyFriends error', e); }
    }

    return json({ ok: true, status });
  } catch (e) {
    console.error('community-rsvp error', e);
    return serverError(e);
  }
};
