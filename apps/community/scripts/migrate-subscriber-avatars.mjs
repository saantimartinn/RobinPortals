import crypto from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'community-private-images';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 20;
const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
const apply = process.argv.includes('--apply');

function hasImageSignature(buffer, contentType) {
  if (contentType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function parseLegacyDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(value || ''));
  if (!match) return null;
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_AVATAR_BYTES || !hasImageSignature(buffer, contentType)) return null;
  return { contentType, buffer, extension: MIME_EXTENSIONS[contentType] };
}

async function verifyStoredImage(sb, path, image) {
  const { data: info, error: infoError } = await sb.storage.from(BUCKET).info(path);
  if (infoError) throw infoError;
  if (!info || Number(info.size) <= 0 || Number(info.size) > MAX_AVATAR_BYTES || String(info.contentType || '').toLowerCase() !== image.contentType) {
    throw new Error('stored_image_metadata_invalid');
  }
  const { data: file, error: downloadError } = await sb.storage.from(BUCKET).download(path);
  if (downloadError) throw downloadError;
  if (!file) throw new Error('stored_image_missing');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== Number(info.size) || !hasImageSignature(bytes, image.contentType)) throw new Error('stored_image_signature_invalid');
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('missing_supabase_service_credentials');
  if (process.argv.some((arg) => arg.startsWith('--') && arg !== '--apply')) {
    throw new Error('usage: node scripts/migrate-subscriber-avatars.mjs [--apply]');
  }

  const sb = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = { scanned: 0, ready: 0, migrated: 0, skipped: 0, invalid: 0, failed: 0, mode: apply ? 'apply' : 'preview' };
  let lastId = null;

  for (;;) {
    let query = sb.from('subscribers')
      .select('id, avatar_url, avatar_path')
      .not('avatar_url', 'is', null)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) query = query.gt('id', lastId);
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) break;
    lastId = rows[rows.length - 1].id;

    for (const row of rows) {
      result.scanned += 1;
      const image = parseLegacyDataUrl(row.avatar_url);
      if (!image) { result.invalid += 1; continue; }
      if (row.avatar_path) {
        if (!/^subscribers\/[0-9a-f-]{36}\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(row.avatar_path) || !row.avatar_path.startsWith(`subscribers/${row.id}/`)) { result.invalid += 1; continue; }
        if (!apply) { result.ready += 1; continue; }
        try {
          await verifyStoredImage(sb, row.avatar_path, image);
          const { data: updated, error: updateError } = await sb.from('subscribers').update({ avatar_url: null })
            .eq('id', row.id).eq('avatar_path', row.avatar_path).eq('avatar_url', row.avatar_url).select('id').maybeSingle();
          if (updateError) throw updateError;
          if (!updated) throw new Error('subscriber_avatar_changed_during_cleanup');
          result.migrated += 1;
        } catch (error) {
          result.failed += 1;
          console.error('[subscriber_avatar_migration_row_failed]', error?.code || error?.message || 'unknown_error');
        }
        continue;
      }
      if (!apply) { result.ready += 1; continue; }

      const path = `subscribers/${row.id}/${crypto.randomUUID()}.${image.extension}`;
      let stored = false;
      let linked = false;
      try {
        const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, image.buffer, {
          contentType: image.contentType,
          cacheControl: '0',
          upsert: false,
        });
        if (uploadError) throw uploadError;
        stored = true;
        await verifyStoredImage(sb, path, image);
        const { data: updated, error: updateError } = await sb.from('subscribers')
          .update({ avatar_path: path, avatar_url: null })
          .eq('id', row.id)
          .is('avatar_path', null)
          .eq('avatar_url', row.avatar_url)
          .select('id')
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updated) throw new Error('subscriber_avatar_changed_during_migration');
        linked = true;
        result.migrated += 1;
      } catch (error) {
        result.failed += 1;
        console.error('[subscriber_avatar_migration_row_failed]', error?.code || error?.message || 'unknown_error');
      } finally {
        if (stored && !linked) {
          // A failed DB update or verification must not leave an unreferenced object.
          // Successful rows are detected by their cleared legacy URL on the next query
          // and therefore skip this cleanup path.
          const { data: current } = await sb.from('subscribers').select('avatar_path').eq('id', row.id).maybeSingle();
          if (current?.avatar_path !== path) {
            const { error: removeError } = await sb.storage.from(BUCKET).remove([path]);
            if (removeError) console.warn('[subscriber_avatar_orphan_cleanup_failed]', removeError.message || removeError);
          }
        }
      }
    }
  }

  let lastEventId = null;
  for (;;) {
    let query = sb.from('community_events').select('id, type, meta').eq('type', 'mentor').order('id', { ascending: true }).limit(PAGE_SIZE);
    if (lastEventId) query = query.gt('id', lastEventId);
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) break;
    lastEventId = rows[rows.length - 1].id;
    for (const row of rows) {
      const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
      if (!meta.photo) { result.skipped += 1; continue; }
      result.scanned += 1;
      const image = parseLegacyDataUrl(meta.photo);
      if (!image) { result.invalid += 1; continue; }
      if (meta.photo_path) {
        if (!/^mentors\/[0-9a-f-]{36}\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(meta.photo_path)) { result.invalid += 1; continue; }
        if (!apply) { result.ready += 1; continue; }
        try {
          await verifyStoredImage(sb, meta.photo_path, image);
          const nextMeta = { ...meta };
          delete nextMeta.photo;
          const { data: updated, error: updateError } = await sb.from('community_events').update({ meta: nextMeta })
            .eq('id', row.id).eq('meta', meta).select('id').maybeSingle();
          if (updateError) throw updateError;
          if (!updated) throw new Error('mentor_photo_changed_during_cleanup');
          result.migrated += 1;
        } catch (error) {
          result.failed += 1;
          console.error('[mentor_photo_migration_row_failed]', error?.code || error?.message || 'unknown_error');
        }
        continue;
      }
      if (!apply) { result.ready += 1; continue; }
      const path = `mentors/${row.id}/${crypto.randomUUID()}.${image.extension}`;
      let stored = false;
      let linked = false;
      try {
        const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, image.buffer, { contentType: image.contentType, cacheControl: '0', upsert: false });
        if (uploadError) throw uploadError;
        stored = true;
        await verifyStoredImage(sb, path, image);
        const nextMeta = { ...meta, photo_path: path };
        delete nextMeta.photo;
        const { data: updated, error: updateError } = await sb.from('community_events').update({ meta: nextMeta }).eq('id', row.id).eq('meta', meta).select('id').maybeSingle();
        if (updateError) throw updateError;
        if (!updated) throw new Error('mentor_photo_changed_during_migration');
        linked = true;
        result.migrated += 1;
      } catch (error) {
        result.failed += 1;
        console.error('[mentor_photo_migration_row_failed]', error?.code || error?.message || 'unknown_error');
      } finally {
        if (stored && !linked) {
          const { data: current } = await sb.from('community_events').select('meta').eq('id', row.id).maybeSingle();
          if (current?.meta?.photo_path !== path) {
            const { error: removeError } = await sb.storage.from(BUCKET).remove([path]);
            if (removeError) console.warn('[community_image_orphan_cleanup_failed]', removeError.message || removeError);
          }
        }
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.message || 'community_image_migration_failed');
  process.exitCode = 1;
});
