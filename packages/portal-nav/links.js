const env = import.meta.env || {};

const admin = (env.VITE_ROBIN_ADMIN_URL || 'https://project-robin.com').replace(/\/$/, '');
const robinJr = (env.VITE_ROBINJR_URL || 'https://robinjr.netlify.app').replace(/\/$/, '');
const portal = (env.VITE_ROBIN_PORTAL_URL || 'https://project-robin.com').replace(/\/$/, '');
const community = (env.VITE_ROBIN_COMMUNITY_URL || 'https://project-robin.com').replace(/\/$/, '');
export const ROBIN_LOGIN_URL = env.VITE_ROBIN_LOGIN_URL || 'https://project-robin.com/login';

export function loginUrl(next) {
  const url = new URL(ROBIN_LOGIN_URL, window.location.origin);
  if (next) url.searchParams.set('next', next);
  return url.toString();
}

export const ROBIN_LINKS = [
  [`${admin}/admin`, 'Inicio', 'admin'],
  [`${robinJr}/portal/`, 'RobinJr', 'robinjr'],
  [`${portal}/portal/`, 'Portal del Alumno', 'application'],
  [`${community}/therobinplan/`, 'Robin Community', 'subscriptions'],
  [`${admin}/admin/crm`, 'CRM', 'admin-crm'],
  [`${admin}/admin/analiticas/ventas`, 'Otras métricas', 'admin-analytics'],
];
