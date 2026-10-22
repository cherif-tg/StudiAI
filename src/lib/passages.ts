/**
 * Passages consultés par l'agent, extraits de l'étape `rag_search` renvoyée par
 * `/chat`. Le format exact dépend du backend : on accepte les noms de champs
 * courants, et le README décrit le format recommandé (`data.passages`).
 */
import type { ToolStep } from "./types";

export type Passage = {
  source: string;
  page?: string | number;
  texte: string;
  score?: number;
};

type Brut = Record<string, unknown>;

const CLES_LISTE = ["passages", "results", "chunks", "hits", "documents", "items", "sources", "matches"];

function texteDe(element: Brut): string {
  for (const cle of ["text", "texte", "content", "contenu", "chunk", "passage", "page_content", "extrait", "snippet"]) {
    const valeur = element[cle];
    if (typeof valeur === "string" && valeur.trim()) return valeur.trim();
  }
  return "";
}

function champ(element: Brut, cles: string[]): unknown {
  const meta = (element.metadata ?? element.meta ?? {}) as Brut;
  for (const cle of cles) {
    if (element[cle] !== undefined && element[cle] !== null && element[cle] !== "") return element[cle];
    if (meta[cle] !== undefined && meta[cle] !== null && meta[cle] !== "") return meta[cle];
  }
  return undefined;
}

function normaliser(element: unknown): Passage | null {
  if (typeof element === "string") return element.trim() ? { source: "Document", texte: element.trim() } : null;
  if (!element || typeof element !== "object") return null;
  const brut = element as Brut;
  const texte = texteDe(brut);
  if (!texte) return null;
  const source = champ(brut, ["filename", "source", "document", "title", "titre", "file", "source_id"]);
  const page = champ(brut, ["page", "page_number", "pages"]);
  const score = champ(brut, ["score", "similarity", "relevance"]);
  return {
    source: typeof source === "string" ? source : "Document",
    page: typeof page === "number" || typeof page === "string" ? page : undefined,
    texte,
    score: typeof score === "number" ? score : undefined,
  };
}

export function passagesDepuisEtapes(etapes: ToolStep[] = []): Passage[] {
  const trouves: Passage[] = [];
  for (const etape of etapes) {
    if (!/search|rag|retriev/i.test(etape.tool)) continue;
    const donnees = (etape.data ?? {}) as Brut;
    let liste: unknown[] | null = Array.isArray(etape.data) ? (etape.data as unknown[]) : null;
    for (const cle of CLES_LISTE) {
      if (!liste && Array.isArray(donnees[cle])) liste = donnees[cle] as unknown[];
    }
    const normalises = (liste ?? []).map(normaliser).filter((p): p is Passage => p !== null);
    if (normalises.length) trouves.push(...normalises);
    else if (etape.result_preview?.trim() && !/^\d+\s+passages?$/i.test(etape.result_preview.trim())) {
      trouves.push({ source: "Extraits consultés", texte: etape.result_preview.trim() });
    }
  }
  const vus = new Set<string>();
  return trouves.filter((passage) => {
    const cle = `${passage.source}::${passage.texte.slice(0, 120)}`;
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/** Regroupe les passages par document, dans l'ordre d'apparition. */
export function parSource(passages: Passage[]): { source: string; passages: Passage[] }[] {
  const groupes = new Map<string, Passage[]>();
  for (const passage of passages) {
    groupes.set(passage.source, [...(groupes.get(passage.source) ?? []), passage]);
  }
  return [...groupes.entries()].map(([source, liste]) => ({ source, passages: liste }));
}
