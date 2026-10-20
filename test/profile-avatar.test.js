// Automated checks for profile avatar test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  avatarDescriptor,
  avatarPrefix,
  MAX_AVATAR_BYTES,
} = require('../netlify/functions/profile-avatar');

test('los avatares quedan bajo una ruta privada y exclusiva del usuario', () => {
  assert.equal(avatarPrefix('user-1'), 'user-1/profile/avatar');
});

test('acepta imágenes de perfil seguras y limita su tamaño', () => {
  assert.deepEqual(
    avatarDescriptor({ file_filename: 'perfil.webp', file_mime: 'image/webp', file_size: 1024 }),
    { ok: true, filename: 'perfil.webp', contentType: 'image/webp', size: 1024 }
  );
  assert.throws(() => avatarDescriptor({
    file_filename: 'perfil.png', file_mime: 'image/png', file_size: MAX_AVATAR_BYTES + 1,
  }), /file_too_large/);
  assert.throws(() => avatarDescriptor({
    file_filename: 'perfil.svg', file_mime: 'image/svg+xml', file_size: 1024,
  }), /invalid_file_type/);
});
