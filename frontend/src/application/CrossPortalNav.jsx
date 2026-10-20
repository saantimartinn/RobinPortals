import React from "react";
import robinWordmark from "../assets/robin-wordmark.png";
import "./cross-portal-nav.css";

const LINKS = [
  ["/admin", "Inicio", "admin"],
  ["/login", "Portal del Alumno", "application"],
  ["/therobinplan/", "The Robin Plan", "subscriptions"],
  ["/admin/crm", "CRM", "admin"],
  ["/admin/analiticas/ventas", "Otras métricas", "admin"],
];

export function CrossPortalNav({ current = "subscriptions", user = null, onLogout }) {
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
      {accountName ? <>
        <span className="robin-cross-account">{accountName}</span>
        <button className="robin-cross-logout" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">↪</button>
      </> : <a className="robin-cross-admin" href="/admin" title="Abrir Robin Admin">Administración <span aria-hidden="true">↗</span></a>}
    </header>
  );
}
