const test = require('node:test');
const assert = require('node:assert/strict');

test('guarda las imágenes y permite introducir los datos a mano si falla el OCR', async () => {
  const patches = [];
  const sb = {
    from(table) {
      assert.equal(table, 'users');
      return {
        select() { return this; },
        update(patch) { patches.push(patch); return this; },
        eq() { return this; },
        async maybeSingle() { return { data: { id: 'student-1' }, error: null }; },
        then(resolve) { resolve({ error: null }); },
      };
    },
  };
  const mocks = {
    '../../lib/supabase': { getSupabase: () => sb, BUCKET: 'dni-uploads' },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'student-1' }) },
    '../../lib/ocr': { extractDniFields: async () => { throw Object.assign(new Error('provider unavailable'), { status: 401 }); } },
    '../../lib/http': {
      verifyOrigin: () => true,
      parseJsonBody: () => ({ action: 'extract', doc_type: 'dni' }),
      json: (body, options = {}) => ({ statusCode: options.statusCode || 200, body: JSON.stringify(body) }),
      methodNotAllowed: () => { throw new Error('unexpected method'); },
      serverError: () => { throw new Error('unexpected server error'); },
    },
    '../../lib/dni-upload': {
      loadDniImages: async () => ({
        docType: 'dni',
        anverso: { path: 'student-1/anverso/front.jpg', base64: 'AA==', mimetype: 'image/jpeg' },
        reverso: { path: 'student-1/reverso/back.jpg', base64: 'AA==', mimetype: 'image/jpeg' },
      }),
    },
    '../../lib/storage': {},
    '../../lib/sandbox-mode': { isIsolatedSandbox: () => false },
  };
  const functionPath = require.resolve('../netlify/functions/onboarding-dni-extract');
  const previous = new Map();
  for (const [path, exports] of Object.entries(mocks)) {
    const filename = require.resolve(path, { paths: [require('node:path').dirname(functionPath)] });
    previous.set(filename, require.cache[filename]);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
  }
  delete require.cache[functionPath];
  try {
    const { handler } = require(functionPath);
    const response = await handler({ httpMethod: 'POST' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true, fields: null, manual_entry: true, ocr_status: 401, ocr_error_type: 'Error' });
    assert.deepEqual(patches, [{
      dni_anverso_path: 'student-1/anverso/front.jpg',
      dni_reverso_path: 'student-1/reverso/back.jpg',
    }]);
  } finally {
    delete require.cache[functionPath];
    for (const [filename, module] of previous) {
      if (module) require.cache[filename] = module;
      else delete require.cache[filename];
    }
  }
});
