const { getAdminSupabase } = require('./admin-supabase');
const { getSupabase } = require('./supabase');
const { getJuniorSupabase } = require('./junior-supabase');
const { getSubscriptionsSupabase } = require('./subscriptions-supabase');
const { isApplicationAdmin } = require('./authorization');

const sources = {
  crm: [getAdminSupabase, 'crm_leads'],
  alumno: [getSupabase, 'users'],
  robinjr: [getJuniorSupabase, 'users'],
  community: [getSubscriptionsSupabase, 'subscribers'],
};

function clientKey(source, row) {
  const leadId = source === 'crm' ? row.id : row.lead_id;
  return leadId ? `lead:${String(leadId)}` : `${source}:${row.id}`;
}

async function allRows(table, columns, order) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await getAdminSupabase().from(table).select(columns).order(order).range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

async function listFolders() {
  const [folders, items] = await Promise.all([
    allRows('client_folders', 'id,parent_id,name,created_at,updated_at', 'created_at'),
    allRows('client_folder_items', 'client_key,folder_id,updated_at', 'client_key'),
  ]);
  return { folders, items };
}

async function folderById(id) {
  if (!id) return null;
  const { data, error } = await getAdminSupabase().from('client_folders').select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('folder_not_found');
  return data;
}

function validName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) throw new Error('invalid_name');
  return name;
}

async function resolveClient(source, clientId) {
  if (!Object.hasOwn(sources, source) || !/^[0-9a-f-]{36}$/i.test(String(clientId || ''))) throw new Error('invalid_client');
  const [getClient, table] = sources[source];
  const columns = source === 'crm' ? 'id' : 'id,lead_id,role';
  const { data, error } = await getClient().from(table).select(columns).eq('id', clientId).maybeSingle();
  if (error) throw error;
  if (!data || (source === 'community' ? data.role === 'subscriber_admin' : source !== 'crm' && isApplicationAdmin(data))) throw new Error('client_not_found');
  return clientKey(source, data);
}

async function mutateFolders(action, body, actorId) {
  const db = getAdminSupabase();
  if (action === 'create') {
    const name = validName(body.name);
    const parentId = body.parentId || null;
    await folderById(parentId);
    const { data, error } = await db.from('client_folders').insert({ name, parent_id: parentId, created_by: actorId || null }).select('id,parent_id,name,created_at,updated_at').single();
    if (error) throw error;
    return { folder: data };
  }
  if (action === 'rename') {
    await folderById(body.folderId);
    const { data, error } = await db.from('client_folders').update({ name: validName(body.name), updated_at: new Date().toISOString() }).eq('id', body.folderId).select('id,parent_id,name,created_at,updated_at').single();
    if (error) throw error;
    return { folder: data };
  }
  if (action === 'delete') {
    await folderById(body.folderId);
    const [children, items] = await Promise.all([
      db.from('client_folders').select('id', { count: 'exact', head: true }).eq('parent_id', body.folderId),
      db.from('client_folder_items').select('client_key', { count: 'exact', head: true }).eq('folder_id', body.folderId),
    ]);
    if (children.error || items.error) throw children.error || items.error;
    if (children.count || items.count) throw new Error('folder_not_empty');
    const { error } = await db.from('client_folders').delete().eq('id', body.folderId);
    if (error) throw error;
    return { ok: true };
  }
  if (action === 'moveClient') {
    const key = await resolveClient(body.source, body.clientId);
    const folderId = body.folderId || null;
    await folderById(folderId);
    const { error } = folderId
      ? await db.from('client_folder_items').upsert({ client_key: key, folder_id: folderId, updated_at: new Date().toISOString() }, { onConflict: 'client_key' })
      : await db.from('client_folder_items').delete().eq('client_key', key);
    if (error) throw error;
    return { ok: true, client_key: key, folder_id: folderId };
  }
  throw new Error('invalid_action');
}

module.exports = { listFolders, mutateFolders, clientKey, validName };
