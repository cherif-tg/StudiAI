import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ArtifactGlyph, libelleForme } from "../components/ArtifactGlyph";
import { Icon } from "../components/Icon";
import { useAppData } from "../context/AppDataProvider";
import { formatDateHeure } from "../lib/format";

type Filtre = "tous" | "summary" | "quiz";

export function Carnet() {
  const { artefacts, artefactsEtat, rafraichirArtefacts, sessionId, nouvelleSession } = useAppData();
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const liste = useMemo(() => {
    if (filtre === "tous") return artefacts;
    return artefacts.filter((artefact) => artefact.kind === filtre);
  }, [artefacts, filtre]);

  const compteur = (kind: Filtre) =>
    kind === "tous" ? artefacts.length : artefacts.filter((a) => a.kind === kind).length;

  return (
    <AppShell>
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Carnet</p>
            <h1 style={{ marginTop: 6 }}>Mon Nunyati</h1>
            <p>
              Ce que tu as choisi de garder. Chaque entrée correspond à un geste explicite de ta
              part — rien n'arrive ici par accident.
            </p>
          </div>
          <div className="row gap-2">
            <button className="btn" onClick={() => void rafraichirArtefacts()}>
              <Icon name="rafraichir" size={15} />
              Rafraîchir
            </button>
            <Link to="/atelier" className="btn btn--primary">
              <Icon name="atelier" size={15} />
              Ouvrir l'atelier
            </Link>
          </div>
        </div>

        <div className="row gap-2" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap" }}>
          {(["tous", "summary", "quiz"] as Filtre[]).map((valeur) => (
            <button
              key={valeur}
              className={`chip${filtre === valeur ? " chip--on" : ""}`}
              onClick={() => setFiltre(valeur)}
              aria-pressed={filtre === valeur}
            >
              {valeur === "tous" ? "Tout" : valeur === "summary" ? "Résumés" : "Quiz"}
              <span className="muted">· {compteur(valeur)}</span>
            </button>
          ))}
        </div>

        {artefactsEtat === "loading" && !artefacts.length ? (
          <div className="artefact-grid">
            {[0, 1, 2].map((cle) => (
              <div key={cle} className="skeleton" style={{ height: 148, borderRadius: 22 }} />
            ))}
          </div>
        ) : null}

        {artefactsEtat === "error" ? (
          <div className="empty">
            <h4>Carnet indisponible</h4>
            <p>Le serveur n'a pas répondu. Tes artefacts enregistrés ne sont pas perdus.</p>
            <button className="btn btn--sm" onClick={() => void rafraichirArtefacts()}>
              <Icon name="rafraichir" size={14} />
              Réessayer
            </button>
          </div>
        ) : null}

        {artefactsEtat === "ready" && !liste.length ? (
          <div className="empty" style={{ maxWidth: 560 }}>
            <h4>{artefacts.length ? "Rien dans ce filtre" : "Ton carnet est vide"}</h4>
            <p>
              {artefacts.length
                ? "Change de filtre pour voir les autres artefacts."
                : "Génère un résumé ou un quiz dans l'atelier, puis clique sur « Ajouter au Carnet ». Sans ce geste, rien n'est enregistré."}
            </p>
            {!artefacts.length ? (
              <Link to="/atelier" className="btn btn--sm">
                Générer un premier résumé
                <Icon name="fleche" size={14} />
              </Link>
            ) : null}
          </div>
        ) : null}

        {liste.length ? (
          <div className="artefact-grid">
            {liste.map((artefact) => (
              <article className="artefact" key={artefact.id}>
                <div className="artefact__top">
                  <ArtifactGlyph kind={artefact.kind} size={34} />
                  <div>
                    <h2 className="artefact__title">{artefact.title}</h2>
                  </div>
                </div>

                <div className="artefact__meta">
                  <span className="badge">{libelleForme(artefact.kind)}</span>
                  <span className="row gap-1">
                    <Icon name="horloge" size={12} />
                    {formatDateHeure(artefact.created_at)}
                  </span>
                </div>

                <div className="artefact__actions">
                  <a
                    className="btn btn--sm"
                    href={artefact.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Icon name="externe" size={13} />
                    Ouvrir
                  </a>
                  <a className="btn btn--sm" href={artefact.url} download>
                    <Icon name="telecharger" size={13} />
                    Télécharger
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <p className="hint" style={{ marginTop: "var(--sp-6)" }}>
          Session <span className="mono">{sessionId.slice(0, 8)}</span> ·{" "}
          <button className="btn btn--quiet btn--sm" onClick={nouvelleSession}>
            Démarrer une nouvelle session
          </button>
        </p>
      </div>
    </AppShell>
  );
}
