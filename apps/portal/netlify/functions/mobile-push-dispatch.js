const { getSupabase } = require('../../lib/supabase');
const { isApplicationAdmin } = require('../../lib/authorization');
const { runDue } = require('../../../../packages/notifications/push-jobs.cjs');
const { json } = require('../../lib/http');
exports.handler = async event => {
  let scheduled = false;
  try { scheduled = Boolean(JSON.parse(event.body || '{}').next_run); } catch (_) {}
  if (!scheduled || process.env.CONTEXT !== 'production') return { statusCode: 404 };
  try { const result = await runDue(getSupabase(), { product: 'portal', table: 'users', isClient: user => !isApplicationAdmin(user) }); return json(result); }
  catch (error) { console.error('mobile_push_dispatch', error.message); return { statusCode: 500 }; }
};
