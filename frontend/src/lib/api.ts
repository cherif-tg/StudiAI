import type {
  AgentMode,
  AgentModeInfo,
  Artifact,
  ArtifactKind,
  ChatResponse,
  Health,
  Source,
  User,
} from "./types";

/** Erreur d'API lisible : le message est destiné à être affiché tel quel. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = RequestInit & { timeoutMs?: number };

/**
 * Base de l'API. Vide quand FastAPI sert l'interface (même origine) ; renseignée
 * via `VITE_API_BASE_URL` quand l'interface est hébergée ailleurs (Vercel).
 */
const BASE_API = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function adresse(chemin: string): string {
  if (/^https?:\/\//i.test(chemin)) return chemin;
  return `${BASE_API}${chemin}`;
}

/** URL absolue d'une ressource servie par l'API (artefact, fichier téléchargeable). */
export function urlApi(chemin: string): string {
  return adresse(chemin);
}

async function detailDeLaReponse(res: Response): Promise<string> {
  try {
    const corps: unknown = await res.json();
    const detail = (corps as { detail?: unknown })?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((entree) => (entree as { msg?: string })?.msg ?? JSON.stringify(entree))
        .join(", ");
    }
  } catch {
    /* corps vide ou non JSON */
  }
  return `Erreur ${res.status}`;
}

async function requete<T>(chemin: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 60_000, ...init } = options;
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), timeoutMs);

  try {
    const res = await fetch(adresse(chemin), {
      // "include" : indispensable quand l'interface et l'API sont sur deux
      // origines distinctes, sans effet en même origine.
      credentials: "include",
      ...init,
      signal: controleur.signal,
    });
    if (!res.ok) throw new ApiError(await detailDeLaReponse(res), res.status);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (erreur) {
    if (erreur instanceof ApiError) throw erreur;
    if (erreur instanceof DOMException && erreur.name === "AbortError") {
      throw new ApiError("Le serveur met trop de temps à répondre.", 0);
    }
    if (erreur instanceof TypeError) {
      throw new ApiError("Serveur injoignable. Vérifie qu'il est bien démarré.", 0);
    }
    throw erreur;
  } finally {
    clearTimeout(minuterie);
  }
}

const json = (corps: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(corps),
});

/** La route n'existe pas sur ce serveur (fonction pas encore déployée côté backend). */
export function routeAbsente(erreur: unknown): boolean {
  return erreur instanceof ApiError && (erreur.status === 404 || erreur.status === 405 || erreur.status === 501);
}

/** Téléchargement d'un fichier produit par l'API (export de données). */
async function telecharger(chemin: string): Promise<{ blob: Blob; nom: string }> {
  let res: Response;
  try {
    res = await fetch(adresse(chemin), { credentials: "include" });
  } catch {
    throw new ApiError("Serveur injoignable. Vérifie qu'il est bien démarré.", 0);
  }
  if (!res.ok) throw new ApiError(await detailDeLaReponse(res), res.status);
  // Un serveur qui renvoie l'interface (repli SPA) au lieu d'un fichier : route absente.
  if ((res.headers.get("Content-Type") ?? "").includes("text/html")) {
    throw new ApiError("Route absente sur ce serveur.", 404);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const nom = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? "nunya-export.zip";
  return { blob: await res.blob(), nom: decodeURIComponent(nom) };
}

export const api = {
  health: () => requete<Health>("/health", { timeoutMs: 6_000 }),

  // --- Comptes ---------------------------------------------------------
  moi: () => requete<User>("/auth/me", { timeoutMs: 8_000 }),

  inscrire: (corps: { name: string; email: string; mot_de_passe: string }) =>
    requete<User>("/auth/register", json(corps)),

  connecter: (corps: { email: string; mot_de_passe: string }) =>
    requete<User>("/auth/login", json(corps)),

  deconnecter: () => requete<void>("/auth/logout", { method: "POST" }),

  listSources: () => requete<Source[]>("/sources"),

  uploadSource: async (fichier: File): Promise<Source> => {
    const donnees = new FormData();
    donnees.append("file", fichier);
    return requete<Source>("/sources", {
      method: "POST",
      body: donnees,
      // L'indexation charge le modèle au premier document : patience.
      timeoutMs: 180_000,
    });
  },

  deleteSource: (id: string) =>
    requete<{ ok: boolean }>(`/sources/${encodeURIComponent(id)}`, { method: "DELETE" }),

  chat: (corps: {
    session_id: string;
    message: string;
    source_ids?: string[] | null;
    mode?: AgentMode;
  }) => requete<ChatResponse>("/chat", { ...json(corps), timeoutMs: 180_000 }),

  modes: () =>
    requete<{ defaut: AgentMode; modes: AgentModeInfo[] }>("/agent/modes", { timeoutMs: 8_000 }),

  listArtifacts: () => requete<Artifact[]>("/artifacts"),

  createArtifact: (corps: { kind: ArtifactKind; title: string; content: string }) =>
    requete<Artifact>("/artifacts", json(corps)),

  deleteArtifact: (id: string) =>
    requete<{ ok: boolean }>(`/artifacts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // --- Droits sur les données et mot de passe --------------------------
  // Ces routes sont à ajouter au backend (voir README, « Intégration backend »).
  // Tant qu'elles n'existent pas, l'interface le détecte (routeAbsente) et l'indique.

  exporterDonnees: () => telecharger("/auth/me/export"),

  supprimerCompte: (motDePasse: string) =>
    requete<void>("/auth/me", { ...json({ mot_de_passe: motDePasse }), method: "DELETE" }),

  motDePasseOublie: (email: string) =>
    requete<{ ok: boolean }>("/auth/password/forgot", { ...json({ email }), timeoutMs: 20_000 }),

  reinitialiserMotDePasse: (jeton: string, motDePasse: string) =>
    requete<{ ok: boolean }>("/auth/password/reset", json({ jeton, mot_de_passe: motDePasse })),

  avis: (corps: {
    session_id: string;
    message_id: string;
    avis: "utile" | "inutile";
    motif?: string;
    question?: string;
    reponse?: string;
  }) => requete<{ ok: boolean }>("/chat/feedback", { ...json(corps), timeoutMs: 10_000 }),

  translate: (texte: string) =>
    requete<{ translation: string; target: string }>(
      "/translate",
      { ...json({ text: texte, target: "ee" }), timeoutMs: 120_000 },
    ),
};
