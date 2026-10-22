/**
 * Révision espacée (méthode des boîtes de Leitner), conservée dans le navigateur.
 *
 * - Une question ratée entre en boîte 1 : elle revient le lendemain.
 * - Bien répondue en révision, elle monte d'une boîte : 1, 3, 7, 14 puis 30 jours.
 * - Ratée à nouveau, elle redescend en boîte 1.
 * Chaque quiz forme une « notion » (son titre) : on suit la réussite par notion.
 */
import { ecrireJSON, lireJSON, supprimer } from "./stockage";
import type { QuizQuestion } from "./types";

export type Carte = {
  id: string;
  notion: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation?: string;
  boite: number;
  due: number;
  revisions: number;
};

export type StatNotion = { notion: string; vues: number; justes: number; derniere: number };

type Etat = { cartes: Record<string, Carte>; notions: Record<string, StatNotion> };

/** Jours d'attente avant de revoir une carte, selon sa boîte (index = boîte). */
const INTERVALLES = [0, 1, 3, 7, 14, 30];
export const BOITE_MAX = INTERVALLES.length - 1;
const JOUR = 24 * 60 * 60 * 1000;

const cle = (compte: string) => `nunya.revision.${compte}`;
export const EVENEMENT_REVISION = "nunya:revision";

function debutDuJour(horodatage: number): number {
  const date = new Date(horodatage);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function empreinte(texte: string): string {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function lireRevision(compte: string): Etat {
  return lireJSON<Etat>(cle(compte), { cartes: {}, notions: {} });
}

function ecrire(compte: string, etat: Etat) {
  ecrireJSON(cle(compte), etat);
  window.dispatchEvent(new Event(EVENEMENT_REVISION));
}

/** Note une réponse à une question de quiz (dans l'atelier ou en révision). */
export function noterReponse(
  compte: string,
  notionBrute: string,
  question: QuizQuestion,
  juste: boolean,
  maintenant = Date.now(),
): void {
  const nettoyee = notionBrute.replace(/^quiz\s*[:—-]\s*/i, "").trim() || "Quiz";
  const notion = nettoyee.charAt(0).toLocaleUpperCase("fr") + nettoyee.slice(1);
  const etat = lireRevision(compte);

  const stat = etat.notions[notion] ?? { notion, vues: 0, justes: 0, derniere: 0 };
  stat.vues += 1;
  if (juste) stat.justes += 1;
  stat.derniere = maintenant;
  etat.notions[notion] = stat;

  const id = empreinte(`${notion}::${question.question}`);
  const existante = etat.cartes[id];

  if (!existante && juste) {
    ecrire(compte, etat); // bonne réponse du premier coup : rien à revoir
    return;
  }

  const boite = juste ? Math.min((existante?.boite ?? 0) + 1, BOITE_MAX) : 1;
  etat.cartes[id] = {
    id,
    notion,
    question: question.question,
    choices: question.choices,
    answer_index: question.answer_index,
    explanation: question.explanation,
    boite,
    due: debutDuJour(maintenant) + INTERVALLES[boite] * JOUR,
    revisions: (existante?.revisions ?? 0) + (existante ? 1 : 0),
  };
  ecrire(compte, etat);
}

export function cartesDues(compte: string, maintenant = Date.now()): Carte[] {
  return Object.values(lireRevision(compte).cartes)
    .filter((carte) => carte.boite < BOITE_MAX && carte.due <= maintenant)
    .sort((a, b) => a.due - b.due || a.boite - b.boite);
}

export function prochaineEcheance(compte: string, maintenant = Date.now()): number | null {
  const futures = Object.values(lireRevision(compte).cartes)
    .filter((carte) => carte.boite < BOITE_MAX && carte.due > maintenant)
    .map((carte) => carte.due);
  return futures.length ? Math.min(...futures) : null;
}

export function effacerRevision(compte: string): void {
  supprimer(cle(compte));
  window.dispatchEvent(new Event(EVENEMENT_REVISION));
}
