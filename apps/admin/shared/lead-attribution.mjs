// Canonical Meta attribution for website landings, shared by ingestion and UI.
export function metaCampaignForLanding(pageUrl, createdAt) {
  try {
    const url = new URL(String(pageUrl || ''), 'https://project-robin.com');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    if (['/webinar21-11', '/webianr21-11'].includes(path)) return 'Webinar 21-11';
    if (path === '/veteaholanda') return 'Campaña continua Candela';
    if (['/vaparaaholanda', '/vaparaholanda'].includes(path)) {
      return Date.parse(createdAt || new Date().toISOString()) >= Date.parse('2026-11-15T00:00:00Z')
        ? 'PORTUGAL II' : 'Portugal';
    }
    return null;
  } catch (_) { return null; }
}
