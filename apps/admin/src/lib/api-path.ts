/** Route admin API calls on the shared Robin site. Admin functions live at the
 * site root (/api/admin, /api/internal, ...); the shared portal authentication
 * and profile endpoints live under /portal/api. */
export function apiPath(path: string): string {
  if (typeof window === "undefined" || !/^\/(api)\//.test(path)) return path;

  const pathname = window.location.pathname;
  const usesPortalProxy = ["/portal", "/login"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPortalEndpoint = !/^\/api\/(admin|internal)\//.test(path);

  return usesPortalProxy || (isAdminRoute && isPortalEndpoint)
    ? `/portal${path}`
    : path;
}
