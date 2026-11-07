// Common Robin navigation; membership is checked by the destination portal backend.
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { ROBIN_LINKS as LINKS } from "../../../../../packages/portal-nav/links.js";
import robinWordmark from "../assets/robin-wordmark.png";
import "../../../../../packages/portal-nav/cross-portal-nav.css";

const STUDENT_KEYS = new Set(["robinjr", "application", "subscriptions"]);

export function CrossPortalNav({ current = "subscriptions", user = null, onLogout }) {
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOutside = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const closeEscape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [menuOpen]);
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
      <div className="robin-cross-menu" ref={menuRef}>
        <button className="robin-cross-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="robin-cross-links" onClick={() => setMenuOpen((value) => !value)}>
          <span>{links.find(([, , key]) => key === current)?.[1] || "Portales"}</span><ChevronDown aria-hidden="true" />
        </button>
        <nav id="robin-cross-links" className={menuOpen ? "is-open" : ""} aria-label="Navegación de Robin">
          {links.map(([href, label, key]) => {
            const isActive = (current === "admin" && key === "admin") || key === current;
            const onClick = key === "robinjr" ? openRobinJr : key === current ? (event) => event.preventDefault() : undefined;
            return <a key={key} href={href} onClick={(event) => { setMenuOpen(false); onClick?.(event); }} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
          })}
        </nav>
      </div>
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
