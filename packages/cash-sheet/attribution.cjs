const { runInApp } = require('../../site/app-env.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ATTRIBUTION_FIELDS = ['source', 'utm_source', 'ad_id', 'campaign_id', 'campaign_name', 'utm_campaign'];

async function attributionForUser(user, supplied, crmClient) {
  if (ATTRIBUTION_FIELDS.some((field) => supplied?.[field])) return supplied;
  const ids = [user?.notion_page_id, user?.lead_id].filter((value) => UUID.test(String(value || '')));
  const numericId = /^\d+$/.test(String(user?.lead_id || '')) ? Number(user.lead_id) : null;
  if (!ids.length && numericId === null) return {};

  const crm = crmClient || runInApp('admin', () => {
    if (!(process.env.ADMIN_SUPABASE_URL || process.env.VITE_SUPABASE_URL) ||
        !process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY) return null;
    return require('../../apps/admin/lib/admin-supabase').getAdminSupabase();
  });
  if (!crm) return {};

  for (const id of new Set(ids)) {
    const { data, error } = await crm.from('crm_leads').select('source_payload').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) return data.source_payload || {};
  }
  if (numericId !== null) {
    const { data, error } = await crm.from('crm_leads').select('source_payload')
      .eq('notion_numeric_id', numericId).maybeSingle();
    if (error) throw error;
    if (data) return data.source_payload || {};
  }
  return {};
}

module.exports = { attributionForUser };
