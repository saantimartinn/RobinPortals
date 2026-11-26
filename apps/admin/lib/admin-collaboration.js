const { checked, emailOf, isAdmin, sourceDatabase } = require('../../../packages/admin-collaboration/access.cjs');
const { isProAdmin } = require('./admin-profiles');
const { uuid } = require('./validation');

const PORTALS = ['admin','portal','robinjr','community'];
function fail(error, statusCode = 400) { throw Object.assign(new Error(error), { statusCode }); }

async function targetAdmin(db, id) {
  if (!uuid(id)) fail('invalid_admin');
  const user = await checked(db.from('users').select('id,email,nombre,role,visible_tabs').eq('id', id).maybeSingle());
  if (!user || !isAdmin(user) || isProAdmin(user)) fail('admin_not_found', 404);
  return user;
}

async function requireLink(db, actor, id) {
  const link = await checked(db.from('admin_links').select('admin_id').eq('pro_admin_id', actor.id).eq('admin_id', id).maybeSingle());
  if (!link) fail('admin_not_linked', 403);
}

async function listCollaboration(db, actor, { admin_id, portal = 'portal' } = {}, getSource = sourceDatabase) {
  const links = await checked(db.from('admin_links').select('pro_admin_id,admin_id,created_at')) || [];
  if (!admin_id) return { links };
  if (!isProAdmin(actor)) fail('pro_admin_required', 403);
  await targetAdmin(db, admin_id);
  await requireLink(db, actor, admin_id);
  if (!PORTALS.includes(portal) || portal === 'admin') fail('invalid_portal');
  const source = getSource(portal);
  const table = portal === 'community' ? 'subscribers' : 'users';
  const clients = await checked(source.from(table).select('id,nombre,apellidos,email,role,assigned_to').eq('assigned_to', emailOf(actor)).order('nombre')) || [];
  const shares = await checked(db.from('admin_client_shares').select('client_id').eq('pro_admin_id', actor.id).eq('admin_id', admin_id).eq('portal', portal)) || [];
  return { links, clients: clients.filter(client => !isAdmin(client) && client.role !== 'subscriber_admin'), shared_ids: shares.map(row => row.client_id) };
}

async function changeCollaboration(db, actor, body, getSource = sourceDatabase) {
  if (!isProAdmin(actor)) fail('pro_admin_required', 403);
  const target = await targetAdmin(db, body.admin_id);
  const key = { pro_admin_id: actor.id, admin_id: target.id };
  if (body.action === 'link') {
    await checked(db.from('admin_links').upsert(key, { onConflict: 'pro_admin_id,admin_id', ignoreDuplicates: true }));
    // Existing accounts keep their tutorial state unless their PRO requests it.
    return { ok: true };
  }
  await requireLink(db, actor, target.id);
  if (body.action === 'unlink') {
    await checked(db.from('admin_links').delete().eq('pro_admin_id', actor.id).eq('admin_id', target.id));
    return { ok: true };
  }
  if (body.action === 'tutorial') {
    await checked(db.rpc('require_admin_tutorial', { p_admin_id: target.id, p_portals: PORTALS }));
    return { ok: true };
  }
  if (!['share','unshare'].includes(body.action) || !uuid(body.client_id) || !PORTALS.includes(body.portal) || body.portal === 'admin') fail('invalid_action');
  const table = body.portal === 'community' ? 'subscribers' : 'users';
  const client = await checked(getSource(body.portal).from(table).select('id,role,assigned_to').eq('id', body.client_id).maybeSingle());
  if (!client || isAdmin(client) || client.role === 'subscriber_admin' || String(client.assigned_to || '').toLowerCase() !== emailOf(actor)) fail('client_not_owned', 403);
  const share = { ...key, portal: body.portal, client_id: client.id, owner_email: emailOf(actor) };
  if (body.action === 'share') await checked(db.from('admin_client_shares').upsert(share, { onConflict: 'pro_admin_id,admin_id,portal,client_id', ignoreDuplicates: true }));
  else await checked(db.from('admin_client_shares').delete().eq('pro_admin_id', actor.id).eq('admin_id', target.id).eq('portal', body.portal).eq('client_id', client.id));
  return { ok: true };
}

module.exports = { listCollaboration, changeCollaboration, PORTALS };
