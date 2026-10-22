// Common Robin navigation. Authentication and portal membership are checked by each product backend.
import React, { useEffect, useState } from "react";
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
const STUDENT_LINKS = new Set(["robinjr", "application", "subscriptions"]);

export function CrossPortalNav({ current = "application", user = null, onLogout, onRefresh, hasSubscriptionAccess = false, checkingSubscriptionAccess = false, entryNotice = "" }) {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!user) return null;

  const isAdmin = isAdminUser(user);
  const accountName = [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email;
  const links = isAdmin ? LINKS : LINKS.filter(([, , key]) => STUDENT_LINKS.has(key));
  async function openRobinJr(event) {
    event.preventDefault();
    try {
      const response = await fetch("/portal/api/auth/sso-ticket", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "robinjr" }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ticket) throw new Error("No se pudo validar la sesión.");
      window.location.assign(LINKS[1][0] + "?sso_ticket=" + encodeURIComponent(result.ticket));
    } catch (_) {
      setNotice("No se ha podido validar tu acceso a RobinJr.");
    }
  }
  function openCommunity(event) {
    if (isAdmin || hasSubscriptionAccess || checkingSubscriptionAccess) return;
    event.preventDefault();
    setNotice("No tienes una cuenta activa en Robin Community.");
  }

  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href={isAdmin ? LINKS[0][0] : LINKS[2][0]} aria-label={isAdmin ? "Robin Admin Platform, inicio" : "Robin, portal de alumno"}>
        <img src={robinWordmark} alt="ROBIN" />
        {isAdmin ? <span>ADMIN<br />PLATFORM</span> : <span>ROBIN<br />PORTAL</span>}
      </a>
      <nav aria-label="Navegación de Robin">
        {links.map(([href, label, key]) => {
          const isActive = (current === "admin" && key === "admin") || key === current;
          const onClick = key === "robinjr" ? openRobinJr : key === "subscriptions" ? openCommunity : undefined;
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
      {(notice || entryNotice) && <div className="robin-cross-notice" role="status" aria-live="polite"><span>{notice || entryNotice}</span>{notice && <button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button>}</div>}
    </header>
  );
}
