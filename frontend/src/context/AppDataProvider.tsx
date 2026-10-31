import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { ApiError, api } from "../lib/api";
import { identifiant } from "../lib/format";
import type { Artifact, ArtifactKind, Health, Source } from "../lib/types";
import { useAuth } from "./AuthProvider";
import { useToast } from "./ToastProvider";

type Etat = "loading" | "ready" | "error";

type AppDataValue = {
  sessionId: string;
  nouvelleSession: () => void;
  /** Reprend une conversation précédente (identifiant de session déjà utilisé). */
  reprendreSession: (id: string) => void;

  sources: Source[];
  sourcesEtat: Etat;
  sourcesErreur: string | null;
  rafraichirSources: () => Promise<void>;
  deposerFichiers: (fichiers: File[]) => Promise<void>;
  envoisEnCours: number;
  retirerSource: (id: string) => Promise<void>;

  selection: string[];
  basculerSource: (id: string) => void;
  toutSelectionner: (actif: boolean) => void;

  artefacts: Artifact[];
  artefactsEtat: Etat;
  rafraichirArtefacts: () => Promise<void>;
  enregistrerArtefact: (kind: ArtifactKind, titre: string, contenu: string) => Promise<Artifact | null>;
  retirerArtefact: (id: string) => Promise<void>;

  sante: Health | null;
};

const CLE_SESSION = "nunya.session";
const AppDataContext = createContext<AppDataValue | null>(null);

function sessionInitiale(): string {
  try {
    const existante = localStorage.getItem(CLE_SESSION);
    if (existante) return existante;
  } catch {
    /* stockage refusé */
  }
  const nouvelle = identifiant();
  try {
    localStorage.setItem(CLE_SESSION, nouvelle);
  } catch {
    /* tant pis : la session ne survivra pas au rechargement */
  }
  return nouvelle;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>(sessionInitiale);

  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesEtat, setSourcesEtat] = useState<Etat>("loading");
  const [sourcesErreur, setSourcesErreur] = useState<string | null>(null);
  const [envoisEnCours, setEnvoisEnCours] = useState(0);

  const [selection, setSelection] = useState<string[]>([]);

  const [artefacts, setArtefacts] = useState<Artifact[]>([]);
  const [artefactsEtat, setArtefactsEtat] = useState<Etat>("loading");

  const [sante, setSante] = useState<Health | null>(null);

  const rafraichirSources = useCallback(async () => {
    setSourcesEtat("loading");
    try {
      const liste = await api.listSources();
      setSources(liste);
      setSelection((precedente) => {
        const ids = new Set(liste.map((s) => s.id));
        const conservees = precedente.filter((id) => ids.has(id));
        // Une source nouvellement indexée est active par défaut.
        const ajouts = liste.filter((s) => !precedente.includes(s.id)).map((s) => s.id);
        return precedente.length ? [...conservees, ...ajouts] : liste.map((s) => s.id);
      });
      setSourcesErreur(null);
      setSourcesEtat("ready");
    } catch (erreur) {
      setSourcesEtat("error");
      setSourcesErreur(erreur instanceof ApiError ? erreur.message : "Chargement impossible.");
    }
  }, []);

  const rafraichirArtefacts = useCallback(async () => {
    if (!user) {
      setArtefacts([]);
      return;
    }
    setArtefactsEtat("loading");
    try {
      const liste = await api.listArtifacts();
      setArtefacts(liste);
      setArtefactsEtat("ready");
    } catch {
      setArtefactsEtat("error");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSources([]);
      setSourcesEtat("ready");
      return;
    }
    void rafraichirSources();
  }, [user, rafraichirSources]);

  useEffect(() => {
    void rafraichirArtefacts();
  }, [rafraichirArtefacts]);

  // La santé du RAG conditionne ce qu'on peut promettre à l'utilisateur.
  useEffect(() => {
    let vivant = true;
    let minuterie = 0;

    const interroger = async () => {
      try {
        const etat = await api.health();
        if (!vivant) return;
        setSante(etat);
        minuterie = window.setTimeout(interroger, etat.rag ? 60_000 : 12_000);
      } catch {
        if (!vivant) return;
        setSante(null);
        minuterie = window.setTimeout(interroger, 15_000);
      }
    };

    void interroger();
    return () => {
      vivant = false;
      window.clearTimeout(minuterie);
    };
  }, []);

  const deposerFichiers = useCallback(
    async (fichiers: File[]) => {
      if (!fichiers.length) return;
      setEnvoisEnCours((n) => n + fichiers.length);
      for (const fichier of fichiers) {
        try {
          const source = await api.uploadSource(fichier);
          setSources((liste) => [source, ...liste.filter((s) => s.id !== source.id)]);
          setSelection((liste) => (liste.includes(source.id) ? liste : [...liste, source.id]));
          push("Document indexé", {
            message: `${source.filename} · ${source.chunks} passages`,
            tone: "success",
          });
        } catch (erreur) {
          push("Indexation impossible", {
            message:
              (erreur instanceof ApiError ? erreur.message : "Erreur inattendue.") +
              ` (${fichier.name})`,
            tone: "error",
          });
        } finally {
          setEnvoisEnCours((n) => Math.max(0, n - 1));
        }
      }
      setSourcesEtat("ready");
    },
    [push],
  );

  const retirerSource = useCallback(
    async (id: string) => {
      const cible = sources.find((s) => s.id === id);
      try {
        await api.deleteSource(id);
        setSources((liste) => liste.filter((s) => s.id !== id));
        setSelection((liste) => liste.filter((x) => x !== id));
        push("Document retiré", { message: cible?.filename, tone: "info" });
      } catch (erreur) {
        push("Suppression impossible", {
          message: erreur instanceof ApiError ? erreur.message : undefined,
          tone: "error",
        });
      }
    },
    [push, sources],
  );

  const basculerSource = useCallback((id: string) => {
    setSelection((liste) =>
      liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id],
    );
  }, []);

  const toutSelectionner = useCallback(
    (actif: boolean) => {
      setSelection(actif ? sources.map((s) => s.id) : []);
    },
    [sources],
  );

  const enregistrerArtefact = useCallback(
    async (kind: ArtifactKind, titre: string, contenu: string) => {
      try {
        const cree = await api.createArtifact({
          kind,
          title: titre,
          content: contenu,
        });
        setArtefacts((liste) => [cree, ...liste]);
        push("Ajouté au Carnet", { message: titre, tone: "success" });
        return cree;
      } catch (erreur) {
        push("Ajout impossible", {
          message: erreur instanceof ApiError ? erreur.message : undefined,
          tone: "error",
        });
        return null;
      }
    },
    [push],
  );

  const retirerArtefact = useCallback(
    async (id: string) => {
      const cible = artefacts.find((a) => a.id === id);
      try {
        await api.deleteArtifact(id);
        setArtefacts((liste) => liste.filter((a) => a.id !== id));
        push("Retiré du carnet", { message: cible?.title, tone: "info" });
      } catch (erreur) {
        push("Suppression impossible", {
          message: erreur instanceof ApiError ? erreur.message : undefined,
          tone: "error",
        });
      }
    },
    [push, artefacts],
  );

  const nouvelleSession = useCallback(() => {
    const id = identifiant();
    try {
      localStorage.setItem(CLE_SESSION, id);
    } catch {
      /* sans stockage, la session reste en mémoire */
    }
    setSessionId(id);
    push("Nouvelle conversation", {
      message: "Ton carnet et tes documents restent inchangés.",
      tone: "info",
    });
  }, [push]);

  const reprendreSession = useCallback((id: string) => {
    try {
      localStorage.setItem(CLE_SESSION, id);
    } catch {
      /* sans stockage, la reprise reste en mémoire */
    }
    setSessionId(id);
  }, []);

  const valeur = useMemo<AppDataValue>(
    () => ({
      sessionId,
      nouvelleSession,
      reprendreSession,
      sources,
      sourcesEtat,
      sourcesErreur,
      rafraichirSources,
      deposerFichiers,
      envoisEnCours,
      retirerSource,
      selection,
      basculerSource,
      toutSelectionner,
      artefacts,
      artefactsEtat,
      rafraichirArtefacts,
      enregistrerArtefact,
      retirerArtefact,
      sante,
    }),
    [
      sessionId,
      nouvelleSession,
      reprendreSession,
      sources,
      sourcesEtat,
      sourcesErreur,
      rafraichirSources,
      deposerFichiers,
      envoisEnCours,
      retirerSource,
      selection,
      basculerSource,
      toutSelectionner,
      artefacts,
      artefactsEtat,
      rafraichirArtefacts,
      enregistrerArtefact,
      retirerArtefact,
      sante,
    ],
  );

  return <AppDataContext.Provider value={valeur}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const contexte = useContext(AppDataContext);
  if (!contexte) throw new Error("useAppData doit être utilisé dans <AppDataProvider>");
  return contexte;
}
