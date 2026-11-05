const { timingSafeEqual } = require('node:crypto');
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { listFolders, mutateFolders } = require('../../lib/client-folders');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

function trustedService(event) {
  const expected = process.env.CLIENT_FOLDER_SYNC_SECRET;
  const supplied = event.headers?.['x-robin-folder-secret'] || event.headers?.['X-Robin-Folder-Secret'];
  if (!expected || !supplied) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'POST']);
  const service = trustedService(event);
  let actorId = null;
  if (!service) {
    const session = readSessionFromEvent(event);
    if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
    try {
      const { data: actor, error } = await getSupabase().from('users').select('id,email,role').eq('id', session.uid).single();
      if (error || !actor || !isApplicationAdmin(actor)) return json({ error: 'forbidden' }, { statusCode: 403 });
      actorId = actor.id;
    } catch (error) { return serverError(error, 'admin.client_folders_auth'); }
  }
  try {
    if (event.httpMethod === 'GET') return json(await listFolders());
    const body = parseJsonBody(event) || {};
    return json(await mutateFolders(body.action, body, actorId));
  } catch (error) {
    const status = { invalid_name: 400, invalid_client: 400, invalid_action: 400, folder_not_found: 404, client_not_found: 404, folder_not_empty: 409 }[error.message];
    if (status) return json({ error: error.message }, { statusCode: status });
    return serverError(error, 'admin.client_folders');
  }
};
