// Read-only inventory for the Llegada transfer. This tool never writes to either database.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readEnvFile } from '../site/dotenv.mjs';

const normalize = value => String(value || '').trim().toLowerCase();
export function planArrivalAccounts(users, subscribers) {
  return users.filter(user => normalize(user.tipo) === 'llegada').map(user => {
    const matches = subscribers.filter(target => target.id === user.id
      || (user.lead_id && target.lead_id === user.lead_id)
      || (user.email && normalize(target.email) === normalize(user.email))
      || (user.username && normalize(target.username) === normalize(user.username)));
    const credentialFormat = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password_hash || '') ? 'bcrypt' : user.password_hash ? 'unsupported' : 'missing';
    const blocked = (normalize(user.role) && normalize(user.role) !== 'client') ? 'staff_identity'
      : matches.length ? 'existing_target_requires_review'
        : credentialFormat !== 'bcrypt' ? 'credential_review_required' : null;
    return {
      sourceId: user.id, targetId: matches[0]?.id || user.id, category: 'llegada',
      action: blocked ? 'review' : 'create', blocked, credentialFormat,
      onboarding: { requires_onboarding: !!user.requires_onboarding, dni_completed: !!user.dni_completed,
        profile_completed: !!user.profile_completed, contract_signed: !!user.contract_signed, pago_completed: !!user.pago_completed },
      preserve: ['credentials', 'contract', 'payment_amounts', 'payment_status', 'advisor', 'history', 'storage_files'],
    };
  });
}

async function pages(query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query(offset);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}
async function storageInventory(source, userIds) {
  const { data: buckets, error } = await source.storage.listBuckets();
  if (error) throw error;
  let files = 0, bytes = 0;
  async function list(bucket, prefix) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await source.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      for (const object of data || []) {
        if (!object.id) await list(bucket, `${prefix}/${object.name}`);
        else { files++; bytes += Number(object.metadata?.size || 0); }
      }
      if (!data || data.length < 1000) break;
    }
  }
  for (const bucket of buckets || []) for (const userId of userIds) await list(bucket.id, userId);
  return { files, bytes, copied: false };
}

export async function previewArrivalTransfer() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const sourceEnv = readEnvFile(resolve(root, 'apps/portal/.env'));
  const targetEnv = readEnvFile(resolve(root, 'apps/community/.env'));
  if (!sourceEnv.SUPABASE_URL || !targetEnv.SUPABASE_URL || sourceEnv.SUPABASE_URL === targetEnv.SUPABASE_URL) throw new Error('Two distinct source and target databases are required');
  const require = createRequire(import.meta.url);
  const { createClient } = require('../apps/community/node_modules/@supabase/supabase-js');
  const client = env => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const source = client(sourceEnv), target = client(targetEnv);
  const [users, subscribers, schemaResponse] = await Promise.all([
    pages(offset => source.from('users').select('*').ilike('tipo', 'llegada').order('id').range(offset, offset + 999)),
    pages(offset => target.from('subscribers').select('id,lead_id,email,username,role').order('id').range(offset, offset + 999)),
    fetch(`${sourceEnv.SUPABASE_URL}/rest/v1/`, { headers: { apikey: sourceEnv.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${sourceEnv.SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/openapi+json' } }),
  ]);
  if (!schemaResponse.ok) throw new Error(`Source schema metadata HTTP ${schemaResponse.status}`);
  const schema = await schemaResponse.json();
  if (!schema.definitions?.users) throw new Error('Source table metadata is unavailable');
  const accounts = planArrivalAccounts(users, subscribers);
  const userIds = accounts.filter(account => account.blocked !== 'staff_identity').map(account => account.sourceId);
  const history = {}, rowsByTable = new Map();
  if (userIds.length) {
    for (const [table, definition] of Object.entries(schema.definitions)) {
      if (!definition.properties?.user_id || table === 'users') continue;
      const rows = await pages(offset => source.from(table).select('*').in('user_id', userIds).order('user_id').range(offset, offset + 999));
      history[table] = rows.length;
      rowsByTable.set(table, rows);
    }
    // Preserve indirect history and the shared reference records it depends on.
    for (const [table, column, parent, parentColumn] of [
      ['holded_invoice_claims', 'payment_id', 'payments', 'id'],
      ['notifications', 'id', 'notification_recipients', 'notification_id'],
      ['career_templates', 'id', 'client_careers', 'career_template_id'],
    ]) {
      if (!schema.definitions[table]) continue;
      const ids = [...new Set((rowsByTable.get(parent) || []).map(row => row[parentColumn]).filter(Boolean))];
      const rows = ids.length ? await pages(offset => source.from(table).select('*').in(column, ids).order(column).range(offset, offset + 999)) : [];
      history[table] = rows.length;
    }
  }
  const storage = userIds.length ? await storageInventory(source, userIds) : { files: 0, bytes: 0, copied: false };
  return {
    mode: 'preview-only', generatedAt: new Date().toISOString(),
    accounts: accounts.length, readyForPreparation: accounts.filter(account => !account.blocked).length,
    requiresReview: accounts.filter(account => account.blocked).map(account => ({ reason: account.blocked, credentialFormat: account.credentialFormat })),
    incompleteOnboarding: accounts.filter(account => account.onboarding.requires_onboarding).length,
    history, storage, sourceDeleted: false, targetWritten: false,
    pendingBeforeCutover: ['Stage and verify complete row copies and storage checksums', 'Reconcile operational logs without a user foreign key', 'Verify native login, account switching and all pending onboarding steps', 'Retarget booking, payment, webhook and admin writes before disabling the previous identity'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).length) throw new Error('This command is read-only and accepts no apply flag');
  try { console.log(JSON.stringify(await previewArrivalTransfer(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
