const { parse: parseCookies } = require('cookie');

const APPLICATION_ME_URL = 'https://project-robin.com/portal/api/me';

async function readApplicationIdentity(event) {
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const token = parseCookies(cookieHeader).robin_portal_session;
  if (!token) return null;
  const response = await fetch(APPLICATION_ME_URL, {
    headers: { Cookie: `robin_portal_session=${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

function canUseRobinPlan(identity) {
  if (!identity?.is_application_admin) return false;
  if (identity.is_pro_admin) return true;
  return Array.isArray(identity.visible_tabs) && identity.visible_tabs.includes('platform.robin_plan');
}

module.exports = { readApplicationIdentity, canUseRobinPlan };
