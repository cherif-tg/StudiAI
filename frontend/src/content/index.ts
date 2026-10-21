import api from "./06-api.md?raw";
import atelierCarnet from "./04-atelier-carnet.md?raw";
import autoHebergement from "./05-auto-hebergement.md?raw";
import demarrer from "./01-demarrer.md?raw";
import documents from "./02-documents.md?raw";
import limites from "./07-limites-depannage.md?raw";
import questions from "./03-questions.md?raw";

export type Section = {
  slug: string;
  titre: string;
  resume: string;
  contenu: string;
};

/**
 * Documentation publique de l'application. Le contenu vit en Markdown pour
 * rester relisible hors du code ; l'ordre de ce tableau est celui du sommaire.
 */
export const SECTIONS: Section[] = [
  {
    slug: "demarrer",
    titre: "Démarrer",
    resume: "Premier parcours, session, badge d'état",
    contenu: demarrer,
  },
  {
    slug: "documents",
    titre: "Documents",
    resume: "Formats, indexation, sélection, suppression",
    contenu: documents,
  },
  {
    slug: "questions",
    titre: "Questions et réponses",
    resume: "Comment l'agent cherche, et quand il refuse",
    contenu: questions,
  },
  {
    slug: "atelier-carnet",
    titre: "Atelier et carnet",
    resume: "Résumé, quiz, persistance à la demande",
    contenu: atelierCarnet,
  },
  {
    slug: "auto-hebergement",
    titre: "Auto-héberger",
    resume: "Installation, Docker, tunnel, sauvegarde",
    contenu: autoHebergement,
  },
  {
    slug: "api",
    titre: "Référence de l'API",
    resume: "Routes, exemples, codes d'erreur",
    contenu: api,
  },
  {
    slug: "limites",
    titre: "Limites et dépannage",
    resume: "Ce qui n'est pas fait, et quoi faire quand ça bloque",
    contenu: limites,
  },
];

/** Texte brut d'un Markdown, pour la recherche et les extraits. */
export function texteBrut(contenu: string): string {
  return contenu
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`|-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
