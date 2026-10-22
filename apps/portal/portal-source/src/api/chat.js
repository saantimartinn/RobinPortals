// Browser API client for chat; keeps endpoint and fetch details out of the screens.
import { api } from "./core.js";

// ----- CHAT CON IA (alumno) -----
export async function chatAiList() {
  return api.get("/api/chat");
}
export async function chatAiSend(content) {
  return api.post("/api/chat", { content });
}

// ----- CHAT CON IA · vista e intervención del ASESOR -----
export async function adminChatList(userId) {
  return api.get("/api/admin/chat?user_id=" + encodeURIComponent(userId));
}
export async function adminChatSend(userId, content) {
  return api.post("/api/admin/chat", { user_id: userId, content });
}
export async function adminChatResume(userId) {
  return api.post("/api/admin/chat", { user_id: userId, action: "resume" });
}


