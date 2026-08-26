const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { principalTable } = require('../lib/principal');
const { json, methodNotAllowed, serverError } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: u, error } = await sb.from(principalTable(session.role)).select('*').eq('id', session.uid).single();
    if (error || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });
    return json({
      id: u.id,
      lead_id: u.lead_id,
      username: u.username,
      email: u.email,
      role: u.role,
      nombre: u.nombre,
      apellidos: u.apellidos,
      ciudad: u.ciudad || null,
      avatar_url: u.avatar_url || null,
      profile_extra: u.profile_extra || null,
      robin_level_override: u.robin_level_override || null,
      bonus_days: u.bonus_days || 0,
      created_at: u.created_at || null,
      is_subscriber: !!u.is_subscriber,
      subscription_plan: u.subscription_plan || null,
      subscription_status: u.subscription_status || 'none',
      subscription_started_at: u.subscription_started_at || null,
      current_period_end: u.current_period_end || null,
      cancel_at_period_end: !!u.cancel_at_period_end,
    });
  } catch (e) {
    console.error('me error', e);
    return serverError(e);
  }
};
