// Auth feature UI for auth shell; the application shell selects this view.
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";
import robinLogoTransparent from "../../assets/robin-logo-transparent.png";
import "./auth-shell.css";

function AuthShell({ children }) {
  return (
    <div className="subscription-auth-shell">
      <aside className="subscription-auth-brand"
        style={{ background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 60%, #2a4a8e 100%)` }}>
        <div className="subscription-auth-rings">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: (i + 1) * 180, height: (i + 1) * 180, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="subscription-auth-wordmark" aria-label="Robin">
          <img src={robinLogoTransparent} alt="Robin" />
        </div>
        <div className="subscription-auth-message">
          <div className="subscription-auth-title">
            Tu futuro<br />empieza aquí.
          </div>
          <div className="subscription-auth-copy">
            Servicios, comunidad y apoyo para construir tu vida internacional con más confianza.
          </div>
        </div>
        <div className="subscription-auth-footer">© Project Robin · The Robin Plan</div>
      </aside>

      <main className="subscription-auth-main">
        <div className="subscription-auth-form">
          <div className="subscription-auth-mobile-logo">
            <img src={robinLogoTransparent} alt="Robin" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export { AuthShell };
