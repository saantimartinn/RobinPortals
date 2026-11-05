export function clientFolderKey(source, client) {
  return source === 'crm' || client.lead_id ? `lead:${source === 'crm' ? client.id : client.lead_id}` : `${source}:${client.id}`;
}

export function folderPath(folders, selectedId) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path = [];
  const seen = new Set();
  for (let folder = selectedId ? byId.get(selectedId) : null; folder && !seen.has(folder.id); folder = folder.parent_id ? byId.get(folder.parent_id) : null) {
    path.unshift(folder);
    seen.add(folder.id);
  }
  return path;
}

export function clientsInFolder(clients, items, source, folderId) {
  const assignments = new Map(items.map((item) => [item.client_key, item.folder_id]));
  return clients.filter((client) => (assignments.get(clientFolderKey(source, client)) || null) === folderId);
}
