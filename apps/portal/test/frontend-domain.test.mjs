// Automated checks for frontend domain test; external services should remain outside this test boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dniExtract } from '../portal-source/src/api.js';
import { buildDefaultDocs, statusLabel } from '../portal-source/src/application/documents/document-utils.js';
import { isAdminUser } from '../portal-source/src/session.js';

test('los documentos por defecto conservan grado y máster separados', () => {
  const degree = buildDefaultDocs('grado');
  const master = buildDefaultDocs('maestria');
  assert.equal(degree.length, 4);
  assert.equal(master.length, 5);
  assert.equal(master.find((document) => document.name.startsWith('Examen')).required, false);
  assert.deepEqual(statusLabel('validated'), { tone: 'green', label: 'Validado' });
});

test('el frontend dirige admin y supervisor al mismo portal', () => {
  assert.equal(isAdminUser({ role: 'admin' }), true);
  assert.equal(isAdminUser({ role: ' Supervisor ' }), true);
  assert.equal(isAdminUser({ role: 'alumno' }), false);
});

test('el OCR sube las imágenes a Storage y envía a Netlify únicamente sus rutas', async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith('https://storage.example/')) return { ok: true, status: 200, json: async () => ({}) };
    const body = JSON.parse(options.body);
    if (body.action === 'upload_ticket') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          upload: {
            path: `user-1/${body.side}/signed.jpg`,
            signed_url: `https://storage.example/${body.side}`,
          },
        }),
      };
    }
    assert.equal(body.action, 'extract');
    assert.equal(body.anverso.path, 'user-1/anverso/signed.jpg');
    assert.equal(body.reverso.path, 'user-1/reverso/signed.jpg');
    return { ok: true, status: 200, json: async () => ({ ok: true, fields: { nombre: 'Robin' } }) };
  };

  try {
    const image = (name) => ({ name, type: 'image/jpeg', size: 1024 });
    const result = await dniExtract(image('anverso.jpg'), image('reverso.jpg'), 'dni');
    assert.equal(result.fields.nombre, 'Robin');
    assert.deepEqual(calls.map((call) => call.options.method), ['POST', 'PUT', 'POST', 'PUT', 'POST']);
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[1].options.headers['cache-control'], 'no-store');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
