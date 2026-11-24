const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../lib/auth');
const { runReactivation } = require('../../lib/lead-reactivation');
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { rows } = require('../../lib/lead-reactivation');
const { CAMPAIGN_ID } = require('../../lib/lead-reactivation-content');
const { json } = require('../../lib/http');

exports.handler = async event => {
  if (process.env.CONTEXT !== 'production') return json({ skipped: 'not_production' });
  let job;
  try {
    const token = String(event.headers?.authorization || event.headers?.Authorization || '').replace(/^Bearer /, '');
    job = jwt.verify(token, getJwtSecret('crm-reactivation-worker'), { audience: 'crm-reactivation-worker', algorithms: ['HS256'] });
    if (!Number.isFinite(Date.parse(job.run_at))) throw new Error('invalid_run');
  } catch (_) { return json({ error: 'unauthorized' }, { statusCode: 401 }); }
  try {
    const result = await runReactivation({ now: new Date(job.run_at) });
    await rows(getAdminSupabase().from('crm_reactivation_settings').update({ last_run_at: new Date().toISOString(), last_error: result.blocked || null }).eq('campaign_id', CAMPAIGN_ID));
    console.log(JSON.stringify({ operation: 'crm.reactivation_30d', ...result }));
    return json(result);
  } catch (error) {
    try { await rows(getAdminSupabase().from('crm_reactivation_settings').update({ last_run_at: new Date().toISOString(), last_error: error.code || 'integration_unavailable' }).eq('campaign_id', CAMPAIGN_ID)); } catch (_) {}
    throw error;
  }
};
