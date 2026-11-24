const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../lib/auth');
const { json } = require('../../lib/http');

exports.alwaysRun = true;
exports.handler = async event => {
  let scheduled = false;
  try { scheduled = Boolean(JSON.parse(event?.body || '').next_run); } catch (_) {}
  if (!scheduled) return json({ error: 'not_found' }, { statusCode: 404 });
  if (process.env.CONTEXT !== 'production') return json({ skipped: 'not_production' });
  try {
    const { getAdminSupabase } = require('../../lib/admin-supabase');
    const { rows } = require('../../lib/lead-reactivation');
    const { CAMPAIGN_ID } = require('../../lib/lead-reactivation-content');
    const settings = await rows(getAdminSupabase().from('crm_reactivation_settings').select('enabled,activated_at').eq('campaign_id', CAMPAIGN_ID).single());
    if (!settings.enabled || !settings.activated_at) return json({ enabled: false });
    // Scheduled functions have a 30-second limit. The authenticated background
    // worker has 15 minutes for calendar/Gmail checks and provider rate limits.
    const token = jwt.sign({ run_at: new Date().toISOString() }, getJwtSecret('crm-reactivation-worker'), { algorithm: 'HS256', audience: 'crm-reactivation-worker', expiresIn: '5m' });
    const response = await fetch('https://robinportals.netlify.app/.netlify/functions/admin-lead-reactivation-background', { method: 'POST', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (response.status !== 202) throw new Error('background_dispatch_failed');
    return json({ queued: true });
  } catch (error) {
    console.error(JSON.stringify({ operation: 'crm.reactivation_30d', error: error.code || 'reactivation_failed' }));
    return json({ error: 'reactivation_failed' }, { statusCode: 500 });
  }
};
