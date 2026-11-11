/**
 * POST /api/admin/historial/add
 * Body: { user_id, raw_notes, meeting_date?, meeting_title? }
 *
 * Conserva las notas originales y un resumen de esta reunión en meeting_transcripts.
 * La unión con users.historial es atómica y no reescribe reuniones anteriores.
 * Devuelve el historial actualizado; los fallos de resumen quedan reintentables.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { getSessionUser } = require('../../lib/session-user');
const {
  hasApplicationAdminRole,
  isApplicationAdmin,
  normalizeEmail,
} = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const meetings = require('../../lib/meeting-history');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event) || {};
  const userId = body.user_id;
  const rawNotes = typeof body.raw_notes === 'string' ? body.raw_notes.trim() : '';
  if (rawNotes.length > 600000) return json({ error: 'notes_too_large' }, { statusCode: 413 });
  const meetingDate = body.meeting_date ? new Date(body.meeting_date) : new Date();
  if (Number.isNaN(meetingDate.getTime())) return json({ error: 'invalid_meeting_date' }, { statusCode: 400 });
  if (!userId) return json({ error: 'missing_user_id' }, { statusCode: 400 });
  if (!rawNotes) return json({ error: 'missing_raw_notes' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { data: admin } = await getSessionUser(sb, session, 'id, email, username, role');
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const adminEmail = normalizeEmail(admin);
    const isAdmin = isApplicationAdmin(admin);
    if (!isAdmin) return json({ error: 'forbidden' }, { statusCode: 403 });

    const { data: u, error: eu } = await sb
      .from('users')
      .select('id, assigned_to, historial')
      .eq('id', userId)
      .single();
    if (eu || !u) return json({ error: 'user_not_found' }, { statusCode: 404 });

    // Seguridad: solo el advisor asignado o un admin/supervisor puede tocar el historial.
    if ((u.assigned_to || '').toLowerCase() !== adminEmail && !hasApplicationAdminRole(admin)) {
      return json({ error: 'forbidden_not_assigned' }, { statusCode: 403 });
    }

    const updated = await meetings.service().recordManual({
      userId, advisorEmail: u.assigned_to || adminEmail, text: rawNotes,
      title: String(body.meeting_title || 'Reunión').slice(0,300), meetingAt: meetingDate.toISOString(),
    });

    return json({ ok: true, historial: updated });
  } catch (e) {
    console.error('admin-historial-add error', e);
    return serverError(e);
  }
};
