// Shared vite config module.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootRedirects = fileURLToPath(new URL("../dist/_redirects", import.meta.url));

function developerDatabaseRedirect() {
  return {
    name: "robin-plan-developer-database-redirect",
    closeBundle() {
      mkdirSync(dirname(rootRedirects), { recursive: true });
      writeFileSync(rootRedirects, "/api/sub-admin/db /.netlify/functions/sub-admin-database 200!\n");
    },
  };
}

export default defineConfig({
  plugins: [react(), developerDatabaseRedirect()],
  base: "/therobinplan/",
  server: { watch: { ignored: ["**/.netlify/**"] } },
  build: {
    outDir: "../dist/therobinplan",
    emptyOutDir: true,
    target: ["es2020", "chrome87", "edge88", "firefox78", "safari14"],
  },
});
