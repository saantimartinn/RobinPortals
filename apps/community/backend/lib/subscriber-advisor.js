const { checked, emailOf, isAdmin } = require('../../../../packages/admin-collaboration/access.cjs');

function fail(message, statusCode) { throw Object.assign(new Error(message), { statusCode }); }

async function claimSubscriber(db, actor, clientId) {
  if (!isAdmin(actor) || !emailOf(actor).includes('@')) fail('forbidden', 403);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId || '')) fail('invalid_client', 400);
  const client = await checked(db.from('subscribers').select('id,role,is_subscriber,assigned_to').eq('id', clientId).maybeSingle());
  if (!client || isAdmin(client) || client.role === 'subscriber_admin' || !(client.role === 'subscriber' || client.is_subscriber === true)) fail('client_not_found', 404);
  const owner = String(client.assigned_to || '').trim().toLowerCase();
  if (owner === emailOf(actor)) return client;
  if (owner) fail('client_already_assigned', 409);
  // Compare the original owner in the UPDATE: two admins cannot both claim it.
  let query = db.from('subscribers').update({ assigned_to: emailOf(actor) }).eq('id', client.id);
  query = client.role == null ? query.is('role', null) : query.eq('role', client.role);
  query = client.assigned_to == null ? query.is('assigned_to', null) : query.eq('assigned_to', client.assigned_to);
  const changed = await checked(query.select('id,role,is_subscriber,assigned_to').maybeSingle());
  if (!changed) fail('client_already_assigned', 409);
  return changed;
}

module.exports = { claimSubscriber };
