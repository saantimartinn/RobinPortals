import { api } from "./core.js";

// ----- Notificaciones -----
export async function adminNotificationsList() {
  return api.get("/api/admin/notifications");
}
export async function adminNotificationCreate(payload) {
  // payload: { title, content, type: 'info'|'terms', user_ids: [] }
  return api.post("/api/admin/notifications", payload);
}
export async function notificationsPending() {
  return api.get("/api/notifications");
}
export async function notificationAck(notificationId, action) {
  // action: 'seen' | 'accept'
  return api.post("/api/notifications/ack", { notification_id: notificationId, action });
}

