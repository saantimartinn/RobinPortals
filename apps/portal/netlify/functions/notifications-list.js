/**
 * GET /api/notifications
 * Devuelve las notificaciones PENDIENTES del cliente autenticado (para el pop-up).
 * Sólo status='pending' → una vez vista/aceptada no vuelve a salir.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, methodNotAllowed, serverError } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  try {
    const sb = getSupabase();
    const nativeSummary = event.queryStringParameters?.native === '1';
    let recipientQuery = sb
      .from('notification_recipients')
      .select('notification_id, status')
      .eq('user_id', session.uid);
    recipientQuery = nativeSummary
      ? recipientQuery.in('status', ['pending', 'seen', 'accepted'])
      : recipientQuery.eq('status', 'pending');
    const { data: recs, error } = await recipientQuery;
    if (error) {
      // Tabla aún no creada → sin notificaciones
      return json({ notifications: [] });
    }
    const ids = (recs || []).map((r) => r.notification_id);
    if (!ids.length) return json({ notifications: [] });

    const fields = nativeSummary ? 'id, title, type, event_kind, created_at' : 'id, title, content, type, event_kind, created_at';
    let notifsQuery = sb
      .from('notifications')
      .select(fields)
      .in('id', ids)
      .order('created_at', { ascending: !nativeSummary });
    if (nativeSummary) notifsQuery = notifsQuery.limit(100);
    const { data: notifs, error: e2 } = await notifsQuery;
    if (e2) return json({ notifications: [] });

    if (!nativeSummary) return json({ notifications: notifs || [] });
    const statusById = new Map((recs || []).map((row) => [row.notification_id, row.status]));
    return json({ notifications: (notifs || []).map((notification) => ({
      ...notification,
      status: statusById.get(notification.id) || 'pending',
    })) });
  } catch (e) {
    console.error('notifications-list error', e);
    return serverError(e);
  }
};
