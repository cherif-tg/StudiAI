/**
 * Historique des conversations, conservé dans le navigateur et rangé par compte.
 * Il permet de retrouver une discussion après un rechargement et de la reprendre.
 * (La mémoire de l'agent côté serveur, elle, dépend du backend : voir README.)
 */
import { ecrireJSON, lireJSON, supprimer, supprimerPrefixe } from "./stockage";
import { tronquer } from "./format";
import type { ChatMessage } from "./types";

export type ResumeConversation = {
  id: string;
  titre: string;
  maj: number;
  nb: number;
};

const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 120;

const cleIndex = (compte: string) => `nunya.conversations.${compte}`;
const cleConversation = (compte: string, id: string) => `nunya.conv.${compte}.${id}`;

export const EVENEMENT_HISTORIQUE = "nunya:historique";

function signaler() {
  window.dispatchEvent(new Event(EVENEMENT_HISTORIQUE));
}

export function listerConversations(compte: string): ResumeConversation[] {
  return lireJSON<ResumeConversation[]>(cleIndex(compte), []).sort((a, b) => b.maj - a.maj);
}

export function chargerConversation(compte: string, id: string): ChatMessage[] {
  return lireJSON<ChatMessage[]>(cleConversation(compte, id), []);
}

export function enregistrerConversation(compte: string, id: string, messages: ChatMessage[]): void {
  const utiles = messages.filter((message) => !message.pending).slice(-MAX_MESSAGES);
  if (!utiles.length) return;

  const premiere = utiles.find((message) => message.role === "me");
  const resume: ResumeConversation = {
    id,
    titre: tronquer(premiere?.text ?? "Conversation", 70),
    maj: Date.now(),
    nb: utiles.length,
  };

  let index = listerConversations(compte).filter((element) => element.id !== id);
  index.unshift(resume);
  // On garde les plus récentes : les plus anciennes sont oubliées.
  for (const ancienne of index.slice(MAX_CONVERSATIONS)) supprimer(cleConversation(compte, ancienne.id));
  index = index.slice(0, MAX_CONVERSATIONS);

  if (!ecrireJSON(cleConversation(compte, id), utiles)) {
    // Stockage plein : on libère la moitié la plus ancienne, puis on réessaie une fois.
    for (const ancienne of index.slice(Math.ceil(index.length / 2))) {
      if (ancienne.id !== id) supprimer(cleConversation(compte, ancienne.id));
    }
    index = index.slice(0, Math.ceil(index.length / 2));
    if (!ecrireJSON(cleConversation(compte, id), utiles)) return;
  }
  ecrireJSON(cleIndex(compte), index);
  signaler();
}

export function oublierConversation(compte: string, id: string): void {
  supprimer(cleConversation(compte, id));
  ecrireJSON(
    cleIndex(compte),
    listerConversations(compte).filter((element) => element.id !== id),
  );
  signaler();
}

export function effacerHistorique(compte: string): void {
  supprimerPrefixe(`nunya.conv.${compte}.`);
  supprimer(cleIndex(compte));
  signaler();
}

export function toutesLesConversations(compte: string) {
  return listerConversations(compte).map((resume) => ({
    ...resume,
    messages: chargerConversation(compte, resume.id).map(({ id: _id, pending: _p, ...reste }) => reste),
  }));
}
