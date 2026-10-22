/**
 * /api/messages · Mensajería directa entre amigos (The Robin Plan).
 *   GET  /api/messages            -> { conversations[], unread_total }
 *   GET  /api/messages?with=<uid> -> { messages[] } (marca como leídos los recibidos)
 *   POST { to, body }             -> envía mensaje (solo si sois amigos)
 * Gate: sesión de suscriptor.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { getFriendIds, areFriends } = require('../lib/social');
const { isSubscriberRole, subscriberDisplayName } = require('../lib/principal');

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!isSubscriberRole(session.role)) return json({ error: 'forbidden' }, { statusCode: 403 });
  const uid = session.uid;

  try {
    const sb = getSupabase();

    if (event.httpMethod === 'POST') {
      if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
      const body = parseJsonBody(event) || {};
      const to = body.to;
      const text = (body.body || '').trim();
      if (!to || !text) return json({ error: 'missing_fields' }, { statusCode: 400 });
      if (to === uid) return json({ error: 'bad_target' }, { statusCode: 400 });
      const friends = await areFriends(sb, uid, to);
      if (!friends) return json({ error: 'not_friends' }, { statusCode: 403 });
      const { data: msg, error } = await sb.from('direct_messages')
        .insert({ sender_id: uid, recipient_id: to, body: text.slice(0, 4000) })
        .select('*').single();
      if (error) throw error;
      return json({ ok: true, message: msg });
    }

    if (event.httpMethod !== 'GET') return methodNotAllowed(['GET', 'POST']);

    const params = event.queryStringParameters || {};
    const withId = params.with;

    if (withId) {
      if (!(await areFriends(sb, uid, withId))) return json({ error: 'not_friends' }, { statusCode: 403 });
      const { data: msgs } = await sb.from('direct_messages')
        .select('id, sender_id, recipient_id, body, created_at, read_at')
        .or(`and(sender_id.eq.${uid},recipient_id.eq.${withId}),and(sender_id.eq.${withId},recipient_id.eq.${uid})`)
        .order('created_at', { ascending: true })
        .limit(500);
      // marcar como leídos los recibidos
      await sb.from('direct_messages').update({ read_at: new Date().toISOString() })
        .eq('sender_id', withId).eq('recipient_id', uid).is('read_at', null);
      return json({ messages: msgs || [] });
    }

    // Lista de conversaciones = amigos + último mensaje + no leídos
    const friendIds = await getFriendIds(sb, uid);
    if (!friendIds.length) return json({ conversations: [], unread_total: 0 });

    const { data: fusers } = await sb.from('subscribers')
      .select('id, nombre, apellidos, email, username, avatar_url')
      .in('id', friendIds);
    const nameById = {}; (fusers || []).forEach((u) => { nameById[u.id] = u; });

    const { data: allMsgs } = await sb.from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(1000);

    const convByFriend = {};
    let unreadTotal = 0;
    (allMsgs || []).forEach((m) => {
      const other = m.sender_id === uid ? m.recipient_id : m.sender_id;
      if (!friendIds.includes(other)) return;
      if (!convByFriend[other]) convByFriend[other] = { last: m, unread: 0 };
      if (m.recipient_id === uid && !m.read_at) { convByFriend[other].unread++; unreadTotal++; }
    });

    const conversations = friendIds.map((fid) => {
      const u = nameById[fid] || {};
      const c = convByFriend[fid] || { last: null, unread: 0 };
      return {
        friend_id: fid,
        name: subscriberDisplayName(u),
        avatar_url: u.avatar_url || null,
        last_body: c.last ? c.last.body : null,
        last_at: c.last ? c.last.created_at : null,
        unread: c.unread,
      };
    }).sort((a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0));

    return json({ conversations, unread_total: unreadTotal });
  } catch (e) {
    console.error('messages error', e);
    return serverError(e);
  }
};
