/**
 * HTTP and request validation helpers shared with the other Robin apps.
 */
const shared = require('../../../../packages/auth/http.cjs');
const http = shared.createHttpHelpers({ noStore: false });

function serverError(error, tag) {
  try {
    console.error('[server_error]' + (tag ? ' ' + tag : ''), (error && (error.stack || error.message)) || error);
  } catch { /* ignore logging failures */ }
  const body = { error: 'server_error' };
  if (process.env.CONTEXT !== 'production' && error?.message) body.detail = error.message;
  return http.json(body, { statusCode: 500 });
}

module.exports = { ...shared, ...http, serverError };
