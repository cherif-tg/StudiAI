import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Développement : Vite sert l'interface sur :5173 et relaie les routes de l'API
 * vers le backend FastAPI (par défaut http://127.0.0.1:8000, réglable avec
 * `VITE_DEV_API_TARGET`). Grâce au relais, l'interface et l'API partagent la même
 * origine : le cookie de session fonctionne sans configuration CORS.
 *
 * Production : FastAPI sert le dossier `dist/` et l'API sur la même origine, ou
 * l'interface est hébergée ailleurs et `VITE_API_BASE_URL` pointe vers l'API.
 */

/** Préfixes des routes de l'API (aucune page de l'interface ne commence ainsi). */
const ROUTES_API = [
  "/health",
  "/auth",
  "/agent",
  "/chat",
  "/sources",
  "/artifacts",
  "/translate",
  "/contact",
  "/conversations",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const cible = env.VITE_DEV_API_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: Object.fromEntries(
        ROUTES_API.map((route) => [route, { target: cible, changeOrigin: true }]),
      ),
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
    },
  };
});
