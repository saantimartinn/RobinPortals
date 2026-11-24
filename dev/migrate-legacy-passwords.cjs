#!/usr/bin/env node

const APPS = {
  portal: { envFile: 'apps/portal/.env', table: 'users', hash: 'apps/portal/lib/auth.js' },
  admin: { envFile: 'apps/admin/.env', table: 'users', hash: 'apps/admin/lib/auth.js' },
  robinjr: { envFile: 'apps/robinjr/.env', table: 'users', hash: 'apps/robinjr/lib/auth.js' },
  community: { envFile: 'apps/community/.env', table: 'subscribers', hash: 'apps/community/backend/lib/auth.js' },
};

async function migratePasswords({ sb, table, hashPassword, apply = false, batchSize = 100 }) {
  if (!['users', 'subscribers'].includes(table)) throw new Error('unsupported_table');
  const result = { found: 0, migrated: 0, blocked: 0, conflicts: 0, errors: 0 };
  let cursor = null;

  while (true) {
    let query = sb.from(table).select('id,password_hash').like('password_hash', 'plain:v1:%').order('id').limit(batchSize);
    if (cursor !== null) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      cursor = row.id;
      result.found += 1;
      const password = row.password_hash.slice('plain:v1:'.length);
      if (!password || Buffer.byteLength(password, 'utf8') > 72) {
        result.blocked += 1;
        continue;
      }
      if (!apply) continue;

      const hashed = hashPassword(password);
      const updated = await sb.from(table).update({ password_hash: hashed })
        .eq('id', row.id).eq('password_hash', row.password_hash).select('id').maybeSingle();
      if (updated.error) {
        result.errors += 1;
      } else if (updated.data) {
        result.migrated += 1;
      } else {
        result.conflicts += 1;
      }
    }
    if (data.length < batchSize) break;
  }
  return result;
}

function parseArgs(argv) {
  const options = { apply: false };
  for (const arg of argv) {
    if (arg === '--apply') options.apply = true;
    else if (arg.startsWith('--app=')) options.app = arg.slice(6);
    else if (arg.startsWith('--expect-url=')) options.expectUrl = arg.slice(13);
    else throw new Error('usage: node dev/migrate-legacy-passwords.cjs --app=<portal|admin|robinjr|community> --expect-url=https://<project>.supabase.co [--apply]');
  }
  if (!APPS[options.app] || !options.expectUrl) throw new Error('usage: node dev/migrate-legacy-passwords.cjs --app=<portal|admin|robinjr|community> --expect-url=https://<project>.supabase.co [--apply]');
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = APPS[options.app];
  const fs = require('node:fs');
  const path = require('node:path');
  const envPath = path.resolve(__dirname, '..', app.envFile);
  if (!fs.existsSync(envPath)) throw new Error(`private environment file not found for ${options.app}`);
  process.loadEnvFile(envPath);
  if (process.env.SUPABASE_URL !== options.expectUrl) throw new Error('SUPABASE_URL does not match --expect-url');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(options.expectUrl)) throw new Error('expected URL must be a Supabase project URL');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) throw new Error('service role key is not configured');
  const { createClient } = require(require.resolve('@supabase/supabase-js', {
    paths: [path.resolve(__dirname, '../apps/admin')],
  }));
  const hashPassword = require(path.resolve(__dirname, '..', app.hash)).hashPassword;
  const sb = createClient(options.expectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const counts = await migratePasswords({ sb, table: app.table, hashPassword, apply: options.apply });
  console.log(JSON.stringify({ app: options.app, mode: options.apply ? 'apply' : 'preview', ...counts }));
  if (counts.blocked || counts.conflicts || counts.errors) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || 'password migration failed');
    process.exitCode = 1;
  });
}

module.exports = { migratePasswords, parseArgs };
