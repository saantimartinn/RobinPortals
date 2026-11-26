const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { findAdminForSession } = require('../../lib/admin-auth');
const { listCollaboration, changeCollaboration } = require('../../lib/admin-collaboration');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async event => {
  if (!['GET','POST'].includes(event.httpMethod)) return methodNotAllowed(['GET','POST']);
  if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    const db = getSupabase();
    const actor = await findAdminForSession(db, readSessionFromEvent(event));
    if (!actor) return json({ error: 'forbidden' }, { statusCode: 403 });
    return json(event.httpMethod === 'GET'
      ? await listCollaboration(db, actor, event.queryStringParameters || {})
      : await changeCollaboration(db, actor, parseJsonBody(event) || {}));
  } catch (error) {
    return error.statusCode ? json({ error: error.message }, { statusCode: error.statusCode }) : serverError(error, 'admin.collaboration');
  }
};
