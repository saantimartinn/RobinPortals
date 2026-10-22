// All Robin apps are served from one origin, so cross-portal links are same-origin paths.
// VITE_ROBIN_ORIGIN can point them at another host (for example a standalone preview).
const env = import.meta.env || {};

const origin = (env.VITE_ROBIN_ORIGIN || '').replace(/\/$/, '');
export const ROBIN_LOGIN_URL = `${origin}/login`;

export function loginUrl(next) {
  const url = new URL(ROBIN_LOGIN_URL, window.location.origin);
  if (next) url.searchParams.set('next', next);
  return url.toString();
}

export const ROBIN_LINKS = [
  [`${origin}/admin`, 'Inicio', 'admin'],
  [`${origin}/robinjr/`, 'RobinJr', 'robinjr'],
  [`${origin}/portal/`, 'Portal del Alumno', 'application'],
  [`${origin}/therobinplan/`, 'Robin Community', 'subscriptions'],
  [`${origin}/admin/crm`, 'CRM', 'admin-crm'],
  [`${origin}/admin/analiticas/ventas`, 'Otras métricas', 'admin-analytics'],
];
