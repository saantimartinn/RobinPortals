const { getSupabase } = require('../../lib/supabase');
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { findAdminForSession } = require('../../lib/admin-auth');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { requestRecommenderHistory } = require('../../../../shared/recommender-history.cjs');

async function findLead(id) {
  const { data, error } = await getAdminSupabase().from('crm_leads').select('id,email').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

function createHandler({
  readSession = readSessionFromEvent,
  findAdmin = (session) => findAdminForSession(getSupabase(), session),
  findLead: lookupLead = findLead,
  queryHistory = (email) => requestRecommenderHistory(email, process.env.WEBSITE_LEAD_INGEST_SECRET),
} = {}) {
  return async (event) => {
    if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
    const session = readSession(event);
    if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
    try {
      const admin = await findAdmin(session);
      if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
      const leadId = String(event.queryStringParameters?.leadId || '').trim();
      if (!leadId) return json({ error: 'lead_id_required' }, { statusCode: 400 });
      const lead = await lookupLead(leadId);
      if (!lead) return json({ error: 'lead_not_found' }, { statusCode: 404 });
      const email = String(lead.email || '').trim().toLowerCase();
      if (!email) return json({ count: 0, latest: null });
      const history = await queryHistory(email);
      return json({ count: history.count, latest: history.sessions[0] || null });
    } catch (error) {
      return serverError(error, 'admin_crm_recommender');
    }
  };
}

exports.createHandler = createHandler;
exports.handler = createHandler();
