/**
 * GET /api/community/events · Próximos eventos de comunidad + estado de RSVP
 * del usuario autenticado (going/interested/null) para cada uno.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError } = require('../lib/http');
const { signedMentorPhotoPaths } = require('../lib/subscriber-avatars');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: events, error } = await sb
      .from('community_events')
      .select('*')
      .eq('active', true)
      .order('starts_at', { ascending: true });
    if (error) throw error;

    const ids = (events || []).map((e) => e.id);
    let rsvpMap = {};
    if (ids.length) {
      const { data: rsvps, error: e2 } = await sb
        .from('event_rsvps').select('event_id, status').eq('user_id', session.uid).in('event_id', ids);
      if (e2) throw e2;
      (rsvps || []).forEach((r) => { rsvpMap[r.event_id] = r.status; });
    }

    const out = (events || []).map((e) => ({ ...e, meta: { ...(e.meta || {}) }, my_rsvp: rsvpMap[e.id] || null }));
    const mentorPaths = out.map((row) => row.meta?.photo_path).filter(Boolean);
    const mentorUrls = await signedMentorPhotoPaths(sb, mentorPaths);
    out.forEach((row) => {
      row.meta.photo = mentorUrls.get(row.meta.photo_path) || (String(row.meta.photo || '').startsWith('data:image/') ? row.meta.photo : '');
      delete row.meta.photo_path;
    });
    return json({ events: out });
  } catch (e) {
    console.error('community-events-list error', e);
    return serverError(e);
  }
};
