// single-bundle build for the claude.ai artifact page: one JS file (dynamic imports inlined) + one CSS file,
// which pack_artifact.py inlines into the page; models + audio are published next to it as files.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ root: "web", base: "./", publicDir: false, plugins: [react()],
  build: { outDir: "../dist-artifact", emptyOutDir: true, chunkSizeWarningLimit: 8000, assetsInlineLimit: 0,
    rollupOptions: { output: { inlineDynamicImports: true } } } });
