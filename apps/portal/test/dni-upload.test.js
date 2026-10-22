// Automated checks for dni upload test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_DNI_IMAGE_BYTES,
  cancelDniUpload,
  createDniUploadTicket,
  loadDniImages,
  validateImageDescriptor,
} = require('../lib/dni-upload');

test('crea la subida firmada del DNI en su bucket privado y prefijo de usuario', async () => {
  let bucket;
  let signedPath;
  const sb = { storage: { from(name) {
    bucket = name;
    return {
      async createSignedUploadUrl(path) {
        signedPath = path;
        return { data: { signedUrl: `https://storage.example/${path}` }, error: null };
      },
    };
  } } };

  const upload = await createDniUploadTicket(sb, 'user-1', {
    doc_type: 'dni',
    side: 'anverso',
    file_filename: 'frontal.jpg',
    file_mime: 'image/jpeg',
    file_size: 1024,
  });

  assert.equal(bucket, 'dni-uploads');
  assert.equal(upload.path, signedPath);
  assert.match(upload.path, /^user-1\/anverso\/.+_frontal\.jpg$/);
});

test('rechaza tipos, tamaños y lados no permitidos antes de firmar', async () => {
  assert.throws(
    () => validateImageDescriptor({ filename: 'dni.pdf', mime: 'application/pdf', size: 100 }),
    (error) => error.code === 'invalid_file_type' && error.statusCode === 400
  );
  assert.throws(
    () => validateImageDescriptor({ filename: 'dni.jpg', mime: 'image/jpeg', size: MAX_DNI_IMAGE_BYTES + 1 }),
    (error) => error.code === 'file_too_large' && error.statusCode === 400
  );
  await assert.rejects(
    () => createDniUploadTicket({}, 'user-1', {
      doc_type: 'passport', side: 'reverso', file_filename: 'x.jpg', file_mime: 'image/jpeg', file_size: 1,
    }),
    (error) => error.code === 'invalid_document_side'
  );
});

test('verifica y descarga las imágenes privadas antes de entregarlas al OCR', async () => {
  const buckets = [];
  const sb = { storage: { from(name) {
    buckets.push(name);
    return {
      async info(path) {
        return { data: { name: path, size: 4, contentType: 'image/png' }, error: null };
      },
      async download() {
        return { data: new Blob(['foto']), error: null };
      },
    };
  } } };
  const images = await loadDniImages(sb, 'user-1', {
    doc_type: 'dni',
    anverso: { path: 'user-1/anverso/a.png', filename: 'a.png', mime: 'image/png', size: 4 },
    reverso: { path: 'user-1/reverso/r.png', filename: 'r.png', mime: 'image/png', size: 4 },
  });

  const encodedPhoto = Buffer.from([102, 111, 116, 111]).toString('base64');
  assert.equal(images.anverso.base64, encodedPhoto);
  assert.equal(images.reverso.base64, encodedPhoto);
  assert.deepEqual(buckets, ['dni-uploads', 'dni-uploads', 'dni-uploads', 'dni-uploads']);
});

test('la cancelación no puede borrar fuera del prefijo del usuario y lado', async () => {
  await assert.rejects(
    () => cancelDniUpload({}, 'user-1', {
      doc_type: 'dni', side: 'anverso', file_path: 'user-2/anverso/a.jpg',
    }),
    (error) => error.code === 'invalid_storage_path'
  );
});
