import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * En développement, Vite sert l'interface sur :5173 et relaie les routes de
 * l'API vers le backend FastAPI sur :8000. En production, FastAPI sert le
 * dossier `dist/` et l'API sur la même origine : les chemins sont identiques,
 * aucune variable d'environnement n'est nécessaire.
 */
const API = "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: Object.fromEntries(
      ["/chat", "/sources", "/artifacts", "/translate", "/health"].map((route) => [
        route,
        { target: API, changeOrigin: true },
      ]),
    ),
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
  },
});
