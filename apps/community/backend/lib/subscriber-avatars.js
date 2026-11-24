const crypto = require('node:crypto');

const BUCKET = 'community-private-images';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
const SIGNED_READ_TTL_SECONDS = 300;

function invalid(code) {
  const error = new Error(code);
  error.code = code;
  error.statusCode = 400;
  return error;
}

function avatarDescriptor(body = {}) {
  const contentType = String(body.file_mime || '').trim().toLowerCase();
  const size = Number(body.file_size);
  if (!MIME_EXTENSIONS[contentType]) throw invalid('invalid_file_type');
  if (!Number.isSafeInteger(size) || size <= 0) throw invalid('invalid_file_size');
  if (size > MAX_AVATAR_BYTES) throw invalid('file_too_large');
  return { contentType, size, extension: MIME_EXTENSIONS[contentType] };
}

function avatarPrefix(userId) {
  const uid = String(userId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid)) {
    throw invalid('invalid_subscriber_id');
  }
  return `subscribers/${uid}/`;
}

function mentorPhotoPrefix(adminId) {
  const uid = String(adminId || '');
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw invalid('invalid_admin_id');
  return `mentors/${uid}/`;
}

function hasImageSignature(buffer, contentType) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (contentType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function pathInsidePrefix(path, prefix) {
  const value = String(path || '');
  return value.startsWith(prefix) && !value.includes('..') && !value.includes('\\') && value.split('/').length === 3;
}

async function createSignedUpload(sb, userId, descriptor) {
  const prefix = avatarPrefix(userId);
  const path = `${prefix}${crypto.randomUUID()}.${descriptor.extension}`;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('avatar_signed_upload_missing');
  return { path, signedUrl: data.signedUrl, expiresIn: 7200 };
}

async function createSignedMentorUpload(sb, adminId, descriptor) {
  const prefix = mentorPhotoPrefix(adminId);
  const path = `${prefix}${crypto.randomUUID()}.${descriptor.extension}`;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('mentor_photo_signed_upload_missing');
  return { path, signedUrl: data.signedUrl, expiresIn: 7200 };
}

async function verifyUploadedAvatar(sb, userId, path, descriptor) {
  if (!pathInsidePrefix(path, avatarPrefix(userId))) throw invalid('invalid_storage_path');
  const { data, error } = await sb.storage.from(BUCKET).info(path);
  if (error) throw error;
  if (!data) throw new Error('avatar_object_missing');
  const actualSize = Number(data.size);
  const actualType = String(data.contentType || '').toLowerCase();
  if (!Number.isSafeInteger(actualSize) || actualSize !== descriptor.size || actualSize > MAX_AVATAR_BYTES) {
    throw invalid('invalid_uploaded_size');
  }
  if (actualType !== descriptor.contentType) throw invalid('invalid_uploaded_mime');
  const { data: file, error: downloadError } = await sb.storage.from(BUCKET).download(path);
  if (downloadError) throw downloadError;
  if (!file) throw new Error('avatar_object_missing');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== actualSize || !hasImageSignature(bytes, descriptor.contentType)) {
    throw invalid('invalid_uploaded_image');
  }
  return { size: actualSize, contentType: actualType };
}

async function verifyUploadedMentorPhoto(sb, adminId, path, descriptor) {
  if (!pathInsidePrefix(path, mentorPhotoPrefix(adminId))) throw invalid('invalid_storage_path');
  return verifyImageObject(sb, path, descriptor);
}

async function verifyImageObject(sb, path, descriptor) {
  const { data, error } = await sb.storage.from(BUCKET).info(path);
  if (error) throw error;
  if (!data) throw new Error('image_object_missing');
  const actualSize = Number(data.size);
  const actualType = String(data.contentType || '').toLowerCase();
  if (!Number.isSafeInteger(actualSize) || actualSize !== descriptor.size || actualSize > MAX_AVATAR_BYTES) throw invalid('invalid_uploaded_size');
  if (actualType !== descriptor.contentType) throw invalid('invalid_uploaded_mime');
  const { data: file, error: downloadError } = await sb.storage.from(BUCKET).download(path);
  if (downloadError) throw downloadError;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== actualSize || !hasImageSignature(bytes, descriptor.contentType)) throw invalid('invalid_uploaded_image');
  return { size: actualSize, contentType: actualType };
}

async function signedAvatarUrl(sb, userId, path) {
  if (!path) return null;
  if (!pathInsidePrefix(path, avatarPrefix(userId))) throw new Error('invalid_avatar_path');
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_READ_TTL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('avatar_signed_url_missing');
  return data.signedUrl;
}

async function signedMentorPhotoUrl(sb, adminId, path) {
  if (!path) return null;
  if (!pathInsidePrefix(path, mentorPhotoPrefix(adminId))) throw new Error('invalid_mentor_photo_path');
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_READ_TTL_SECONDS);
  if (error) throw error;
  return data?.signedUrl || null;
}

async function signedMentorPhotoPaths(sb, paths) {
  const validPaths = (paths || []).filter((path) => /^mentors\/[0-9a-f-]{36}\/[^/]+\.(jpg|png|webp)$/i.test(String(path || '')) && !String(path).includes('..'));
  const valid = [...new Set(validPaths)];
  const result = new Map();
  for (let offset = 0; offset < valid.length; offset += 100) {
    const batch = valid.slice(offset, offset + 100);
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(batch, SIGNED_READ_TTL_SECONDS);
    if (error) throw error;
    (data || []).forEach((row) => { if (row.path && row.signedUrl) result.set(row.path, row.signedUrl); });
  }
  return result;
}

async function subscriberAvatarUrl(sb, subscriber) {
  if (subscriber?.avatar_path) {
    try { return await signedAvatarUrl(sb, subscriber.id, subscriber.avatar_path); }
    catch (error) {
      console.warn('[subscriber_avatar_sign_failed]', error?.message || error);
      return null;
    }
  }
  const legacy = String(subscriber?.avatar_url || '');
  // Keep existing profiles visible during the controlled data backfill. New
  // writes are rejected by the profile endpoint and the backfill clears this.
  return legacy.startsWith('data:image/') ? legacy : null;
}

async function subscriberAvatarUrls(sb, subscribers) {
  const rows = Array.isArray(subscribers) ? subscribers : [];
  const urls = rows.map((subscriber) => {
    const legacy = String(subscriber?.avatar_url || '');
    return legacy.startsWith('data:image/') ? legacy : null;
  });
  const pending = [];
  rows.forEach((subscriber, index) => {
    if (!subscriber?.avatar_path) return;
    try {
      if (pathInsidePrefix(subscriber.avatar_path, avatarPrefix(subscriber.id))) pending.push({ index, path: subscriber.avatar_path });
      else urls[index] = null;
    } catch (_) { urls[index] = null; }
  });
  for (let offset = 0; offset < pending.length; offset += 100) {
    const batch = pending.slice(offset, offset + 100);
    try {
      const { data, error } = await sb.storage.from(BUCKET)
        .createSignedUrls(batch.map((item) => item.path), SIGNED_READ_TTL_SECONDS);
      if (error) throw error;
      const byPath = new Map((data || []).map((item) => [item.path, item.signedUrl || null]));
      batch.forEach((item) => { urls[item.index] = byPath.get(item.path) || null; });
    } catch (error) {
      console.warn('[subscriber_avatars_sign_failed]', error?.message || error);
      batch.forEach((item) => { urls[item.index] = null; });
    }
  }
  return urls;
}

async function removeAvatarObject(sb, userId, path) {
  if (!path) return;
  if (!pathInsidePrefix(path, avatarPrefix(userId))) throw invalid('invalid_storage_path');
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

async function removeMentorPhotoObject(sb, adminId, path) {
  if (!path) return;
  if (!pathInsidePrefix(path, mentorPhotoPrefix(adminId))) throw invalid('invalid_storage_path');
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

async function removeLinkedMentorPhoto(sb, path) {
  if (!/^mentors\/[0-9a-f-]{36}\/[^/]+\.(jpg|png|webp)$/i.test(String(path || '')) || String(path).includes('..') || String(path).includes('\\')) throw invalid('invalid_storage_path');
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

module.exports = {
  BUCKET,
  MAX_AVATAR_BYTES,
  SIGNED_READ_TTL_SECONDS,
  avatarDescriptor,
  avatarPrefix,
  createSignedMentorUpload,
  createSignedUpload,
  hasImageSignature,
  pathInsidePrefix,
  removeAvatarObject,
  removeMentorPhotoObject,
  removeLinkedMentorPhoto,
  mentorPhotoPrefix,
  signedAvatarUrl,
  subscriberAvatarUrl,
  subscriberAvatarUrls,
  signedMentorPhotoUrl,
  signedMentorPhotoPaths,
  verifyUploadedMentorPhoto,
  verifyUploadedAvatar,
};
