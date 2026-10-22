import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api } from "../lib/api";
import type { User } from "../lib/types";

type AuthContextValue = {
  user: User | null;
  /** Faux tant que la session n'a pas été vérifiée au chargement. */
  pret: boolean;
  connecter: (email: string, motDePasse: string) => Promise<void>;
  inscrire: (nom: string, email: string, motDePasse: string) => Promise<void>;
  deconnecter: () => Promise<void>;
  /** Supprime définitivement le compte (route backend requise, voir README). */
  supprimerCompte: (motDePasse: string, avantDeconnexion?: () => void | Promise<void>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    api
      .moi()
      .then((profil) => {
        if (vivant) setUser(profil);
      })
      .catch(() => {
        // 401 attendu quand personne n'est connecté : ce n'est pas une erreur.
        if (vivant) setUser(null);
      })
      .finally(() => {
        if (vivant) setPret(true);
      });
    return () => {
      vivant = false;
    };
  }, []);

  const connecter = useCallback(async (email: string, motDePasse: string) => {
    const profil = await api.connecter({ email, mot_de_passe: motDePasse });
    setUser(profil);
  }, []);

  const inscrire = useCallback(async (nom: string, email: string, motDePasse: string) => {
    const profil = await api.inscrire({ name: nom, email, mot_de_passe: motDePasse });
    setUser(profil);
  }, []);

  const deconnecter = useCallback(async () => {
    try {
      await api.deconnecter();
    } finally {
      // Même si l'appel échoue, l'interface ne doit pas rester « connectée ».
      setUser(null);
    }
  }, []);

  const supprimerCompte = useCallback(
    async (motDePasse: string, avantDeconnexion?: () => void | Promise<void>) => {
      await api.supprimerCompte(motDePasse);
      // Ex. quitter une page protégée avant que la session disparaisse.
      await avantDeconnexion?.();
      setUser(null);
    },
    [],
  );

  const valeur = useMemo(
    () => ({ user, pret, connecter, inscrire, deconnecter, supprimerCompte }),
    [user, pret, connecter, inscrire, deconnecter, supprimerCompte],
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexte = useContext(AuthContext);
  if (!contexte) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return contexte;
}
