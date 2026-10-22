import { useEffect, useMemo, useState } from "react";

import { Mark } from "../Brand";
import { Icon } from "../Icon";

/**
 * Indicateur affiché pendant que l'agent travaille : l'emblème respire, ses rayons
 * tournent doucement, et un statut évolue au fil des étapes habituelles d'une
 * réponse (réflexion, recherche, outils, rédaction).
 *
 * L'API répond en une fois : les étapes affichées suivent la durée écoulée et la
 * nature de la demande (résumé, quiz). Si le backend diffuse un jour ses étapes
 * réelles (voir README), il suffira de passer `etapeReelle`.
 */

type Etape = { cle: string; label: string; detail: string; des: number };

function etapesPour(question: string): Etape[] {
  const q = question.toLowerCase();
  const outil = /r[ée]sum|synth[eè]se/.test(q)
    ? { label: "Exécution des outils", detail: "Rédaction du résumé à partir des passages…" }
    : /quiz|qcm|questions?\b/.test(q)
      ? { label: "Exécution des outils", detail: "Préparation des questions du quiz…" }
      : { label: "Exécution des outils", detail: "Lecture et tri des passages trouvés…" };

  return [
    { cle: "reflexion", label: "Réflexion", detail: "Réflexion en cours…", des: 0 },
    { cle: "recherche", label: "Recherche", detail: "Recherche dans tes documents…", des: 1200 },
    { cle: "outils", label: outil.label, detail: outil.detail, des: 3000 },
    { cle: "generation", label: "Génération", detail: "Génération de la réponse…", des: 5200 },
  ];
}

export function IndicateurReflexion({
  question = "",
  etapeReelle,
}: {
  question?: string;
  /** Étape communiquée par le serveur (diffusion en continu), prioritaire sur l'estimation. */
  etapeReelle?: string;
}) {
  const etapes = useMemo(() => etapesPour(question), [question]);
  const [debut] = useState(() => Date.now());
  const [ecoule, setEcoule] = useState(0);

  useEffect(() => {
    const minuterie = window.setInterval(() => setEcoule(Date.now() - debut), 250);
    return () => window.clearInterval(minuterie);
  }, [debut]);

  const indexEstime = etapes.reduce((dernier, etape, i) => (ecoule >= etape.des ? i : dernier), 0);
  const indexReel = etapeReelle ? etapes.findIndex((etape) => etape.cle === etapeReelle) : -1;
  const index = indexReel >= 0 ? indexReel : indexEstime;
  const courante = etapes[index];
  const longue = ecoule > 14_000;
  const texte = longue ? "Encore un instant : la réponse est longue à rédiger…" : courante.detail;
  const secondes = Math.floor(ecoule / 1000);

  return (
    <div className="pensee" role="status" aria-live="polite" aria-label="Nunya prépare sa réponse">
      <div className="pensee__tete">
        <span className="pensee__logo" aria-hidden="true">
          <Mark size={30} className="nunya-mark--anime" />
        </span>
        <span className="pensee__texte" key={texte}>
          {texte}
        </span>
        {secondes >= 2 ? (
          <span className="pensee__duree" aria-hidden="true">
            {secondes} s
          </span>
        ) : null}
      </div>

      <ol className="pensee__etapes" aria-hidden="true">
        {etapes.map((etape, i) => (
          <li key={etape.cle} data-etat={i < index ? "fait" : i === index ? "en-cours" : "a-venir"}>
            <span className="pensee__puce">
              {i < index ? <Icon name="coche" size={10} strokeWidth={2.6} /> : null}
            </span>
            {etape.label}
          </li>
        ))}
      </ol>

      <div className="pensee__lignes" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
