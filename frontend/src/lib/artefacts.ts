import { titreDepuisMarkdown } from "./format";
import type { Quiz, ToolStep } from "./types";

/**
 * Artefact produit par l'agent pendant une réponse.
 *
 * Il n'est **pas** affiché dans l'Atelier à sa création : la discussion en montre
 * une carte, et c'est le clic sur cette carte qui l'ouvre. Le contenu reste donc
 * attaché au message, ce qui permet de retrouver plusieurs artefacts dans une
 * même conversation.
 */
export type ArtefactChat =
  | { kind: "summary"; titre: string; markdown: string; apercu: string }
  | { kind: "quiz"; titre: string; quiz: Quiz; apercu: string };

function apercuResume(markdown: string): string {
  const points = markdown
    .split("\n")
    .filter((ligne) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(ligne)).length;
  if (!points) return "Texte structuré";
  return `${points} point${points > 1 ? "s" : ""}`;
}

/** Extrait les artefacts d'une réponse, dans l'ordre où les outils ont été appelés. */
export function artefactsDepuisEtapes(etapes?: ToolStep[]): ArtefactChat[] {
  if (!etapes?.length) return [];

  const artefacts: ArtefactChat[] = [];
  for (const etape of etapes) {
    if (etape.tool === "summarize") {
      const markdown = etape.data?.markdown;
      if (typeof markdown === "string" && markdown.trim()) {
        artefacts.push({
          kind: "summary",
          titre: titreDepuisMarkdown(markdown, "Résumé des sources"),
          markdown,
          apercu: apercuResume(markdown),
        });
      }
    }

    if (etape.tool === "generate_quiz") {
      const quiz = etape.data as unknown as Quiz | undefined;
      if (quiz?.questions?.length) {
        const nombre = quiz.questions.length;
        artefacts.push({
          kind: "quiz",
          titre: quiz.title || "Quiz",
          quiz,
          apercu: `${nombre} question${nombre > 1 ? "s" : ""}`,
        });
      }
    }
  }
  return artefacts;
}
