// Shell or navigation module for cross portal nav; local authentication state stays in the application layer.
import React from "react";
import { LogOut } from "lucide-react";
import robinWordmark from "../assets/robin-wordmark.png";
import { canAdminSee, firstAllowedAdminUrl } from "../admin-permissions.js";
import "./cross-portal-nav.css";

const LINKS = [
  ["/admin", "Inicio", "admin", "home."],
  ["/portal/", "Portal del Alumno", "application", "platform.student_portal"],
  ["/therobinplan/", "The Robin Plan", "subscriptions", "platform.robin_plan"],
  ["/admin/crm", "CRM", "admin", "crm."],
  ["/admin/analiticas/ventas", "Otras métricas", "admin", "analytics."],
];

export function CrossPortalNav({ current = "subscriptions", user = null, onLogout }) {
  if (!user?.is_application_admin) return null;
  const accountName = [user?.nombre, user?.apellidos].filter(Boolean).join(" ") || user?.username || user?.email;
  const allowed = (permission) => permission.endsWith('.')
    ? user.is_pro_admin === true || Array.isArray(user.visible_tabs) && user.visible_tabs.some((tab) => tab.startsWith(permission))
    : canAdminSee(user, permission);
  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href={firstAllowedAdminUrl(user)} aria-label="Robin Admin Platform, inicio">
        <img src={robinWordmark} alt="ROBIN" />
        <span>ADMIN<br />PLATFORM</span>
      </a>
      <nav aria-label="Navegación de Robin">
        {LINKS.filter(([, , , permission]) => allowed(permission)).map(([href, label, key]) => {
          const isActive = key === current;
          return <a key={href} href={href} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
        })}
      </nav>
      {accountName ? <div className="robin-cross-actions">
        <span className="robin-cross-account">{accountName}</span>
        <button className="robin-cross-icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>
      </div> : null}
    </header>
  );
}
