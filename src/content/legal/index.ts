import aPropos from "./a-propos.md?raw";
import conditions from "./conditions.md?raw";
import confidentialite from "./confidentialite.md?raw";

/**
 * Pages juridiques et institutionnelles. Le texte vit en Markdown pour rester
 * relisible (et relu) hors du code. Les champs entre doubles accolades sont
 * remplacés à l'affichage par la configuration de l'instance ci-dessous.
 */

export type CleJuridique = "confidentialite" | "conditions" | "a-propos";

export type PageJuridique = {
  cle: CleJuridique;
  chemin: string;
  eyebrow: string;
  titre: string;
  resume: string;
  miseAJour: string;
  contenu: string;
};

/** Identité de l'exploitant : à renseigner dans `.env` pour une instance publique. */
const env = import.meta.env;
export const INSTANCE = {
  editeur: env.VITE_EDITEUR_NOM?.trim() || "l'équipe Nunya",
  hebergeur: env.VITE_HEBERGEUR_NOM?.trim() || "L'hébergeur du serveur",
  contact: env.VITE_CONTACT_EMAIL?.trim() || "",
};

const MISE_A_JOUR = "22 octobre 2026";

function remplir(texte: string): string {
  const contact = INSTANCE.contact
    ? `\`${INSTANCE.contact}\``
    : "l'équipe via le formulaire de contact en bas de page";
  return texte
    .replaceAll("{{EDITEUR}}", INSTANCE.editeur)
    .replaceAll("{{HEBERGEUR}}", INSTANCE.hebergeur)
    .replaceAll("{{CONTACT}}", contact);
}

export const PAGES_JURIDIQUES: Record<CleJuridique, PageJuridique> = {
  confidentialite: {
    cle: "confidentialite",
    chemin: "/confidentialite",
    eyebrow: "Données personnelles",
    titre: "Politique de confidentialité",
    resume: "Ce que nous collectons, pourquoi, et comment tes données sont protégées.",
    miseAJour: MISE_A_JOUR,
    contenu: remplir(confidentialite),
  },
  conditions: {
    cle: "conditions",
    chemin: "/conditions",
    eyebrow: "Cadre d'utilisation",
    titre: "Conditions d'utilisation",
    resume: "Les règles du service, tes droits sur tes contenus et nos engagements.",
    miseAJour: MISE_A_JOUR,
    contenu: remplir(conditions),
  },
  "a-propos": {
    cle: "a-propos",
    chemin: "/a-propos",
    eyebrow: "Le projet",
    titre: "À propos",
    resume: "La mission, les principes et l'état d'avancement de Nunya.",
    miseAJour: MISE_A_JOUR,
    contenu: remplir(aPropos),
  },
};

export type SectionJuridique = { id: string; titre: string; contenu: string };

/** Découpe une page en sections `## Titre {#ancre}` pour le sommaire et les liens directs. */
export function sections(contenu: string): { intro: string; sections: SectionJuridique[] } {
  const sansTitre = contenu.replace(/^# .*\n+/, "");
  const morceaux = sansTitre.split(/^## /m);
  const intro = morceaux.shift()?.trim() ?? "";
  return {
    intro,
    sections: morceaux.map((morceau) => {
      const [ligne, ...reste] = morceau.split("\n");
      const ancre = /\{#([\w-]+)\}\s*$/.exec(ligne);
      const titre = ligne.replace(/\s*\{#[\w-]+\}\s*$/, "").trim();
      const id =
        ancre?.[1] ??
        titre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      return { id, titre, contenu: reste.join("\n").trim() };
    }),
  };
}
