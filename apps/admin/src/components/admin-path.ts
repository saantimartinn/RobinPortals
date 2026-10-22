// Admin interface component for admin path; composed by the shell or a feature module.
// The admin is always served under /admin of the shared Robin site.
export function adminPath(path: string) {
  return `/admin${path === "/" ? "" : path}`;
}
