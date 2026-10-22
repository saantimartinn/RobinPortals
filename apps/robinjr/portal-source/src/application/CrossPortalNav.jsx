// Common Robin navigation; product backends decide whether the current identity has an account.
import React from "react";
import { LogOut, RefreshCw } from "lucide-react";
import robinWordmark from "../assets/robin-wordmark.png";
import { isAdminUser } from "../session.js";
import "./cross-portal-nav.css";

const LINKS = [
  ["https://project-robin.com/admin", "Inicio", "admin"],
  ["https://robinjr.netlify.app/portal/", "RobinJr", "robinjr"],
  ["https://project-robin.com/portal/", "Portal del Alumno", "application"],
  ["https://project-robin.com/therobinplan/", "Robin Community", "subscriptions"],
  ["https://project-robin.com/admin/crm", "CRM", "admin-crm"],
  ["https://project-robin.com/admin/analiticas/ventas", "Otras métricas", "admin-analytics"],
];
const STUDENT_KEYS = new Set(["robinjr", "application", "subscriptions"]);

export function CrossPortalNav({ current = "robinjr", user = null, onLogout, onRefresh }) {
  if (!user) return null;
  const isAdmin = isAdminUser(user);
  const accountName = [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email;
  const links = isAdmin ? LINKS : LINKS.filter(([, , key]) => STUDENT_KEYS.has(key));

  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href={isAdmin ? LINKS[0][0] : LINKS[1][0]} aria-label={isAdmin ? "Robin Admin Platform, inicio" : "RobinJr, inicio"}>
        <img src={robinWordmark} alt="ROBIN" />
        {isAdmin ? <span>ADMIN<br />PLATFORM</span> : <span>ROBIN<br />JR</span>}
      </a>
      <nav aria-label="Navegación de Robin">
        {links.map(([href, label, key]) => {
          const isActive = (current === "admin" && key === "admin") || key === current;
          const onClick = key === current ? (event) => event.preventDefault() : undefined;
          return <a key={key} href={href} onClick={onClick} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
        })}
      </nav>
      {accountName ? (
        <div className="robin-cross-actions">
          <span className="robin-cross-account">{accountName}</span>
          {onRefresh && <button className="robin-cross-icon-button" type="button" onClick={onRefresh} aria-label="Recargar" title="Recargar"><RefreshCw size={18} /></button>}
          {onLogout && <button className="robin-cross-icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>}
        </div>
      ) : null}
    </header>
  );
}
