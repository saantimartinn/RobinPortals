import { api } from "./core.js";

export async function adminListClients() {
  return api.get("/api/admin/clients");
}

export async function adminListAllClients() {
  return api.get("/api/admin/clients/all");
}
export async function adminDeveloperClients(page = 1) {
  return api.get(`/api/admin/developer-clients?page=${page}`);
}
export async function adminDeveloperClientUpdate(id, column, value) {
  return api.post("/api/admin/developer-clients", { id, column, value });
}
export async function adminAssignClient(userId) {
  return api.post("/api/admin/clients/assign", { user_id: userId });
}

