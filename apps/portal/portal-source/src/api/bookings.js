// Browser API client for bookings; keeps endpoint and fetch details out of the screens.
import { api } from "./core.js";

// ----- BOOKINGS (reservas Google Meet) -----
export async function bookingsList(userId) {
  const qs = userId ? ("?user_id=" + encodeURIComponent(userId)) : "";
  return api.get("/api/bookings" + qs);
}
export async function bookingsCreate(payload) {
  return api.post("/api/bookings/create", payload);
}
export async function bookingsAvailability(params) {
  const p = params || {};
  const qs = new URLSearchParams();
  if (p.from) qs.set("from", p.from);
  if (p.days) qs.set("days", String(p.days));
  const s = qs.toString();
  return api.get("/api/bookings/availability" + (s ? ("?" + s) : ""));
}

