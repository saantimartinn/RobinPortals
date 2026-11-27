const { canManageClient } = require('../../lib/client-access');
/**
 * /api/admin/notifications
 *   GET  -> lista notificaciones (con destinatarios y su estado) — para el panel de seguimiento
 *   POST -> { title, content, type: 'info'|'terms', user_ids: [uuid...] }  crea la notificación
 */
const { parseMadridDateTime } = require('../../../../packages/notifications/schedule.cjs');
const { enqueue, preview, resolveIds } = require('../../../../packages/notifications/push-jobs.cjs');
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin, normalizeEmail } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

async function getAdmin(sb, uid) {
  const { data: admin, error } = await sb
    .from('users')
    .select('id, email, username, role')
    .eq('id', uid)
    .single();
  if (error || !admin) return null;
  const email = normalizeEmail(admin);
  const isAdmin = isApplicationAdmin(admin);
  if (!isAdmin) return null;
  return { ...admin, email };
}

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  try {
    const sb = getSupabase();
    const admin = await getAdmin(sb, session.uid);
    if (!admin) return json({ error: 'forbidden' }, { statusCode: 403 });

    // ---------- GET: listado + estado por destinatario ----------
    if (event.httpMethod === 'GET') {
      const { data: notifs, error } = await sb
        .from('notifications')
        .select('id, title, content, type, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (notifs || []).map((n) => n.id);
      let recipients = [];
      if (ids.length) {
        const { data: recs } = await sb
          .from('notification_recipients')
          .select('id, notification_id, user_id, status, seen_at, accepted_at')
          .in('notification_id', ids);
        recipients = recs || [];
      }
      // Nombres de los destinatarios
      const uids = Array.from(new Set(recipients.map((r) => r.user_id)));
      let usersById = {};
      if (uids.length) {
        const { data: us } = await sb
          .from('users')
          .select('id, nombre, apellidos, email, lead_id')
          .in('id', uids);
        (us || []).forEach((u) => { usersById[u.id] = u; });
      }
      const out = (notifs || []).map((n) => {
        const recs = recipients
          .filter((r) => r.notification_id === n.id)
          .map((r) => ({
            user_id: r.user_id,
            status: r.status,
            seen_at: r.seen_at,
            accepted_at: r.accepted_at,
            nombre: usersById[r.user_id]?.nombre || '',
            apellidos: usersById[r.user_id]?.apellidos || '',
            email: usersById[r.user_id]?.email || '',
            lead_id: usersById[r.user_id]?.lead_id || '',
          }));
        const total = recs.length;
        const done = recs.filter((r) => r.status === (n.type === 'terms' ? 'accepted' : 'seen') || r.status === 'accepted').length;
        return { ...n, recipients: recs, total, done };
      });
      const { data: scheduled, error: scheduledError } = await sb.from('scheduled_notifications').select('id,title,content,scheduled_at,status,created_at,push_accepted,push_rejected,push_review').order('created_at', { ascending: false }).limit(100);
      if (scheduledError) throw scheduledError;
      return json({ notifications: out, scheduled: scheduled || [] });
    }

    // ---------- POST: crear notificación ----------
    if (event.httpMethod === 'POST') {
      if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
      const body = parseJsonBody(event) || {};
      if (body.action === 'cancel' && /^[a-f0-9-]{36}$/i.test(body.id || '')) {
        const { data, error } = await sb.from('scheduled_notifications').update({ status: 'cancelled' }).eq('id', body.id).eq('status', 'pending').select('id').maybeSingle();
        if (error) throw error;
        return data ? json({ cancelled: true }) : json({ error: 'not_pending' }, { statusCode: 409 });
      }
      const title = (body.title || '').trim();
      const content = (body.content || '').trim();
      const type = body.type === 'terms' ? 'terms' : 'info';
      const audience = ['installed', 'all'].includes(body.audience) ? { mode: body.audience } : { mode: 'selected', user_ids: Array.isArray(body.user_ids) ? body.user_ids.filter(Boolean) : [] };
      if (body.action === 'preview') {
        if (audience.mode === 'selected' && !audience.user_ids.length) return json({ recipients: 0, devices: 0 });
        return json(await preview(sb, audience, 'users', user => !isApplicationAdmin(user)));
      }
      const userIds = await resolveIds(sb, audience, 'users', user => !isApplicationAdmin(user));
      if (!title) return json({ error: 'missing_title' }, { statusCode: 400 });
      if (!content) return json({ error: 'missing_content' }, { statusCode: 400 });
      if (!userIds.length) return json({ error: 'no_recipients' }, { statusCode: 400 });
      for (const userId of userIds) if (!await canManageClient(sb, admin, userId)) return json({ error: 'client_not_assigned' }, { statusCode: 403 });
      if (body.scheduled_local) {
        const scheduledAt = parseMadridDateTime(body.scheduled_local);
        if (scheduledAt.getTime() <= Date.now()) return json({ error: 'schedule_in_past' }, { statusCode: 400 });
        const scheduled = await enqueue(sb, { title, content, type, audience, scheduledAt, createdBy: admin.email });
        return json({ scheduled, recipients: userIds.length });
      }

      const { data: notif, error: e1 } = await sb
        .from('notifications')
        .insert({ title, content, type, created_by: admin.email })
        .select()
        .single();
      if (e1) return json({ error: 'insert_failed', detail: e1.message }, { statusCode: 500 });

      const rows = userIds.map((uid) => ({
        notification_id: notif.id,
        user_id: uid,
        status: 'pending',
      }));
      const { error: e2 } = await sb.from('notification_recipients').insert(rows);
      if (e2) return json({ error: 'recipients_failed', detail: e2.message }, { statusCode: 500 });

      await enqueue(sb, { title, content, type, audience: { mode: 'selected', user_ids: userIds }, createdBy: admin.email, notificationId: notif.id });
      return json({ notification: notif, recipients: userIds.length });
    }

    return methodNotAllowed(['GET', 'POST']);
  } catch (e) {
    console.error('admin-notifications error', e);
    return serverError(e);
  }
};
