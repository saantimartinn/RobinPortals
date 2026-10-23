// Cloudflare Worker on project-robin.com: the apps (portal, RobinJr, Robin Community
// and admin) live on one Netlify site and are served under their own paths; every
// other path is the public website. Paths are passed through unchanged.
// Replaces apps/portal/infrastructure/cloudflare/project-robin-router.js, which
// split the apps across four sites and rewrote their paths.
const APPS_ORIGIN = "https://robinportals.netlify.app";
const LEGACY_CALLBACKS = new Map([
  ["/portal/api/notion/webhook", ["https://santipruebas.netlify.app", "/api/notion/webhook"]],
  ["/portal/api/meet/webhook", ["https://santipruebas.netlify.app", "/api/meet/webhook"]],
  ["/portal/api/revolut/webhook", ["https://santipruebas.netlify.app", "/api/revolut/webhook"]],
  ["/therobinplan/api/stripe/webhook", ["https://suscriptions-santi.netlify.app", "/api/stripe/webhook"]],
]);

const APPS_PATH = /^\/(portal|robinjr|therobinplan|admin)(\/|$)|^\/login\/?$|^\/api\/(admin|internal)(\/|$)/;

export function upstreamFor(url) {
  // Preserve registered, signed callbacks while the two sites run together.
  const legacy = LEGACY_CALLBACKS.get(url.pathname);
  if (legacy) return new URL(legacy[1] + url.search, legacy[0]);
  return APPS_PATH.test(url.pathname) ? new URL(url.pathname + url.search, APPS_ORIGIN) : null;
}

export default {
  async fetch(request) {
    const upstream = upstreamFor(new URL(request.url));
    if (!upstream) return fetch(request);

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", new URL(request.url).host);
    // The apps check Origin against ALLOWED_ORIGINS, which includes the apps site.
    headers.set("Origin", upstream.origin);
    return fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    }));
  },
};
