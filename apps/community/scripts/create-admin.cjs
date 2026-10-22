// Explicit operator action only. No credentials are stored in SQL or source.
const { getSupabase } = require('../backend/lib/supabase');
const { hashPassword } = require('../backend/lib/auth');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16 || Buffer.byteLength(password) > 72) {
    throw new Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (16+ characters, max 72 UTF-8 bytes).');
  }
  const sb = getSupabase();
  const { error } = await sb.from('subscribers').insert({
    username: email, email, password_hash: hashPassword(password),
    role: 'subscriber_admin', is_subscriber: false, subscription_status: 'none', nombre: 'Admin',
  });
  if (error) throw new Error(`Admin creation failed (${error.code || 'database_error'}). Existing accounts are never overwritten.`);
  console.log('Admin created. Remove ADMIN_PASSWORD from your local environment.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
