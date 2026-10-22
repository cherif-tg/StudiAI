/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de l'API ; vide quand FastAPI sert l'interface sur la même origine. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
