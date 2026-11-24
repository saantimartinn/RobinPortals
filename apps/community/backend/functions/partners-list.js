/**
 * GET /api/partners · Directorio autenticado de partners, filtrado por producto.
 */
const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, serverError } = require('../lib/http');
const { readArrivalIdentity } = require('../lib/arrival-access');
const { readApplicationIdentity } = require('../lib/application-permissions');
const { partnersForArrival } = require('../lib/arrival-partners');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event, { allowArrival: true });
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const arrival = session.auth_source === 'application_arrival';
    if (arrival && !await readArrivalIdentity(event, session)) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const linked = !arrival && session.application_uid ? await readApplicationIdentity(event).catch(() => null) : null;
    const hasArrival = arrival || (linked?.id === session.application_uid && linked?.arrival_pack?.contracted === true);
    const sb = getSupabase();
    const { data, error } = await sb.from('partners').select('*').eq('active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    const partners = (data || []).filter(partner => session.role === 'subscriber_admin'
      || (!arrival && (partner.products || ['community']).includes('community'))
      || (hasArrival && (partner.products || []).includes('pack_llegada')));
    return json({ partners: arrival ? partnersForArrival(partners) : partners });
  } catch (e) {
    console.error('partners-list error', e);
    return serverError(e);
  }
};
