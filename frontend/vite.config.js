import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/therobinplan/",
  server: { watch: { ignored: ["**/.netlify/**"] } },
  build: {
    outDir: "../dist/therobinplan",
    emptyOutDir: true,
    target: ["es2020", "chrome87", "edge88", "firefox78", "safari14"],
  },
});
