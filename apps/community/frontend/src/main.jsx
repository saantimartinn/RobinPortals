// Browser entry point: mounts The Robin Plan app and global styles.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import "./index.css";
// Last, so the shared admin look (navy sidebar, typography) wins over the app styles.
import "../../../../packages/portal-nav/robin-shell.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
