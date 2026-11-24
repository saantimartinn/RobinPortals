const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { isSubscriberRole } = require('../lib/principal');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const avatars = require('../lib/subscriber-avatars');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (!isSubscriberRole(session.role)) return json({ error: 'forbidden' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { data: subscriber, error: subscriberError } = await sb.from('subscribers')
      .select('id, avatar_path').eq('id', session.uid).single();
    if (subscriberError || !subscriber) return json({ error: 'unauthorized' }, { statusCode: 401 });

    const action = String(body.action || '');
    if (action === 'upload_ticket') {
      const descriptor = avatars.avatarDescriptor(body);
      const upload = await avatars.createSignedUpload(sb, subscriber.id, descriptor);
      return json({ upload: { path: upload.path, signed_url: upload.signedUrl, expires_in: upload.expiresIn } });
    }

    if (action === 'cancel') {
      const path = String(body.file_path || '');
      if (!avatars.pathInsidePrefix(path, avatars.avatarPrefix(subscriber.id))) {
        return json({ error: 'invalid_storage_path' }, { statusCode: 400 });
      }
      if (path === subscriber.avatar_path) return json({ error: 'avatar_in_use' }, { statusCode: 409 });
      await avatars.removeAvatarObject(sb, subscriber.id, path);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const { error: updateError } = await sb.from('subscribers')
        .update({ avatar_path: null, avatar_url: null }).eq('id', subscriber.id);
      if (updateError) throw updateError;
      if (subscriber.avatar_path) {
        try { await avatars.removeAvatarObject(sb, subscriber.id, subscriber.avatar_path); }
        catch (error) { console.warn('[subscriber_avatar_delete_failed]', error?.message || error); }
      }
      return json({ ok: true, avatar_url: null });
    }

    if (action !== 'commit') return json({ error: 'invalid_action' }, { statusCode: 400 });
    const descriptor = avatars.avatarDescriptor(body);
    const path = String(body.file_path || '');
    await avatars.verifyUploadedAvatar(sb, subscriber.id, path, descriptor);
    const { data: signedUrl, error: signedError } = await sb.storage.from(avatars.BUCKET)
      .createSignedUrl(path, avatars.SIGNED_READ_TTL_SECONDS);
    if (signedError) throw signedError;
    if (!signedUrl?.signedUrl) throw new Error('avatar_signed_url_missing');

    const { error: updateError } = await sb.from('subscribers')
      .update({ avatar_path: path, avatar_url: null }).eq('id', subscriber.id);
    if (updateError) {
      try { await avatars.removeAvatarObject(sb, subscriber.id, path); }
      catch (cleanupError) { console.warn('[subscriber_avatar_cleanup_failed]', cleanupError?.message || cleanupError); }
      throw updateError;
    }
    if (subscriber.avatar_path && subscriber.avatar_path !== path) {
      try { await avatars.removeAvatarObject(sb, subscriber.id, subscriber.avatar_path); }
      catch (cleanupError) { console.warn('[subscriber_avatar_cleanup_failed]', cleanupError?.message || cleanupError); }
    }
    return json({ ok: true, avatar_url: signedUrl.signedUrl });
  } catch (error) {
    if (error?.statusCode === 400) return json({ error: error.code || error.message || 'invalid_avatar' }, { statusCode: 400 });
    return serverError(error, 'subscriber.avatar');
  }
};
