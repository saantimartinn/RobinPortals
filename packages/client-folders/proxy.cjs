'use strict';

async function proxyClientFolders(event) {
  const secret = process.env.CLIENT_FOLDER_SYNC_SECRET;
  const site = process.env.ROBIN_SITE_URL || process.env.URL;
  if (!secret || !site) throw new Error('client_folder_sync_not_configured');
  const endpoint = new URL('/api/admin/client-folders', site);
  const response = await fetch(endpoint, {
    method: event.httpMethod,
    headers: { 'content-type': 'application/json', 'x-robin-folder-secret': secret },
    body: event.httpMethod === 'POST' ? String(event.body || '{}') : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  return { statusCode: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body };
}

module.exports = { proxyClientFolders };
