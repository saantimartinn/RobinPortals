// Browser API client for careers; keeps endpoint and fetch details out of the screens.
import { api } from "./core.js";

import { cancelDirectUpload, uploadFileDirect } from "./uploads.js";

// ----- CARRERAS -----
export async function careersListMine() { return api.get("/api/careers"); }
export async function adminCareersListAll(userId) {
  const userQuery = userId ? `&user_id=${encodeURIComponent(userId)}` : "";
  return api.get(`/api/careers?all=1${userQuery}`);
}
export async function adminCareersCreate(payload) {
  const uploaded = [];
  try {
    const { photo_file: photoFile, ...careerPayload } = payload;
    let photo = null;
    if (photoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) throw new Error("La foto debe ser JPG, PNG o WEBP.");
      if (photoFile.size > 8 * 1024 * 1024) throw new Error("La foto no puede superar los 8 MB.");
      photo = await uploadFileDirect(photoFile, { purpose: "career_template" });
      uploaded.push({ ...photo, purpose: "career_template" });
    }
    const { image_url: _imageUrl, ...safeCareerPayload } = careerPayload;
    return await api.post("/api/admin/careers", {
      ...safeCareerPayload,
      ...(photo ? {
        image_path: photo.path,
        image_filename: photo.filename,
        image_mime: photo.mime,
        image_size: photo.size,
      } : {}),
    });
  } catch (error) {
    await Promise.all(uploaded.map(cancelDirectUpload));
    throw error;
  }
}
export async function adminCareersDelete(id) { return api.post("/api/admin/careers/delete", { id }); }
export async function adminCareersAssign(userId, careerTemplateId) {
  return api.post("/api/admin/careers/assign", { user_id: userId, career_template_id: careerTemplateId });
}
export async function adminCareersUnassign(userId, careerTemplateId) {
  return api.post("/api/admin/careers/assign", { user_id: userId, career_template_id: careerTemplateId, action: "unassign" });
}
