const test = require('node:test');
const assert = require('node:assert/strict');

test('administración usa las credenciales de Sheets del portal cuando le falta el token', () => {
  const keys = ['PORTAL__GOOGLE_CLIENT_ID', 'PORTAL__GOOGLE_CLIENT_SECRET', 'PORTAL__GOOGLE_REFRESH_TOKEN'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    PORTAL__GOOGLE_CLIENT_ID: 'portal-client',
    PORTAL__GOOGLE_CLIENT_SECRET: 'portal-secret',
    PORTAL__GOOGLE_REFRESH_TOKEN: 'portal-refresh',
  });
  try {
    const { runInAppWithEnv } = require('../../../site/app-env.cjs');
    const { isConfigured } = require('../lib/google-sheets');
    const configured = runInAppWithEnv('admin', {
      GOOGLE_CLIENT_ID: 'admin-client', GOOGLE_CLIENT_SECRET: 'admin-secret',
      GOOGLE_REFRESH_TOKEN: '', GOOGLE_SHEETS_SPREADSHEET_ID: 'cash-sheet',
    }, isConfigured);
    assert.equal(configured, true);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
