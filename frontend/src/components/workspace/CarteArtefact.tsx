import { ArtifactGlyph } from "../ArtifactGlyph";
import { Icon } from "../Icon";
import type { ArtefactChat } from "../../lib/artefacts";

/**
 * Carte d'un artefact dans la discussion, dans l'esprit des artefacts de Claude :
 * un bloc discret qui annonce le type et le titre, et qui ouvre l'Atelier au clic.
 * Elle n'enregistre rien — c'est le rôle du bouton « Ajouter au Carnet ».
 */
export function CarteArtefact({
  artefact,
  onOuvrir,
}: {
  artefact: ArtefactChat;
  onOuvrir: () => void;
}) {
  const estResume = artefact.kind === "summary";

  return (
    <button
      type="button"
      className="carte-artefact"
      onClick={onOuvrir}
      aria-label={`Ouvrir ${artefact.titre} dans l'atelier`}
    >
      <span className="carte-artefact__icone">
        <ArtifactGlyph kind={estResume ? "summary" : "quiz"} size={26} />
      </span>

      <span className="carte-artefact__corps">
        <span className="carte-artefact__titre">{artefact.titre}</span>
        <span className="carte-artefact__meta">
          {estResume ? "Résumé" : "Quiz"} · {artefact.apercu}
        </span>
      </span>

      <span className="carte-artefact__ouvrir">
        Ouvrir
        <Icon name="fleche" size={13} />
      </span>
    </button>
  );
}
