// Automated checks for storage test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  copyObject,
  createSignedUpload,
  downloadObject,
  pathInsidePrefix,
  parseDataUrl,
  signedUrl,
  uploadDataUrl,
  uploadDescriptor,
  verifyUploadedObject,
} = require('../lib/storage');

test('parsea data URLs sin cambiar el contenido binario', () => {
  const parsed = parseDataUrl('data:text/plain;base64,aG9sYQ==');
  assert.equal(parsed.mime, 'text/plain');
  assert.equal(parsed.buffer.toString('utf8'), 'hola');
});

test('un fallo al firmar una URL de Storage no se oculta', async () => {
  const expected = new Error('bucket unavailable');
  const sb = { storage: { from: () => ({ createSignedUrl: async () => ({ error: expected }) }) } };
  await assert.rejects(() => signedUrl(sb, 'path/file.pdf'), expected);
});

test('la subida no intenta crear buckets silenciosamente', async () => {
  let createBucketCalled = false;
  const sb = {
    storage: {
      createBucket: async () => { createBucketCalled = true; },
      from: () => ({ upload: async () => ({ data: { path: 'ok' }, error: null }) }),
    },
  };
  const result = await uploadDataUrl(sb, 'data:text/plain;base64,aG9sYQ==', {
    keyPrefix: 'test', filename: 'hola.txt',
  });
  assert.equal(result.size, 4);
  assert.equal(createBucketCalled, false);
});

test('copia una plantilla canónica a una ruta propia del alumno', async () => {
  let copied;
  const sb = { storage: { from: () => ({ copy: async (source, target) => {
    copied = { source, target };
    return { error: null };
  } }) } };
  const result = await copyObject(sb, 'career-templates/base.pdf', {
    keyPrefix: 'user-1/templates', filename: 'modelo.pdf',
  });
  assert.equal(copied.source, 'career-templates/base.pdf');
  assert.equal(result.path, copied.target);
  assert.match(result.path, /^user-1\/templates\/.+_modelo\.pdf$/);
});

test('descarga una firma desde Storage como buffer', async () => {
  const sb = { storage: { from: () => ({
    download: async () => ({ data: new Blob(['firma']), error: null }),
  }) } };
  const result = await downloadObject(sb, 'user-1/contracts/signature.png');
  assert.equal(result.toString('utf8'), 'firma');
});

test('valida los metadatos antes de firmar una subida directa', () => {
  assert.deepEqual(
    uploadDescriptor({ filename: 'notas.pdf', contentType: 'application/pdf', size: 1024 }),
    { ok: true, filename: 'notas.pdf', contentType: 'application/pdf', size: 1024 }
  );
  assert.equal(uploadDescriptor({ filename: 'grande.pdf', contentType: 'application/pdf', size: 21 * 1024 * 1024 }).error, 'file_too_large');
  assert.equal(pathInsidePrefix('user-1/doc-1/file.pdf', 'user-1/doc-1'), true);
  assert.equal(pathInsidePrefix('user-1/doc-10/file.pdf', 'user-1/doc-1'), false);
});

test('crea y verifica una subida firmada dentro de su prefijo', async () => {
  let signedPath;
  const sb = { storage: { from: () => ({
    createSignedUploadUrl: async (path) => {
      signedPath = path;
      return { data: { signedUrl: `https://storage.example/${path}?token=test` }, error: null };
    },
    info: async (path) => ({
      data: { name: path, size: 4, contentType: 'text/plain' },
      error: null,
    }),
  }) } };
  const upload = await createSignedUpload(sb, {
    keyPrefix: 'user-1/doc-1', filename: 'hola.txt', contentType: 'text/plain', size: 4,
  });
  assert.equal(upload.path, signedPath);
  assert.match(upload.path, /^user-1\/doc-1\/.+_hola\.txt$/);
  assert.equal((await verifyUploadedObject(sb, upload.path, {
    keyPrefix: 'user-1/doc-1', contentType: 'text/plain', size: 4,
  })).size, 4);
  await assert.rejects(() => verifyUploadedObject(sb, upload.path, {
    keyPrefix: 'user-2/doc-1', contentType: 'text/plain', size: 4,
  }), /invalid_storage_path/);
});

test('permite seleccionar un bucket privado distinto para flujos especializados', async () => {
  const buckets = [];
  const sb = { storage: { from(bucket) {
    buckets.push(bucket);
    return {
      createSignedUploadUrl: async (path) => ({ data: { signedUrl: `https://storage.example/${path}` }, error: null }),
      info: async (path) => ({ data: { name: path, size: 4, contentType: 'image/png' }, error: null }),
      download: async () => ({ data: new Blob(['foto']), error: null }),
      remove: async () => ({ error: null }),
    };
  } } };
  const upload = await createSignedUpload(sb, {
    keyPrefix: 'user-1/anverso', filename: 'dni.png', contentType: 'image/png', size: 4, bucket: 'dni-uploads',
  });
  await verifyUploadedObject(sb, upload.path, {
    keyPrefix: 'user-1/anverso', contentType: 'image/png', size: 4, bucket: 'dni-uploads',
  });
  assert.equal((await downloadObject(sb, upload.path, { bucket: 'dni-uploads' })).toString(), 'foto');
  assert.deepEqual(buckets, ['dni-uploads', 'dni-uploads', 'dni-uploads']);
});
