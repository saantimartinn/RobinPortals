/**
 * Cliente Supabase usado por las Netlify Functions (server-side).
 * Usa la SERVICE ROLE KEY para bypassar RLS — esta key SOLO debe vivir
 * en variables de entorno del servidor, nunca en el frontend.
 */
const { createClient } = require('@supabase/supabase-js');

let _client = null;
function getSupabase() {
  if (_client) return _client;
  const url = process.env.COMMUNITY_SUPABASE_URL;
  const key = process.env.COMMUNITY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('COMMUNITY_SUPABASE_URL o COMMUNITY_SUPABASE_SERVICE_ROLE_KEY no estan configuradas');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

module.exports = { getSupabase };
