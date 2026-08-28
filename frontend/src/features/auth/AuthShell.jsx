import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import { Bird } from "lucide-react";
import React from "react";
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
          <span><Bird size={19} strokeWidth={1.8} /></span>
          <strong>ROBIN</strong>
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
            <span><Bird size={18} strokeWidth={1.8} /></span><strong>ROBIN</strong>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export { AuthShell };
