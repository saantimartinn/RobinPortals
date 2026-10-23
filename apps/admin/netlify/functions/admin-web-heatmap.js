/**
 * GET /api/admin/web/heatmap?pages=1&from&to              → páginas con clics (selector)
 * GET /api/admin/web/heatmap?path=/destinos/&device=mobile&from&to → clics y scroll de esa página
 * El panel abre la página real en un iframe y pinta el mapa por encima.
 */
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { requireWebAdmin, readRange, rangeBounds } = require('../../lib/web-analytics-auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  try {
    const auth = await requireWebAdmin(event);
    if (auth.error) return auth.error;
    const q = event.queryStringParameters || {};
    const range = readRange(event);
    const { fromTs, toTs } = rangeBounds(range);
    const sb = getAdminSupabase();
    const siteUrl = (process.env.WEB_PUBLIC_URL || 'https://project-robin.com').replace(/\/+$/, '');

    if (q.pages === '1') {
      const { data, error } = await sb.rpc('web_heatmap_pages', { p_from: fromTs, p_to: toTs });
      if (error) throw error;
      return json({ range, siteUrl, pages: data || [] });
    }
    const path = String(q.path || '/').slice(0, 300);
    if (!path.startsWith('/') || path.startsWith('//')) return json({ error: 'path_invalido' }, { statusCode: 400 });
    const device = ['mobile', 'tablet', 'desktop'].includes(q.device) ? q.device : 'desktop';
    const { data, error } = await sb.rpc('web_heatmap', { p_path: path, p_device: device, p_from: fromTs, p_to: toTs });
    if (error) throw error;
    // The historic RPC omits the document height. Recent click events record
    // it as `ph`, so the panel can size its own overlay without a script on
    // the public website.
    const { data: samples, error: sampleError } = await sb.from('web_events')
      .select('data').eq('type', 'click').eq('path', path).eq('device', device)
      .gte('event_at', fromTs).lt('event_at', toTs)
      .order('event_at', { ascending: false }).limit(150);
    if (sampleError) console.warn('heatmap height sample unavailable', sampleError.code);
    const heights = (samples || []).map((row) => Number(row.data?.ph))
      .filter((height) => Number.isFinite(height) && height >= 1000 && height <= 40000);
    return json({ range, siteUrl, ...data, page_height: heights.length ? Math.max(...heights) : null });
  } catch (error) {
    return serverError(error, 'admin.web_heatmap');
  }
};
