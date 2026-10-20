import { api } from "./core.js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function cancelAvatarUpload(path) {
  try { await api.post("/api/profile/avatar", { action: "cancel", file_path: path }); }
  catch (error) { console.warn("[avatar_upload_cleanup_failed]", error && error.message); }
}

export async function profileAvatarUpload(file) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0) throw new Error("La imagen está vacía o no es válida.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("La imagen puede ocupar como máximo 5 MB.");
  const mime = String(file.type || "").toLowerCase();
  if (!AVATAR_TYPES.has(mime)) throw new Error("Usa una imagen JPG, PNG o WEBP.");
  const ticket = await api.post("/api/profile/avatar", {
    action: "upload_ticket",
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
      headers: { "Content-Type": mime, "cache-control": "no-store", "x-upsert": "false" },
      body: file,
    });
  } catch (_error) {
    await cancelAvatarUpload(upload.path);
    throw new Error("No se pudo conectar con Storage.");
  }
  if (!response.ok) {
    await cancelAvatarUpload(upload.path);
    throw new Error("No se pudo subir la imagen.");
  }
  try {
    return await api.post("/api/profile/avatar", {
      action: "commit",
      file_path: upload.path,
      file_filename: file.name,
      file_mime: mime,
      file_size: file.size,
    });
  } catch (error) {
    await cancelAvatarUpload(upload.path);
    throw error;
  }
}

// Guarda el campo "ha vivido fuera" del perfil. Si payload.user_id está presente y
// el llamante es admin, edita ese alumno; si no, edita el propio (sólo la 1ª vez).
export async function livedAbroadSave(payload) {
  return api.post("/api/profile/lived-abroad", payload);
}

