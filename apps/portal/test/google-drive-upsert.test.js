const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

test('la resincronización de DNI reutiliza el archivo de Drive y actualiza cambios', async () => {
  const drive = require('../lib/google-drive');
  const originalFetch = global.fetch;
  const original = Buffer.from('dni-original');
  let existing = null;
  let created = 0;
  let updated = 0;
  global.fetch = async (url, options) => {
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) {
      return { ok: true, json: async () => ({ files: existing ? [existing] : [] }) };
    }
    if (options.method === 'POST') {
      created++;
      existing = { id: 'drive-file-1', name: 'DNI anverso.jpg', md5Checksum: crypto.createHash('md5').update(original).digest('hex') };
      return { ok: true, json: async () => existing };
    }
    if (options.method === 'PATCH') {
      updated++;
      existing.md5Checksum = crypto.createHash('md5').update(options.body).digest('hex');
      return { ok: true, json: async () => existing };
    }
    throw new Error('unexpected request');
  };
  try {
    const file = { name: 'DNI anverso.jpg', mimeType: 'image/jpeg', buffer: original };
    assert.equal((await drive.upsertFile(file, 'dni-folder', 'token')).id, 'drive-file-1');
    assert.equal((await drive.upsertFile(file, 'dni-folder', 'token')).unchanged, true);
    assert.equal((await drive.upsertFile({ ...file, buffer: Buffer.from('dni-corregido') }, 'dni-folder', 'token')).id, 'drive-file-1');
    assert.equal(created, 1);
    assert.equal(updated, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
