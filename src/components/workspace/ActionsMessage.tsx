import { useEffect, useState } from "react";

import { Icon } from "../Icon";
import { useAuth } from "../../context/AuthProvider";
import { MOTIFS_AVIS, copierTexte, enregistrerAvis, lireAvis } from "../../lib/avis";
import type { ValeurAvis } from "../../lib/avis";
import type { ChatMessage } from "../../lib/types";

/**
 * Barre d'actions sous une réponse de l'agent : copier, avis (utile / inutile),
 * régénérer, et navigation entre les versions régénérées.
 */
export function ActionsMessage({
  message,
  question,
  sessionId,
  peutRegenerer,
  occupe,
  onRegenerer,
  onVersion,
}: {
  message: ChatMessage;
  question?: string;
  sessionId: string;
  peutRegenerer: boolean;
  occupe: boolean;
  onRegenerer?: () => void;
  onVersion?: (index: number) => void;
}) {
  const { user } = useAuth();
  const compte = user?.id ?? "anonyme";
  const [copie, setCopie] = useState<"non" | "ok" | "echec">("non");
  const [avis, setAvis] = useState<ValeurAvis | null>(() => lireAvis(compte, message.id)?.avis ?? null);
  const [motif, setMotif] = useState<string | undefined>(() => lireAvis(compte, message.id)?.motif);
  const [merci, setMerci] = useState(false);

  useEffect(() => {
    if (copie === "non") return undefined;
    const minuterie = window.setTimeout(() => setCopie("non"), 1800);
    return () => window.clearTimeout(minuterie);
  }, [copie]);

  useEffect(() => {
    if (!merci) return undefined;
    const minuterie = window.setTimeout(() => setMerci(false), 2200);
    return () => window.clearTimeout(minuterie);
  }, [merci]);

  const contexte = { sessionId, messageId: message.id, question, reponse: message.text };

  const choisir = (valeur: ValeurAvis) => {
    const nouveau = avis === valeur ? null : valeur; // re-cliquer annule
    setAvis(nouveau);
    setMotif(undefined);
    enregistrerAvis(compte, contexte, nouveau);
    if (nouveau === "utile") setMerci(true);
  };

  const choisirMotif = (valeur: string) => {
    setMotif(valeur);
    enregistrerAvis(compte, contexte, "inutile", valeur);
    setMerci(true);
  };

  const versions = message.versions ?? [];
  const versionCourante = message.version ?? versions.length - 1;

  return (
    <div className="actions-msg">
      <div className="actions-msg__barre" role="toolbar" aria-label="Actions sur la réponse">
        <button
          type="button"
          className="action-msg"
          data-etat={copie}
          onClick={async () => setCopie((await copierTexte(message.text)) ? "ok" : "echec")}
          aria-label="Copier la réponse"
          title="Copier la réponse"
        >
          <Icon name={copie === "ok" ? "coche" : "copier"} size={15} strokeWidth={copie === "ok" ? 2.2 : 1.6} />
          <span className="action-msg__label" aria-live="polite">
            {copie === "ok" ? "Copié !" : copie === "echec" ? "Copie impossible" : "Copier"}
          </span>
        </button>

        <span className="actions-msg__sep" aria-hidden="true" />

        <button
          type="button"
          className="action-msg action-msg--icone"
          data-actif={avis === "utile"}
          aria-pressed={avis === "utile"}
          onClick={() => choisir("utile")}
          aria-label="Réponse utile"
          title="Réponse utile"
        >
          <Icon name="pouceHaut" size={15} />
        </button>
        <button
          type="button"
          className="action-msg action-msg--icone"
          data-actif={avis === "inutile"}
          data-ton="negatif"
          aria-pressed={avis === "inutile"}
          onClick={() => choisir("inutile")}
          aria-label="Réponse inutile"
          title="Réponse inutile"
        >
          <Icon name="pouceBas" size={15} />
        </button>

        {peutRegenerer && onRegenerer ? (
          <>
            <span className="actions-msg__sep" aria-hidden="true" />
            <button
              type="button"
              className="action-msg"
              onClick={onRegenerer}
              disabled={occupe}
              aria-label="Régénérer la réponse"
              title="Obtenir une autre réponse"
            >
              <Icon name="rafraichir" size={15} />
              <span className="action-msg__label">Régénérer</span>
            </button>
          </>
        ) : null}

        {versions.length > 1 && onVersion ? (
          <span className="actions-msg__versions" aria-label="Versions de la réponse">
            <button
              type="button"
              className="action-msg action-msg--icone"
              onClick={() => onVersion(versionCourante - 1)}
              disabled={occupe || versionCourante <= 0}
              aria-label="Version précédente"
            >
              <Icon name="chevronG" size={15} />
            </button>
            <span className="actions-msg__compteur">
              {versionCourante + 1}/{versions.length}
            </span>
            <button
              type="button"
              className="action-msg action-msg--icone"
              onClick={() => onVersion(versionCourante + 1)}
              disabled={occupe || versionCourante >= versions.length - 1}
              aria-label="Version suivante"
            >
              <Icon name="chevronD" size={15} />
            </button>
          </span>
        ) : null}

        {merci ? (
          <span className="actions-msg__merci" role="status">
            Merci pour ton retour
          </span>
        ) : null}
      </div>

      {avis === "inutile" && !motif ? (
        <div className="actions-msg__motifs" role="group" aria-label="Qu'est-ce qui n'allait pas ?">
          <span className="hint">Qu'est-ce qui n'allait pas ?</span>
          {MOTIFS_AVIS.map((valeur) => (
            <button key={valeur} type="button" className="chip chip--mini" onClick={() => choisirMotif(valeur)}>
              {valeur}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
