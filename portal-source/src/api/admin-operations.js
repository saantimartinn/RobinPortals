import { api } from "./core.js";

// ----- FASE APLICACIÓN -----
export async function adminPhaseSet(userId, phase) { return api.post("/api/admin/phase", { user_id: userId, phase }); }


// ----- ADMIN DASHBOARD -----
export async function adminDashboard() {
  return api.get("/api/admin/dashboard");
}
export async function adminTaskCreate(payload) {
  return api.post("/api/admin/tasks", { action: "create", ...payload });
}
export async function adminTaskToggle(id) {
  return api.post("/api/admin/tasks", { action: "toggle", id });
}
export async function adminTaskDelete(id) {
  return api.post("/api/admin/tasks", { action: "delete", id });
}


// ----- ADMIN ASSISTANT (chat IA) + HISTORIAL -----
export async function adminAssistant(messages, focusUserId) {
  return api.post("/api/admin/assistant", { messages, focus_user_id: focusUserId || null });
}
export async function adminHistorialAdd(payload) {
  return api.post("/api/admin/historial/add", payload);
}


// ----- ADMIN · SUGERENCIAS DE CARRERAS (IA) -----
export async function adminCareerSuggestions(userId) {
  return api.get("/api/admin/career-suggestions?user_id=" + encodeURIComponent(userId));
}
export async function adminCareerSuggestionsRegenerate(userId) {
  return api.post("/api/admin/career-suggestions", { user_id: userId, action: "regenerate" });
}
export async function adminCareerSuggestionFeedback(userId, programCode, decision) {
  return api.post("/api/admin/career-suggestions", {
    user_id: userId,
    action: "feedback",
    program_code: programCode,
    decision,
  });
}


