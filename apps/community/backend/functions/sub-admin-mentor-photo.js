const { getSupabase } = require('../lib/supabase');
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { readApplicationIdentity, canUseRobinPlan } = require('../lib/application-permissions');
const images = require('../lib/subscriber-avatars');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (session.role !== 'subscriber_admin') return json({ error: 'forbidden' }, { statusCode: 403 });
  try {
    if (!canUseRobinPlan(await readApplicationIdentity(event))) return json({ error: 'robin_plan_access_denied' }, { statusCode: 403 });
    const body = parseJsonBody(event);
    if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
    const sb = getSupabase();
    const prefix = images.mentorPhotoPrefix(session.uid);
    if (body.action === 'upload_ticket') {
      const descriptor = images.avatarDescriptor(body);
      return json({ upload: await images.createSignedMentorUpload(sb, session.uid, descriptor) });
    }
    const path = String(body.file_path || '');
    if (!images.pathInsidePrefix(path, prefix)) return json({ error: 'invalid_storage_path' }, { statusCode: 400 });
    if (body.action === 'cancel') {
      await images.removeMentorPhotoObject(sb, session.uid, path);
      return json({ ok: true });
    }
    if (body.action !== 'commit') return json({ error: 'bad_action' }, { statusCode: 400 });
    const descriptor = images.avatarDescriptor(body);
    await images.verifyUploadedMentorPhoto(sb, session.uid, path, descriptor);
    const { data, error } = await sb.storage.from(images.BUCKET).createSignedUrl(path, images.SIGNED_READ_TTL_SECONDS);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('mentor_photo_signed_url_missing');
    return json({ ok: true, path, photo_url: data.signedUrl });
  } catch (error) {
    if (error?.statusCode === 400) return json({ error: error.code || error.message || 'invalid_image' }, { statusCode: 400 });
    return serverError(error, 'sub-admin.mentor-photo');
  }
};
