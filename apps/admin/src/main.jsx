// Browser entry point: mounts the admin app and global stylesheet.
// Brand fonts and tokens first, so every stylesheet can use them.
import "../../../packages/brand/brand.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./styles/brand-shell.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
