'use strict';

/** Base URL of the shared Robin apps site, used for server-to-server calls
 * between apps (common login, SSO verification, shared identity). */
function siteUrl() {
  return String(process.env.ROBIN_SITE_URL || process.env.URL || 'https://project-robin.com')
    .trim()
    .replace(/\/$/, '');
}

module.exports = { siteUrl };
