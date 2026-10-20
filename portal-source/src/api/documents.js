import { api } from "./core.js";

import { cancelDirectUpload, uploadFileDirect } from "./uploads.js";

// ----- DOCUMENTOS -----
export async function documentsList() { return api.get("/api/documents"); }
export async function documentsGet(id) { return api.get("/api/documents/get?id=" + encodeURIComponent(id)); }
export async function documentsUpload(documentId, file) {
  const upload = await uploadFileDirect(file, { purpose: "document", document_id: documentId });
  return api.post("/api/documents/upload", {
    id: documentId,
    file_path: upload.path,
    file_filename: upload.filename,
    file_mime: upload.mime,
    file_size: upload.size,
  });
}
export async function adminDocumentsList(userId) { return api.get("/api/admin/documents?user_id=" + encodeURIComponent(userId)); }
export async function adminDocumentsReview(id, decision, reason) {
  return api.post("/api/admin/documents/review", { id, decision, rejection_reason: reason });
}
export async function adminDocumentsAdd(payload, templateFile) {
  if (!templateFile) return api.post("/api/admin/documents/add", payload);
  const upload = await uploadFileDirect(templateFile, {
    purpose: "document_template",
    user_id: payload.user_id,
  });
  return api.post("/api/admin/documents/add", {
    ...payload,
    template_path: upload.path,
    template_filename: upload.filename,
    template_mime: upload.mime,
    template_size: upload.size,
  });
}
export async function adminDocumentsDelete(id) { return api.post("/api/admin/documents/delete", { id }); }

