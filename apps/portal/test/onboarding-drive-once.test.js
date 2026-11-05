const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('confirmaciones repetidas del mismo pago solo sincronizan los DNI una vez', async () => {
  const originalLoad = Module._load;
  const user = { id: 'user-1', pago_completed: false, nombre: 'Alumno', apellidos: 'Prueba', dni_anverso_path: 'front.jpg', dni_reverso_path: 'back.jpg', gdrive_folders: {} };
  const uploads = [];
  let welcomes = 0;
  const mocks = {
    './supabase': { BUCKET: 'dni' },
    './google-drive': {
      isConfigured: () => true,
      ensureClientFolders: async () => ({ dni: 'folder-1', contrato: 'folder-2' }),
      getAccessToken: async () => 'token',
      upsertFile: async (file) => { uploads.push(file.name); return { id: `file-${uploads.length}` }; },
    },
    './contract-pdf': { buildContractPdf: async () => Buffer.from('pdf') },
    './storage': {},
    './sandbox-mode': { isIsolatedSandbox: () => false },
    './payments': { ensurePayments: async () => [] },
    './integration-sync': { syncGoogleSheets: async () => ({ ok: true }) },
    './onboarding-welcome': { sendWelcomeEmail: async () => { welcomes++; } },
  };
  Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith('/apps/portal/lib/onboarding-fulfill.js') && mocks[request]) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  const path = require.resolve('../lib/onboarding-fulfill');
  delete require.cache[path];
  const { markOnboardingPaid } = require(path);

  const sb = {
    storage: { from: () => ({ download: async () => ({ data: { arrayBuffer: async () => Buffer.from('image') } }) }) },
    from(table) {
      if (table === 'webhook_log') return { insert: async () => ({ error: null }) };
      assert.equal(table, 'users');
      let updating = false;
      const query = {
        select() { return query; },
        eq() { return query; },
        update() { updating = true; return query; },
        async single() { return { data: { ...user }, error: null }; },
        then(resolve) {
          if (updating && !user.pago_completed) { user.pago_completed = true; return resolve({ data: [{ id: user.id }], error: null }); }
          return resolve({ data: [], error: null });
        },
      };
      return query;
    },
  };
  try {
    assert.equal((await markOnboardingPaid(sb, user.id, {})).ok, true);
    const repeated = await markOnboardingPaid(sb, user.id, {});
    assert.deepEqual(repeated.gdrive, { skipped: true, reason: 'already_completed' });
    assert.equal(uploads.length, 2);
    assert.equal(welcomes, 1);
  } finally {
    Module._load = originalLoad;
    delete require.cache[path];
  }
});
