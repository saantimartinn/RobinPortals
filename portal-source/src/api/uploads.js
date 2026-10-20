import { api } from "./core.js";

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export async function uploadFileDirect(file, context) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0) throw new Error("Archivo vacío o inválido.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("El archivo supera el máximo de 20 MB.");
  const mime = (file.type || "application/octet-stream").toLowerCase();
  const ticket = await api.post("/api/documents/upload-ticket", {
    ...context,
    file_filename: file.name,
    file_mime: mime,
    file_size: file.size,
  });
  const upload = ticket && ticket.upload;
  if (!upload?.signed_url || !upload?.path) throw new Error("No se pudo preparar la subida.");
  let response;
  try {
    response = await fetch(upload.signed_url, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "cache-control": "max-age=3600",
        "x-upsert": "false",
      },
      body: file,
    });
  } catch (error) {
    await cancelDirectUpload({ ...context, path: upload.path });
    throw new Error("No se pudo conectar con Storage.");
  }
  if (!response.ok) {
    await cancelDirectUpload({ ...context, path: upload.path });
    throw new Error("No se pudo subir el archivo a Storage.");
  }
  return { ...context, path: upload.path, filename: file.name, mime, size: file.size };
}

export async function cancelDirectUpload(upload) {
  try {
    await api.post("/api/documents/upload-ticket", {
      action: "cancel",
      purpose: upload.purpose,
      document_id: upload.document_id,
      user_id: upload.user_id,
      file_path: upload.path,
    });
  } catch (error) { console.warn("[upload_cleanup_failed]", error && error.message); }
}
