# Browser security

## Enforced headers

Global Netlify headers now provide:

- `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- one-year HSTS including subdomains, without preload commitment;
- a restrictive Permissions Policy for camera, microphone, geolocation, payment,
  USB and browsing topics;
- `X-Permitted-Cross-Domain-Policies: none`;
- an enforced Content Security Policy.

Both public `/api/*` routes and direct `/.netlify/functions/*` routes declare
`Cache-Control: no-store`. JSON responses also set it inside the Function so private
data does not depend on CDN rule application.

## CSP rationale

Browser API calls are same-origin, except PUT requests to short-lived signed upload URLs
at `ljavwdqrffkkblmyatuq.supabase.co`. Revolut Checkout is reached by top-level
navigation to a server-returned URL, not by loading provider scripts or frames. The
portal has no iframes or WebSockets.

- scripts: same origin only;
- connections: same origin plus the single authorized Supabase Storage host for signed uploads;
- styles: same origin plus inline styles, required by the current React components;
- images: same origin, `data:`, `blob:` and HTTPS because user/admin-managed avatars,
  logos, mentor photos and signed Storage URLs can be remote;
- fonts: same origin/data;
- frames and plugins: disabled;
- base/form targets: same origin;
- insecure subresources: upgraded.

Allowing all HTTPS image origins is the main residual breadth. It preserves current
admin-editable URL behavior; narrowing it requires an allowlist or proxy/storage
policy for every image source.

## Cookies, CORS and mixed content

Session cookies remain HTTP-only, Secure, SameSite=Lax, root-scoped and seven-day.
Authorization is backend-side. Browser API requests use same-origin credentials and
the Functions do not add permissive CORS headers. Provider webhooks are server-to-
server and authenticate with secrets/signatures, so they do not need browser CORS.

## Deployment verification

After Netlify deploys this commit, inspect `/portal/` and one `/api/*` response with
browser devtools or `curl -I`. Confirm CSP/HSTS/Permissions-Policy and test login,
remote images, document previews and Revolut redirection. Local tests validate the
declared policy but cannot prove CDN header application.

No Supabase or external integration was accessed while creating these headers.
