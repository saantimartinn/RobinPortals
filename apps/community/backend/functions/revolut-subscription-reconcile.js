const { getSupabase } = require('../lib/supabase');
const { syncOne } = require('../lib/revolut-subscription-sync');

// This is the only scheduled task the shared site runs while legacy sites
// still execute their own jobs.
exports.alwaysRun = true;
exports.handler = async () => {
  const sb = getSupabase();
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error: staleError } = await sb.from('revolut_subscription_invoices')
    .update({ billing_status: 'failed', last_error: 'stale_processing_retry' })
    .eq('billing_status', 'processing').lt('updated_at', staleBefore);
  if (staleError) throw staleError;
  let failures = 0;
  let processed = 0;
  for (let offset = 0; ; offset += 20) {
    const { data: rows, error } = await sb.from('revolut_subscriptions').select('*')
      .order('created_at', { ascending: true }).range(offset, offset + 19);
    if (error) throw error;
    for (let start = 0; start < (rows || []).length; start += 5) {
      const group = rows.slice(start, start + 5);
      const results = await Promise.allSettled(group.map((row) => syncOne(sb, row)));
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') processed += 1;
        else { failures += 1; console.error('revolut reconcile failed', group[index].subscriber_id, result.reason?.message); }
      });
    }
    if (!rows || rows.length < 20) break;
  }
  console.log('revolut subscription reconcile', { processed, failures });
  return { statusCode: failures ? 500 : 204, body: '' };
};
