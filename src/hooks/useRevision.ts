import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthProvider";
import { EVENEMENT_REVISION, cartesDues } from "../lib/revision";

/** Nombre de questions à revoir aujourd'hui, tenu à jour (quiz joués, autre onglet). */
export function useRevisionsDues(): number {
  const { user } = useAuth();
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    if (!user) {
      setNombre(0);
      return undefined;
    }
    const actualiser = () => setNombre(cartesDues(user.id).length);
    actualiser();
    window.addEventListener(EVENEMENT_REVISION, actualiser);
    window.addEventListener("storage", actualiser);
    window.addEventListener("focus", actualiser);
    return () => {
      window.removeEventListener(EVENEMENT_REVISION, actualiser);
      window.removeEventListener("storage", actualiser);
      window.removeEventListener("focus", actualiser);
    };
  }, [user]);

  return nombre;
}
