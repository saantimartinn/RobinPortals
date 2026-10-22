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
  const requiredDocs = [];
  try {
    for (const raw of (payload.required_docs || [])) {
      const { template_file: templateFile, ...document } = raw;
      if (templateFile) {
        const upload = await uploadFileDirect(templateFile, { purpose: "career_template" });
        uploaded.push({ ...upload, purpose: "career_template" });
        document.template_path = upload.path;
        document.template_filename = upload.filename;
        document.template_mime = upload.mime;
        document.template_size = upload.size;
      }
      requiredDocs.push(document);
    }
  } catch (error) {
    await Promise.all(uploaded.map(cancelDirectUpload));
    throw error;
  }
  return api.post("/api/admin/careers", { ...payload, required_docs: requiredDocs });
}
export async function adminCareersDelete(id) { return api.post("/api/admin/careers/delete", { id }); }
export async function adminCareersAssign(userId, careerTemplateId) {
  return api.post("/api/admin/careers/assign", { user_id: userId, career_template_id: careerTemplateId });
}
export async function adminCareersUnassign(userId, careerTemplateId) {
  return api.post("/api/admin/careers/assign", { user_id: userId, career_template_id: careerTemplateId, action: "unassign" });
}

