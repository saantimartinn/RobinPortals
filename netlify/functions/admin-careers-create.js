/**
 * POST /api/admin/careers
 * Body: { name, university, city, details, image_path }
 */
const { getSupabase } = require('../../lib/supabase');
const storage = require('../../lib/storage');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin, normalizeEmail } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const templateId = body.id ? String(body.id) : null;
  const name = String(body.name || '').trim();
  const university = String(body.university || '').trim();
  const city = body.city ? String(body.city).trim() : null;
  const detailsInput = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
  const details = {
    area: String(detailsInput.area || '').trim().slice(0, 160),
    description: String(detailsInput.description || '').trim().slice(0, 2000),
    subjects: Array.isArray(detailsInput.subjects) ? detailsInput.subjects.map((item) => String(item || '').trim().slice(0, 120)).filter(Boolean).slice(0, 20) : [],
    requirements: Array.isArray(detailsInput.requirements) ? detailsInput.requirements.map((item) => String(item || '').trim().slice(0, 240)).filter(Boolean).slice(0, 20) : [],
  };
  const imagePath = body.image_path ? String(body.image_path) : null;
  if (!name || !university) return json({ error: 'missing_fields' }, { statusCode: 400 });

  try {
    const sb = getSupabase();
    const { data: admin } = await sb.from('users').select('id, email, username, role').eq('id', session.uid).single();
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const adminEmail = normalizeEmail(admin);
    const isAdmin = isApplicationAdmin(admin);
    if (!isAdmin) return json({ error: 'forbidden' }, { statusCode: 403 });

    let previousTemplate = null;
    if (templateId) {
      const { data, error } = await sb.from('career_templates').select('*').eq('id', templateId).single();
      if (error || !data) return json({ error: 'career_not_found' }, { statusCode: 404 });
      previousTemplate = data;
    }

    const uploadedCareerImages = [];
    if (imagePath) {
      const isNewUpload = !!body.image_size;
      const isExistingImage = !!previousTemplate && previousTemplate.image_path === imagePath;
      const imageType = String(body.image_mime || '').toLowerCase();
      const imageAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(imageType);
      const keyPrefix = `career-templates/${admin.id}`;
      if (isNewUpload) {
        if (!storage.pathInsidePrefix(imagePath, keyPrefix) || !imageAllowed) {
          return json({ error: 'invalid_career_image' }, { statusCode: 400 });
        }
        const descriptor = storage.uploadDescriptor({
          filename: body.image_filename,
          contentType: imageType,
          size: body.image_size,
        }, { maxBytes: 8 * 1024 * 1024 });
        if (!descriptor.ok) return json({ error: descriptor.error }, { statusCode: 400 });
        uploadedCareerImages.push(imagePath);
        try {
          await storage.verifyUploadedObject(sb, imagePath, {
            keyPrefix,
            contentType: descriptor.contentType,
            size: descriptor.size,
            maxBytes: 8 * 1024 * 1024,
          });
        } catch (verificationError) {
          await storage.removeObject(sb, imagePath);
          return json({ error: verificationError.message || 'invalid_career_image' }, { statusCode: 400 });
        }
      } else if (!isExistingImage) {
        return json({ error: 'invalid_storage_path' }, { statusCode: 400 });
      }
    } else if (!previousTemplate?.image_path) {
      return json({ error: 'career_image_required' }, { statusCode: 400 });
    }
    const query = templateId
      ? sb.from('career_templates').update({ name, university, city, required_docs: [], details, image_path: imagePath }).eq('id', templateId)
      : sb.from('career_templates').insert({ name, university, city, required_docs: [], details, image_path: imagePath, created_by: adminEmail });
    const { data, error } = await query.select().single();
    if (error) {
      for (const path of uploadedCareerImages) await storage.removeObject(sb, path);
      throw error;
    }
    if (previousTemplate?.image_path && previousTemplate.image_path !== imagePath) {
      await storage.removeObject(sb, previousTemplate.image_path);
    }

    return json({ ok: true, template: data });
  } catch (e) {
    console.error('admin-careers-create error', e);
    return serverError(e);
  }
};
