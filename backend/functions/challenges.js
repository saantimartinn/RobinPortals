/**
 * /api/challenges · Retos para acelerar el plan (The Robin Plan).
 *   GET  -> { challenges[], submissions{ challenge_id: {...} } }
 *   POST { action:'submit', challenge_id, answers, files } -> entrega (pendiente de validar)
 * Gate: sesión de suscriptor. La validación (y aplicación de días) la hace el admin.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

function isSub(role) { return role === 'subscriber' || role === 'subscriber_admin'; }
const MAX_FILES = 8;
const MAX_FILE_CHARS = 3_000_000; // ~2.2MB por archivo (base64)

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!isSub(session.role)) return json({ error: 'forbidden' }, { statusCode: 403 });
  const uid = session.uid;

  try {
    const sb = getSupabase();
    const params = event.queryStringParameters || {};
    if (event.httpMethod === 'GET' && params.resource === 'faqs') {
      let query = sb.from('subscription_faqs').select('id, question, answer, category, published, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      if (session.role !== 'subscriber_admin') query = query.eq('published', true);
      const { data, error } = await query;
      if (error) throw error;
      return json({ faqs: data || [] });
    }

    if (event.httpMethod === 'POST') {
      if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
      const body = parseJsonBody(event) || {};
      if (body.action !== 'submit') return json({ error: 'bad_action' }, { statusCode: 400 });
      const challengeId = body.challenge_id;
      if (!challengeId) return json({ error: 'missing_challenge' }, { statusCode: 400 });

      const { data: ch } = await sb.from('challenges').select('id, active').eq('id', challengeId).single();
      if (!ch || ch.active === false) return json({ error: 'challenge_not_available' }, { statusCode: 404 });

      // No re-entregar si ya está validado
      const { data: existing } = await sb.from('challenge_submissions')
        .select('id, status').eq('challenge_id', challengeId).eq('user_id', uid).limit(1);
      const cur = existing && existing[0];
      if (cur && cur.status === 'validated') return json({ error: 'already_validated' }, { statusCode: 409 });

      const answers = (body.answers && typeof body.answers === 'object') ? body.answers : {};
      let files = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
      files = files
        .filter((f) => f && f.data_url && typeof f.data_url === 'string' && f.data_url.length <= MAX_FILE_CHARS)
        .map((f) => ({ name: String(f.name || 'archivo').slice(0, 160), data_url: f.data_url }));

      const row = {
        challenge_id: challengeId, user_id: uid,
        answers, files, status: 'pending', note: null,
        validated_at: null, created_at: new Date().toISOString(),
      };
      const { data: saved, error } = await sb.from('challenge_submissions')
        .upsert(row, { onConflict: 'challenge_id,user_id' })
        .select('*').single();
      if (error) throw error;
      return json({ ok: true, submission: saved });
    }

    if (event.httpMethod !== 'GET') return methodNotAllowed(['GET', 'POST']);

    const { data: challenges } = await sb.from('challenges')
      .select('id, title, description, advance_days, files, questions, active, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    const { data: subs } = await sb.from('challenge_submissions')
      .select('challenge_id, status, answers, files, note, created_at, validated_at')
      .eq('user_id', uid);
    const byChallenge = {};
    (subs || []).forEach((s) => { byChallenge[s.challenge_id] = s; });

    return json({ challenges: challenges || [], submissions: byChallenge });
  } catch (e) {
    console.error('challenges error', e);
    return serverError(e);
  }
};
