const PRO_EMAILS = new Set([
  "noel@project-robin.com",
  "maria@project-robin.com",
  "manuel@project-robin.com",
  "santimartin1203@gmail.com",
]);

export function canAdminSee(user, permission) {
  if (!user) return false;
  if (user.is_pro_admin === true || PRO_EMAILS.has(String(user.email || "").trim().toLowerCase())) return true;
  return Array.isArray(user.visible_tabs) && user.visible_tabs.includes(permission);
}

export function firstAllowedAdminUrl(user) {
  const routes = [
    ["home.summary", "/admin"],
    ["home.leads", "/admin/bandeja-leads"],
    ["home.students", "/admin/alumnos-global"],
    ["home.analytics", "/admin/analitica-global"],
    ["home.settings", "/admin/configuracion"],
    ["crm.to_contact", "/admin/crm"],
    ["crm.contacted", "/admin/crm/contactados"],
    ["crm.clients", "/admin/crm/clientes"],
    ["crm.lost", "/admin/crm/lost"],
    ["analytics.sales", "/admin/analiticas/ventas"],
    ["analytics.campaigns", "/admin/campanas"],
    ["analytics.web", "/admin/web"],
    ["analytics.operations", "/admin/analiticas/operaciones"],
  ];
  return routes.find(([permission]) => canAdminSee(user, permission))?.[1] || "/admin";
}
