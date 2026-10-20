import { api } from "./core.js";

export async function login(username, password) {
  return api.post("/api/auth/login", { username, password });
}
export async function logout() {
  try { await api.post("/api/auth/logout"); } catch (error) { console.warn("[api] optional operation failed", error && error.message); }
}
export async function me() {
  return api.get("/api/me");
}
export async function onboardingState() {
  return api.get("/api/onboarding/state");
}
export async function originSave(payload) {
  return api.post("/api/onboarding/origin", payload);
}
const MAX_DNI_IMAGE_BYTES = 10 * 1024 * 1024;
const DNI_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function validateDniImage(file) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new Error("La imagen está vacía o no es válida.");
  }
  if (file.size > MAX_DNI_IMAGE_BYTES) throw new Error("Cada imagen puede ocupar como máximo 10 MB.");
  const mime = String(file.type || "").toLowerCase();
  if (!DNI_IMAGE_TYPES.has(mime)) throw new Error("Usa una imagen JPG, PNG, WEBP o GIF.");
  return mime;
}

async function cancelDniImage(upload, docType) {
  try {
    await api.post("/api/onboarding/dni/extract", {
      action: "cancel",
      doc_type: docType,
      side: upload.side,
      file_path: upload.path,
    });
  } catch (error) { console.warn("[dni_upload_cleanup_failed]", error && error.message); }
}

async function uploadDniImage(file, side, docType) {
  const mime = validateDniImage(file);
  const ticket = await api.post("/api/onboarding/dni/extract", {
    action: "upload_ticket",
    doc_type: docType,
    side,
    file_filename: file.name,
    file_mime: mime,
    file_size: file.size,
  });
  const upload = ticket && ticket.upload;
  if (!upload?.signed_url || !upload?.path) throw new Error("No se pudo preparar la subida segura.");

  let response;
  try {
    response = await fetch(upload.signed_url, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "cache-control": "no-store",
        "x-upsert": "false",
      },
      body: file,
    });
  } catch (error) {
    await cancelDniImage({ side, path: upload.path }, docType);
    throw new Error("No se pudo conectar con el almacenamiento seguro.");
  }
  if (!response.ok) {
    await cancelDniImage({ side, path: upload.path }, docType);
    throw new Error("No se pudo subir la imagen al almacenamiento seguro.");
  }
  return { side, path: upload.path, filename: file.name, mime, size: file.size };
}

export async function dniExtract(anverso, reverso, docType) {
  const normalizedType = docType === "passport" ? "passport" : "dni";
  const uploaded = [];
  try {
    uploaded.push(await uploadDniImage(anverso, "anverso", normalizedType));
    if (normalizedType === "dni") {
      uploaded.push(await uploadDniImage(reverso, "reverso", normalizedType));
    }
  } catch (error) {
    await Promise.all(uploaded.map((item) => cancelDniImage(item, normalizedType)));
    throw error;
  }

  const payload = {
    action: "extract",
    doc_type: normalizedType,
    anverso: uploaded.find((item) => item.side === "anverso"),
    reverso: uploaded.find((item) => item.side === "reverso") || null,
  };
  try {
    return await api.post("/api/onboarding/dni/extract", payload);
  } catch (error) {
    if (error.status) await Promise.all(uploaded.map((item) => cancelDniImage(item, normalizedType)));
    throw error;
  }
}
export async function dniSave(fields) {
  return api.post("/api/onboarding/dni/save", fields);
}
export async function profileSave(payload) {
  return api.post("/api/onboarding/profile", payload);
}

