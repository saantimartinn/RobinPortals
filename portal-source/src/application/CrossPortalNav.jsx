import React from "react";
import { LogOut, RefreshCw } from "lucide-react";
import robinWordmark from "../assets/robin-wordmark.png";
import { isAdminUser } from "../session.js";
import "./cross-portal-nav.css";

const LINKS = [
  ["/admin", "Inicio", "admin"],
  ["/portal/", "Portal del Alumno", "application"],
  ["/therobinplan/", "The Robin Plan", "subscriptions"],
  ["/admin/crm", "CRM", "admin"],
  ["/admin/analiticas/ventas", "Otras métricas", "admin"],
];

export function CrossPortalNav({ current = "application", user = null, onLogout, onRefresh }) {
  if (!isAdminUser(user)) return null;

  const accountName = [user?.nombre, user?.apellidos].filter(Boolean).join(" ") || user?.username || user?.email;
  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href="/admin" aria-label="Robin Admin Platform, inicio">
        <img src={robinWordmark} alt="ROBIN" />
        <span>ADMIN<br />PLATFORM</span>
      </a>
      <nav aria-label="Navegación de Robin">
        {LINKS.map(([href, label, key], index) => {
          const isActive = current === "admin" ? index === 0 : key === current;
          return <a key={href} href={href} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
        })}
      </nav>
      <div className="robin-cross-actions">
        <span className="robin-cross-account">{accountName}</span>
        {onRefresh && <button className="robin-cross-icon-button" type="button" onClick={onRefresh} aria-label="Recargar" title="Recargar"><RefreshCw size={18} /></button>}
        <button className="robin-cross-icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>
      </div>
    </header>
  );
}
