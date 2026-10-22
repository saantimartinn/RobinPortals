// Common Robin navigation; membership is checked by the destination portal backend.
import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { ROBIN_LINKS as LINKS } from "../../../../../packages/portal-nav/links.js";
import robinWordmark from "../assets/robin-wordmark.png";
import "../../../../../packages/portal-nav/cross-portal-nav.css";

const STUDENT_KEYS = new Set(["robinjr", "application", "subscriptions"]);

export function CrossPortalNav({ current = "subscriptions", user = null, onLogout }) {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!user) return null;
  const isAdmin = !!user.is_application_admin;
  const accountName = [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email;
  const links = isAdmin ? LINKS : LINKS.filter(([, , key]) => STUDENT_KEYS.has(key));

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
      setNotice("No se ha podido validar tu acceso a RobinJr. Inicia sesión de nuevo.");
    }
  }

  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href={isAdmin ? LINKS[0][0] : LINKS[3][0]} aria-label={isAdmin ? "Robin Admin Platform, inicio" : "Robin Community, inicio"}>
        <img src={robinWordmark} alt="ROBIN" />
        <span>{isAdmin ? "Admin" : "Community"}</span>
      </a>
      <nav aria-label="Navegación de Robin">
        {links.map(([href, label, key]) => {
          const isActive = (current === "admin" && key === "admin") || key === current;
          const onClick = key === "robinjr" ? openRobinJr : key === current ? (event) => event.preventDefault() : undefined;
          return <a key={key} href={href} onClick={onClick} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
        })}
      </nav>
      {accountName ? (
        <div className="robin-cross-actions">
          <span className="robin-cross-account">{accountName}</span>
          {onLogout && <button className="robin-cross-icon-button" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18} /></button>}
        </div>
      ) : null}
      {notice && <div className="robin-cross-notice" role="status" aria-live="polite"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button></div>}
    </header>
  );
}
