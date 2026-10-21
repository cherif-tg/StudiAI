import type { Artifact, ArtifactKind, ChatResponse, Health, Source } from "./types";

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
    const res = await fetch(chemin, { ...init, signal: controleur.signal });
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

export const api = {
  health: () => requete<Health>("/health", { timeoutMs: 6_000 }),

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

  chat: (corps: { session_id: string; message: string; source_ids?: string[] | null }) =>
    requete<ChatResponse>("/chat", { ...json(corps), timeoutMs: 180_000 }),

  listArtifacts: (sessionId: string) =>
    requete<Artifact[]>(`/artifacts?session_id=${encodeURIComponent(sessionId)}`),

  createArtifact: (corps: {
    session_id: string;
    kind: ArtifactKind;
    title: string;
    content: string;
  }) => requete<Artifact>("/artifacts", json(corps)),

  translate: (texte: string) =>
    requete<{ translation: string; target: string }>(
      "/translate",
      { ...json({ text: texte, target: "ee" }), timeoutMs: 120_000 },
    ),
};
