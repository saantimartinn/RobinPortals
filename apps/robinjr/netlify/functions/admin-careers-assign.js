/**
 * POST /api/admin/careers/assign     { user_id, career_template_id }   asigna una carrera al alumno
 * POST /api/admin/careers/unassign   { user_id, career_template_id }   quita la asignación
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { getSessionUser } = require('../../lib/session-user');
const { isApplicationAdmin, normalizeEmail } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  const user_id = body.user_id;
  const ctid = body.career_template_id;
  const action = body.action === 'unassign' ? 'unassign' : 'assign';
  if (!user_id || !ctid) return json({ error: 'missing_fields' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { data: admin } = await getSessionUser(sb, session, 'id, email, username, role');
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const adminEmail = normalizeEmail(admin);
    const isAdmin = isApplicationAdmin(admin);
    if (!isAdmin) return json({ error: 'forbidden' }, { statusCode: 403 });

    if (action === 'unassign') {
      const { error: unassignError } = await sb.from('client_careers').delete().eq('user_id', user_id).eq('career_template_id', ctid);
      if (unassignError) throw unassignError;
      return json({ ok: true });
    }

    // asignar (idempotente)
    const { data: existing } = await sb.from('client_careers').select('id').eq('user_id', user_id).eq('career_template_id', ctid).maybeSingle();
    if (existing) return json({ ok: true, already_assigned: true });

    const { error: e1 } = await sb.from('client_careers').insert({
      user_id, career_template_id: ctid, assigned_by: adminEmail,
    });
    if (e1) throw e1;

    return json({ ok: true });
  } catch (e) {
    console.error('admin-careers-assign error', e);
    return serverError(e);
  }
};
