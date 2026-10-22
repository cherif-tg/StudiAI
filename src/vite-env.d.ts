/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de l'API ; vide quand FastAPI sert l'interface sur la même origine. */
  readonly VITE_API_BASE_URL?: string;
  /** Adresse e-mail de contact affichée dans le footer et les pages juridiques. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Point d'envoi du formulaire de contact (POST JSON). Prioritaire sur l'e-mail. */
  readonly VITE_CONTACT_ENDPOINT?: string;
  /** Exploitant de l'instance (pages juridiques). */
  readonly VITE_EDITEUR_NOM?: string;
  /** Hébergeur du serveur (pages juridiques). */
  readonly VITE_HEBERGEUR_NOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
