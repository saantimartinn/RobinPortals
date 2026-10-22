// Shared vite config module.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { legacyCjsBrowser } from "../../../dev/vite-legacy-cjs.mjs";

export default defineConfig({
  plugins: [legacyCjsBrowser({ sharedDir: fileURLToPath(new URL("../shared/", import.meta.url)) }), react()],
  server: { fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] } },
  base: "/portal/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (id.includes("/node_modules/lucide-react/")) return "vendor-icons";
          if (id.includes("/node_modules/framer-motion/") || id.includes("/node_modules/motion-")) return "vendor-motion";
        },
      },
    },
  },
});
