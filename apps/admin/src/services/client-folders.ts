import { apiPath } from "@/lib/api-path";

export type Folder = { id: string; parent_id: string | null; name: string; created_at: string; updated_at: string };
export type FolderItem = { client_key: string; folder_id: string; updated_at: string };
export type FolderState = { folders: Folder[]; items: FolderItem[] };
export type FolderSource = "crm" | "alumno" | "robinjr" | "community";

export function clientFolderKey(source: FolderSource, client: { id: string; lead_id?: string | null }) {
  return source === "crm" || client.lead_id ? `lead:${source === "crm" ? client.id : client.lead_id}` : `${source}:${client.id}`;
}

async function request(method: "GET" | "POST", body?: object): Promise<any> {
  const response = await fetch(apiPath("/api/admin/client-folders"), {
    method, credentials: "same-origin", cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(({ folder_not_empty: "La carpeta debe estar vacía para eliminarla.", folder_not_found: "La carpeta ya no existe.", client_not_found: "El cliente ya no existe.", invalid_name: "Escribe un nombre de hasta 80 caracteres." } as Record<string, string>)[result.error] || result.detail || result.error || `HTTP ${response.status}`);
  return result;
}

export const clientFolders = {
  list: () => request("GET") as Promise<FolderState>,
  create: (name: string, parentId: string | null) => request("POST", { action: "create", name, parentId }),
  rename: (folderId: string, name: string) => request("POST", { action: "rename", folderId, name }),
  remove: (folderId: string) => request("POST", { action: "delete", folderId }),
  moveClient: (source: FolderSource, clientId: string, folderId: string | null) => request("POST", { action: "moveClient", source, clientId, folderId }),
};
