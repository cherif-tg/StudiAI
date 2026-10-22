/**
 * Avis sur les réponses de l'agent (utile / inutile, avec un motif facultatif).
 * Gardés dans le navigateur pour afficher le choix, et envoyés au backend sur
 * `POST /chat/feedback` quand la route existe (voir docs/INTEGRATION_BACKEND.md).
 */
import { api, routeAbsente } from "./api";
import { ecrireJSON, lireJSON, supprimer } from "./stockage";

export type ValeurAvis = "utile" | "inutile";
export type Avis = { avis: ValeurAvis; motif?: string; date: number };

export const MOTIFS_AVIS = ["Inexact", "Hors sujet", "Incomplet", "Peu clair"] as const;

const cle = (compte: string) => `nunya.avis.${compte}`;
let routeDisponible = true; // après un 404, on n'insiste pas pendant la session

export function lireAvis(compte: string, messageId: string): Avis | undefined {
  return lireJSON<Record<string, Avis>>(cle(compte), {})[messageId];
}

export function enregistrerAvis(
  compte: string,
  contexte: { sessionId: string; messageId: string; question?: string; reponse?: string },
  avis: ValeurAvis | null,
  motif?: string,
): void {
  const tous = lireJSON<Record<string, Avis>>(cle(compte), {});
  if (avis) tous[contexte.messageId] = { avis, motif, date: Date.now() };
  else delete tous[contexte.messageId];
  // On ne garde que les 300 avis les plus récents.
  const recents = Object.entries(tous)
    .sort(([, a], [, b]) => b.date - a.date)
    .slice(0, 300);
  ecrireJSON(cle(compte), Object.fromEntries(recents));

  if (!avis || !routeDisponible) return;
  api
    .avis({
      session_id: contexte.sessionId,
      message_id: contexte.messageId,
      avis,
      motif,
      question: contexte.question?.slice(0, 2000),
      reponse: contexte.reponse?.slice(0, 4000),
    })
    .catch((erreur) => {
      if (routeAbsente(erreur)) routeDisponible = false;
    });
}

export function tousLesAvis(compte: string): Record<string, Avis> {
  return lireJSON<Record<string, Avis>>(cle(compte), {});
}

export function effacerAvis(compte: string): void {
  supprimer(cle(compte));
}

/** Copie un texte, avec repli pour les navigateurs qui refusent le presse-papiers. */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.setAttribute("readonly", "");
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand("copy");
      zone.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
