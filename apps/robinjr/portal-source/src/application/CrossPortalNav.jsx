// Common Robin navigation; product backends decide whether the current identity has an account.
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, RefreshCw } from "lucide-react";
import { ROBIN_LINKS as LINKS } from "../../../../../packages/portal-nav/links.js";
import robinWordmark from "../assets/robin-wordmark.png";
import { isAdminUser } from "../session.js";
import "../../../../../packages/portal-nav/cross-portal-nav.css";

const STUDENT_KEYS = new Set(["robinjr", "application", "subscriptions"]);

export function CrossPortalNav({ current = "robinjr", user = null, onLogout, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOutside = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const closeEscape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [menuOpen]);
  if (!user) return null;
  const isAdmin = isAdminUser(user);
  const accountName = [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.username || user.email;
  const links = isAdmin ? LINKS : LINKS.filter(([, , key]) => STUDENT_KEYS.has(key));

  return (
    <header className="robin-cross-nav">
      <a className="robin-cross-brand" href={isAdmin ? LINKS[0][0] : LINKS[1][0]} aria-label={isAdmin ? "Robin Admin Platform, inicio" : "RobinJr, inicio"}>
        <img src={robinWordmark} alt="ROBIN" />
        <span>{isAdmin ? "Admin" : "Robin Jr"}</span>
      </a>
      <div className="robin-cross-menu" ref={menuRef}>
        <button className="robin-cross-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="robin-cross-links" onClick={() => setMenuOpen((value) => !value)}>
          <span>{links.find(([, , key]) => key === current)?.[1] || "Portales"}</span><ChevronDown aria-hidden="true" />
        </button>
        <nav id="robin-cross-links" className={menuOpen ? "is-open" : ""} aria-label="Navegación de Robin">
          {links.map(([href, label, key]) => {
            const isActive = (current === "admin" && key === "admin") || key === current;
            const onClick = key === current ? (event) => event.preventDefault() : undefined;
            return <a key={key} href={href} onClick={(event) => { setMenuOpen(false); onClick?.(event); }} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined}>{label}</a>;
          })}
        </nav>
      </div>
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
