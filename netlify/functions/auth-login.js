// RobinJr uses the shared Robin login and exchanges its short-lived handoff ticket at /api/auth/sso.
const { json, methodNotAllowed, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  return json({ error: 'common_login_required' }, { statusCode: 403 });
};
