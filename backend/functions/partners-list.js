/**
 * GET /api/partners  · Directorio de partners para suscriptores (autenticado).
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('partners').select('*').eq('active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return json({ partners: data || [] });
  } catch (e) {
    console.error('partners-list error', e);
    return serverError(e);
  }
};
