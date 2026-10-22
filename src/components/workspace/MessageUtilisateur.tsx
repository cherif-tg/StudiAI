import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Icon } from "../Icon";
import type { ChatMessage } from "../../lib/types";

/**
 * Message envoyé par l'utilisateur, avec un bouton crayon discret pour le
 * modifier. En édition, la bulle devient un champ de texte : Entrée relance la
 * question réécrite, Échap annule. Les échanges qui suivaient la question sont
 * remplacés par la nouvelle réponse (un avertissement le signale).
 */
export function MessageUtilisateur({
  message,
  modifiable,
  occupe,
  suiteRemplacee,
  onModifier,
}: {
  message: ChatMessage;
  /** Faux si aucune fonction de relance n'est branchée. */
  modifiable: boolean;
  /** Une réponse est en cours : on ne peut pas relancer pour l'instant. */
  occupe: boolean;
  /** Vrai si d'autres échanges suivent cette question (ils seront remplacés). */
  suiteRemplacee: boolean;
  onModifier: (texte: string) => void;
}) {
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(message.text);
  const champ = useRef<HTMLTextAreaElement>(null);
  const boutonEditer = useRef<HTMLButtonElement>(null);
  const idChamp = `edition-${message.id}`;

  // À l'ouverture : focus et curseur en fin de texte.
  useEffect(() => {
    const element = champ.current;
    if (!edition || !element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, [edition]);

  // Hauteur ajustée au contenu, comme la zone de saisie principale.
  useEffect(() => {
    const element = champ.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [brouillon, edition]);

  const ouvrir = () => {
    setBrouillon(message.text);
    setEdition(true);
  };

  const fermer = () => {
    setEdition(false);
    // On rend le focus au crayon, pour le clavier.
    window.setTimeout(() => boutonEditer.current?.focus(), 0);
  };

  const valider = (evenement?: FormEvent) => {
    evenement?.preventDefault();
    const texte = brouillon.trim();
    if (!texte || occupe) return;
    setEdition(false);
    onModifier(texte);
  };

  if (edition) {
    return (
      <form className="msg-moi msg-moi--edition" onSubmit={valider}>
        <label className="sr-only" htmlFor={idChamp}>
          Modifier ta question
        </label>
        <textarea
          id={idChamp}
          ref={champ}
          className="msg-edition__champ"
          rows={2}
          value={brouillon}
          onChange={(evenement) => setBrouillon(evenement.target.value)}
          onKeyDown={(evenement) => {
            if (evenement.key === "Escape") {
              evenement.preventDefault();
              fermer();
            } else if (evenement.key === "Enter" && !evenement.shiftKey) {
              evenement.preventDefault();
              valider();
            }
          }}
        />
        {suiteRemplacee ? (
          <p className="msg-edition__note">
            <Icon name="info" size={13} />
            Les échanges qui suivent cette question seront remplacés par la nouvelle réponse.
          </p>
        ) : null}
        <div className="msg-edition__actions">
          <button type="button" className="btn btn--quiet btn--sm" onClick={fermer}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={occupe || !brouillon.trim()}
            title="Relancer avec cette question (Entrée)"
          >
            <Icon name="fleche" size={14} />
            Relancer
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="msg-moi">
      <div className="msg msg--me">{message.text}</div>
      {modifiable ? (
        <div className="msg-moi__actions">
          <button
            ref={boutonEditer}
            type="button"
            className="action-msg action-msg--icone"
            onClick={ouvrir}
            disabled={occupe}
            aria-label="Modifier cette question"
            title={occupe ? "Patiente jusqu'à la fin de la réponse" : "Modifier et relancer"}
          >
            <Icon name="crayon" size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
