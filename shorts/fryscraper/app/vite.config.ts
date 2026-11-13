import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
export default defineConfig({ root: "web", base: "./", publicDir: "../public", plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 4000, rollupOptions: { input: { main: resolve(__dirname, "web/index.html"), debug: resolve(__dirname, "web/debug.html") } } } });
