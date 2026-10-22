// Browser entry point: mounts the Robin application and shared styles.
// Brand fonts and tokens first, so every app stylesheet can use them.
import "../../../../packages/brand/brand.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import "./index.css";

// Selects this portal's Robin (packages/brand/brand.css --robin-stage-art).
document.documentElement.dataset.portal = "robinjr";
// Last, so the shared admin look (navy sidebar, typography) wins over the app styles.
import "../../../../packages/portal-nav/robin-shell.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
