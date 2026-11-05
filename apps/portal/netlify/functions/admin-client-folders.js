const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin, canUseStudentPortal } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../../lib/http');
const { proxyClientFolders } = require('../../../../packages/client-folders/proxy.cjs');

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'POST']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    const { data: actor, error } = await getSupabase().from('users').select('id,email,role,visible_tabs').eq('id', session.uid).single();
    if (error || !actor || !isApplicationAdmin(actor) || !canUseStudentPortal(actor)) return json({ error: 'forbidden' }, { statusCode: 403 });
    return await proxyClientFolders(event);
  } catch (error) { return serverError(error, 'portal.client_folders'); }
};
