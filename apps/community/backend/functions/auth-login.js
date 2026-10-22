// Subscription login is routed through the shared Robin Platform identity.
const { json, methodNotAllowed, verifyOrigin } = require('../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  return json({ error: 'application_login_required' }, { statusCode: 403 });
};
