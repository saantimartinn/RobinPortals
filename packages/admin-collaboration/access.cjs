const { runInApp } = require('../../site/app-env.cjs');
const { isProAdmin } = require('../../apps/admin/lib/admin-profiles');

const emailOf = actor => String(actor?.email || actor?.username || '').trim().toLowerCase();
const isAdmin = actor => ['admin', 'supervisor', 'application_admin'].includes(String(actor?.role || '').toLowerCase()) || actor?.is_application_admin === true || isProAdmin(actor);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function applicationDatabase() {
  return runInApp('admin', () => require('../../apps/admin/lib/supabase').getSupabase());
}

function sourceDatabase(portal) {
  if (portal === 'portal') return runInApp('admin', () => require('../../apps/admin/lib/supabase').getSupabase());
  if (portal === 'robinjr') return runInApp('admin', () => require('../../apps/admin/lib/junior-supabase').getJuniorSupabase());
  if (portal === 'community') return runInApp('admin', () => require('../../apps/admin/lib/subscriptions-supabase').getSubscriptionsSupabase());
  throw Object.assign(new Error('invalid_portal'), { statusCode: 400 });
}

async function checked(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function sharedGrants(actor, portal, db) {
  if (!isAdmin(actor)) return [];
  if (isProAdmin(actor)) return [];
  db ||= applicationDatabase();
  const user = await checked(db.from('users').select('id,email,role').eq('email', emailOf(actor)).maybeSingle());
  if (!user || !isAdmin(user)) return [];
  return await checked(db.from('admin_client_shares').select('client_id,owner_email,created_at').eq('admin_id', user.id).eq('portal', portal)) || [];
}

// Ownership and the calendar continue to be represented by assigned_to. A grant
// is usable only while that same PRO still owns the client; stale grants cannot
// follow a client who has subsequently been reassigned.
function hasClientManagement(actor,client,grants=[],options={}) {
  if (!isAdmin(actor)) return false;
  if (!client || isAdmin(client) || client.role === 'subscriber_admin') return false;
  if (emailOf(actor) === String(client.assigned_to || '').toLowerCase()) return true;
  if (options.allowPro !== false && isProAdmin(actor)) return true;
  return grants.some(grant => grant.client_id === client.id && grant.owner_email === String(client.assigned_to || '').toLowerCase());
}

async function canManageClient(db, actor, clientId, portal, options = {}) {
  if (!isAdmin(actor) || !clientId) return false;
  const table = portal === 'community' ? 'subscribers' : 'users';
  const client = await checked(db.from(table).select('id,role,assigned_to').eq('id', clientId).maybeSingle());
  if (hasClientManagement(actor,client,[],options)) return true;
  return hasClientManagement(actor,client,await sharedGrants(actor,portal,options.applicationDb||(portal==='portal'?db:undefined)),options);
}

async function scopeClients(query, actor, portal, db) {
  const grants = await sharedGrants(actor, portal, db);
  if (!grants.length) return { query: query.eq('assigned_to', emailOf(actor)) };
  const clauses = [`assigned_to.eq.${JSON.stringify(emailOf(actor))}`];
  for (const grant of grants) if (UUID.test(grant.client_id)) clauses.push(`and(id.eq.${grant.client_id},assigned_to.eq.${JSON.stringify(grant.owner_email)})`);
  return { query: query.or(clauses.join(',')) };
}

module.exports = { applicationDatabase, sourceDatabase, checked, emailOf, isAdmin, canManageClient, hasClientManagement, sharedGrants, scopeClients };
