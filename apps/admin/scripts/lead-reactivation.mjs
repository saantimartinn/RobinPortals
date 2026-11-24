// Read-only by default. Activation is a separate, explicit operator step after
// reviewing the fixed-recipient test, installing the migration and publishing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readEnvFile } from '../../../site/dotenv.mjs';

const require = createRequire(import.meta.url);
const app = fileURLToPath(new URL('..', import.meta.url));
Object.assign(process.env, readEnvFile(resolve(app, '.env')));
const { getAdminSupabase } = require('../lib/admin-supabase');
const { rows } = require('../lib/lead-reactivation');
const { CAMPAIGN_ID, ineligibleReason } = require('../lib/lead-reactivation-content');
const args = process.argv.slice(2);
const index = args.indexOf('--cohort');
const cohort = index >= 0 ? JSON.parse(readFileSync(resolve(args[index + 1]), 'utf8')) : null;
if (cohort && (cohort.campaign_id !== CAMPAIGN_ID || !Array.isArray(cohort.lead_ids) || !cohort.lead_ids.every(id => /^[a-f0-9-]{36}$/i.test(id)))) throw new Error('Invalid confirmed cohort file');

const db = getAdminSupabase();
const leads = [];
for (let offset = 0; ; offset += 500) {
  const page = await rows(db.from('crm_leads').select('*').order('id').range(offset, offset + 499));
  leads.push(...page);
  if (page.length < 500) break;
}
const confirmed = cohort?.lead_ids || [];
const report = {};
for (const lead of leads.filter(lead => (!lead.crm_stage || lead.crm_stage === 'Por contactar') && !(lead.owner_names || []).some(Boolean) && Date.now() - Date.parse(lead.source_created_at || lead.created_at) > 30 * 86400000)) {
  const reason = ineligibleReason(lead, new Date(), confirmed) || 'candidate'; report[reason] = (report[reason] || 0) + 1;
}
console.log(JSON.stringify({ mode: args.includes('--activate') ? 'activation-preflight' : 'read-only', confirmedCurrentLeads: confirmed.length, preliminarySelection: report }));
if (args.includes('--activate')) {
  if (!args.includes('--approve-test')) throw new Error('Review the test email first, then explicitly pass --approve-test');
  if (!cohort) throw new Error('Pass the owner-confirmed current cohort with --cohort');
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET) throw new Error('Configure Resend sending and signed delivery events before activation');
  const { getGmailReadAccessToken } = require('../lib/google-gmail');
  const { listWebBookings } = require('../lib/google-calendar');
  await getGmailReadAccessToken();
  await listWebBookings(new Date().toISOString(), new Date(Date.now() + 180 * 86400000).toISOString());
  const response = await fetch('https://project-robin.com/api/admin/crm/reactivation-unsubscribe?test=1', { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !(await response.text()).includes('No estás inscrito')) throw new Error('Publish and check the unsubscribe route before activation');
  const settings = await rows(db.from('crm_reactivation_settings').select('*').eq('campaign_id', CAMPAIGN_ID).single());
  const ids = [...new Set([...(settings.confirmed_holanda_lead_ids || []), ...confirmed])];
  await rows(db.from('crm_reactivation_settings').update({ confirmed_holanda_lead_ids: ids, activated_at: settings.activated_at || new Date().toISOString(), enabled: true, updated_at: new Date().toISOString() }).eq('campaign_id', CAMPAIGN_ID));
  console.log(JSON.stringify({ enabled: true, directEmailsSent: 0, nextStep: 'The scheduled 20:00 Europe/Madrid turn enrolls eligible leads.' }));
}
