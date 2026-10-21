import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build spécifique au test de rendu : un seul fichier IIFE, exécutable par jsdom
 * (qui ne sait pas exécuter les modules ES). Ne sert pas à la production.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-smoke",
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        format: "iife",
        entryFileNames: "app.js",
        inlineDynamicImports: true,
        assetFileNames: "app.[ext]",
      },
    },
  },
});
