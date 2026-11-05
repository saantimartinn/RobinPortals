const { readSessionFromEvent } = require('../lib/auth');
const { readApplicationIdentity, canUseRobinPlan } = require('../lib/application-permissions');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../lib/http');
const { proxyClientFolders } = require('../../../../packages/client-folders/proxy.cjs');

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'POST']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (session.role !== 'subscriber_admin') return json({ error: 'forbidden' }, { statusCode: 403 });
  if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    if (!canUseRobinPlan(await readApplicationIdentity(event))) return json({ error: 'forbidden' }, { statusCode: 403 });
    return await proxyClientFolders(event);
  } catch (error) { return serverError(error, 'community.client_folders'); }
};
