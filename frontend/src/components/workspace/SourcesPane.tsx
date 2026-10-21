import { useRef, useState } from "react";

import { Icon } from "../Icon";
import { useAppData } from "../../context/AppDataProvider";

export function SourcesPane() {
  const {
    sources,
    sourcesEtat,
    sourcesErreur,
    selection,
    basculerSource,
    toutSelectionner,
    deposerFichiers,
    envoisEnCours,
    retirerSource,
    rafraichirSources,
  } = useAppData();

  const [survol, setSurvol] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  const ouvrirSelecteur = () => champFichier.current?.click();

  const traiter = (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    void deposerFichiers(Array.from(fichiers));
  };

  const toutActif = sources.length > 0 && selection.length === sources.length;

  return (
    <section className="pane pane--sources" aria-label="Sources">
      <div className="pane__head">
        <span className="pane__title">
          <Icon name="sources" size={15} />
          Sources
          {sources.length ? <span className="badge">{sources.length}</span> : null}
        </span>
        <div className="row gap-2">
          {sources.length > 1 ? (
            <button
              className="btn btn--quiet btn--sm"
              onClick={() => toutSelectionner(!toutActif)}
              title={toutActif ? "Tout désélectionner" : "Tout sélectionner"}
            >
              {toutActif ? "Aucune" : "Toutes"}
            </button>
          ) : null}
          <button className="btn btn--sm" onClick={ouvrirSelecteur} disabled={envoisEnCours > 0}>
            <Icon name="plus" size={14} />
            Ajouter
          </button>
        </div>
      </div>

      <div className="pane__body">
        {sourcesEtat === "loading" && !sources.length ? (
          <>
            <div className="skeleton" style={{ height: 44 }} />
            <div className="skeleton" style={{ height: 44 }} />
          </>
        ) : null}

        {sourcesEtat === "error" ? (
          <div className="empty">
            <h4>Documents indisponibles</h4>
            <p>{sourcesErreur ?? "Le serveur n'a pas répondu."}</p>
            <button className="btn btn--sm" onClick={() => void rafraichirSources()}>
              <Icon name="rafraichir" size={14} />
              Réessayer
            </button>
          </div>
        ) : null}

        {sourcesEtat === "ready" && !sources.length ? (
          <div className="empty">
            <h4>Aucun document</h4>
            <p>
              Dépose un cours en PDF ou Word : il sera découpé en passages et utilisé pour
              répondre à tes questions.
            </p>
          </div>
        ) : null}

        {sources.map((source) => {
          const actif = selection.includes(source.id);
          return (
            <div
              key={source.id}
              className="source-row"
              data-on={actif}
              onClick={() => basculerSource(source.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(evenement) => {
                if (evenement.key === "Enter" || evenement.key === " ") {
                  evenement.preventDefault();
                  basculerSource(source.id);
                }
              }}
              aria-pressed={actif}
            >
              <span className="checkbox-dot" aria-hidden="true">
                <Icon name="coche" size={11} strokeWidth={2.4} />
              </span>
              <div className="source-row__main">
                <span className="source-row__name" title={source.filename}>
                  {source.filename}
                </span>
                <span className="source-row__meta">
                  <span className="badge badge--ok" style={{ padding: "0 6px" }}>
                    Indexé
                  </span>
                  {source.chunks} passages
                </span>
              </div>
              <button
                className="btn btn--quiet btn--sm btn--icon"
                onClick={(evenement) => {
                  evenement.stopPropagation();
                  void retirerSource(source.id);
                }}
                aria-label={`Retirer ${source.filename}`}
                title="Retirer ce document"
              >
                <Icon name="corbeille" size={14} />
              </button>
            </div>
          );
        })}

        {envoisEnCours > 0 ? (
          <div className="row gap-2 small muted" style={{ padding: "8px 12px" }}>
            <span className="spinner" />
            Indexation en cours ({envoisEnCours})…
          </div>
        ) : null}
      </div>

      <div className="pane__foot">
        <button
          className="dropzone"
          data-over={survol}
          onClick={ouvrirSelecteur}
          onDragOver={(evenement) => {
            evenement.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(evenement) => {
            evenement.preventDefault();
            setSurvol(false);
            traiter(evenement.dataTransfer.files);
          }}
          type="button"
        >
          <Icon name="depot" size={18} />
          <span>
            <strong style={{ color: "var(--ink)" }}>Déposer un PDF ou un Word</strong>
            <br />
            ou cliquer pour choisir un fichier
          </span>
        </button>
        <input
          ref={champFichier}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={(evenement) => {
            traiter(evenement.target.files);
            evenement.target.value = "";
          }}
          hidden
        />
        <p className="hint" style={{ marginTop: 8, textAlign: "center" }}>
          Tes documents restent dans ta session.
        </p>
      </div>
    </section>
  );
}
