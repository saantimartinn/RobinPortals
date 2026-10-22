/**
 * HTTP and request validation helpers shared with the other Robin apps.
 */
const { errorCode } = require('./observability');
const shared = require('../../../packages/auth/http.cjs');
const http = shared.createHttpHelpers({ noStore: true });

function serverError(error, tag) {
  try {
    console.error(JSON.stringify({
      level: 'error',
      operation: tag || 'server_request',
      result: 'error',
      error_code: errorCode(error),
    }));
  } catch { console.warn('[server_error_log_failed]'); }
  const body = { error: 'server_error' };
  if (process.env.CONTEXT !== 'production' && error?.message) body.detail = error.message;
  return http.json(body, { statusCode: 500 });
}

module.exports = { ...shared, ...http, serverError };
