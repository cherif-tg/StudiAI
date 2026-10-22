/**
 * Export des données du compte.
 * 1. Si le serveur propose `GET /auth/me/export`, on télécharge son archive
 *    (elle contient aussi les fichiers d'origine).
 * 2. Sinon, on assemble dans le navigateur un fichier JSON à partir des routes
 *    existantes : profil, liste des documents, carnet complet, et les données
 *    gardées localement (historique, révisions).
 */
import { api, routeAbsente, urlApi } from "./api";
import { tousLesAvis } from "./avis";
import { toutesLesConversations } from "./conversations";
import { lireRevision } from "./revision";
import { telechargerFichier } from "./stockage";
import type { User } from "./types";

export type ModeExport = "serveur" | "navigateur";

export async function exporterDonnees(user: User): Promise<ModeExport> {
  try {
    const { blob, nom } = await api.exporterDonnees();
    telechargerFichier(blob, nom);
    return "serveur";
  } catch (erreur) {
    if (!routeAbsente(erreur)) throw erreur;
  }

  const [sources, artefacts] = await Promise.all([api.listSources(), api.listArtifacts()]);
  const carnet = await Promise.all(
    artefacts.map(async (artefact) => {
      let contenu: string | null = null;
      try {
        const reponse = await fetch(urlApi(artefact.url), { credentials: "include" });
        if (reponse.ok) contenu = await reponse.text();
      } catch {
        /* contenu indisponible : on garde au moins la fiche */
      }
      return { ...artefact, contenu };
    }),
  );

  const donnees = {
    format: "nunya-export/1",
    genere_le: new Date().toISOString(),
    remarque:
      "Export assemblé par le navigateur. Les fichiers d'origine des documents n'y figurent pas : " +
      "le serveur ne propose pas encore d'export complet.",
    profil: user,
    documents: sources,
    carnet,
    historique_local: toutesLesConversations(user.id),
    revision_locale: lireRevision(user.id),
    avis_locaux: tousLesAvis(user.id),
  };

  const date = new Date().toISOString().slice(0, 10);
  telechargerFichier(
    new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" }),
    `nunya-export-${date}.json`,
  );
  return "navigateur";
}
