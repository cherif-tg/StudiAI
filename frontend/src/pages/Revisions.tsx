import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ArtifactGlyph } from "../components/ArtifactGlyph";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthProvider";
import { formatDate } from "../lib/format";
import {
  BOITE_MAX,
  EVENEMENT_REVISION,
  cartesDues,
  lireRevision,
  noterReponse,
  prochaineEcheance,
} from "../lib/revision";
import type { Carte } from "../lib/revision";

const NOMS_BOITES = ["", "Demain", "3 jours", "1 semaine", "2 semaines", "Maîtrisée"];

function Seance({ cartes, compte, onFin }: { cartes: Carte[]; compte: string; onFin: () => void }) {
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [justes, setJustes] = useState(0);
  const [fini, setFini] = useState(false);

  const carte = cartes[index];

  if (fini || !carte) {
    return (
      <div className="sheet revision-card">
        <div className="sheet__head">
          <ArtifactGlyph kind="quiz" size={28} />
          <div>
            <h3>Séance terminée</h3>
            <span className="m">
              {justes} bonne{justes > 1 ? "s" : ""} réponse{justes > 1 ? "s" : ""} sur {cartes.length}
            </span>
          </div>
        </div>
        <p className="prose">
          Les questions réussies remontent d'une boîte et reviendront plus tard. Celles ratées
          reviennent demain.
        </p>
        <button className="btn btn--primary btn--sm" onClick={onFin} style={{ alignSelf: "flex-start" }}>
          Terminer
        </button>
      </div>
    );
  }

  const repondu = choix !== null;

  return (
    <div className="sheet revision-card" key={carte.id}>
      <div className="sheet__head">
        <ArtifactGlyph kind="quiz" size={28} />
        <div>
          <h3>{carte.notion}</h3>
          <span className="m">
            Question {index + 1} sur {cartes.length} · boîte {carte.boite}
          </span>
        </div>
      </div>

      <div className="revision-progress" aria-hidden="true">
        <span style={{ width: `${(index / cartes.length) * 100}%` }} />
      </div>

      <p className="prose" style={{ color: "var(--ink)", fontWeight: 500 }}>
        {carte.question}
      </p>

      <div className="stack gap-2">
        {carte.choices.map((reponse, i) => {
          const etat = !repondu
            ? undefined
            : i === carte.answer_index
              ? "good"
              : i === choix
                ? "bad"
                : undefined;
          return (
            <button
              key={i}
              className="quiz-option"
              data-state={etat}
              disabled={repondu}
              onClick={() => {
                const juste = i === carte.answer_index;
                setChoix(i);
                if (juste) setJustes((n) => n + 1);
                noterReponse(compte, carte.notion, carte, juste);
              }}
            >
              <span className="quiz-option__letter">{String.fromCharCode(65 + i)}</span>
              <span>{reponse}</span>
            </button>
          );
        })}
      </div>

      {repondu ? (
        <>
          {carte.explanation ? (
            <p className="prose" style={{ fontSize: "var(--text-sm)" }}>
              {carte.explanation}
            </p>
          ) : null}
          <button
            className="btn btn--primary btn--sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              setChoix(null);
              if (index + 1 < cartes.length) setIndex(index + 1);
              else setFini(true);
            }}
          >
            {index + 1 < cartes.length ? "Question suivante" : "Voir le bilan"}
            <Icon name="fleche" size={14} />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function Revisions() {
  const { user } = useAuth();
  const compte = user?.id ?? "";
  const [version, setVersion] = useState(0);
  const [seance, setSeance] = useState<Carte[] | null>(null);

  useEffect(() => {
    const actualiser = () => setVersion((v) => v + 1);
    window.addEventListener(EVENEMENT_REVISION, actualiser);
    return () => window.removeEventListener(EVENEMENT_REVISION, actualiser);
  }, []);

  const { dues, cartes, notions, prochaine } = useMemo(() => {
    const etat = lireRevision(compte);
    return {
      dues: cartesDues(compte),
      cartes: Object.values(etat.cartes),
      notions: Object.values(etat.notions).sort((a, b) => b.derniere - a.derniere),
      prochaine: prochaineEcheance(compte),
    };
    // `version` force la relecture après chaque réponse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compte, version]);

  const parBoite = Array.from({ length: BOITE_MAX }, (_, i) => cartes.filter((c) => c.boite === i + 1).length);
  const maitrisees = parBoite[BOITE_MAX - 1];
  const enCours = cartes.length - maitrisees;

  return (
    <AppShell>
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Révisions</p>
            <h1 style={{ marginTop: 6 }}>Réviser au bon moment</h1>
            <p>
              Les questions ratées dans tes quiz reviennent ici le lendemain, puis de plus en plus
              espacées quand tu les réussis. C'est la répétition espacée.
            </p>
          </div>
          {!seance && dues.length ? (
            <button className="btn btn--primary" onClick={() => setSeance(dues)}>
              <Icon name="etincelle" size={15} />
              Réviser maintenant ({dues.length})
            </button>
          ) : null}
        </div>

        <div className="revision-stats">
          <div className="stat">
            <span className="stat__value">{dues.length}</span>
            <span className="stat__label">À revoir aujourd'hui</span>
          </div>
          <div className="stat">
            <span className="stat__value">{enCours}</span>
            <span className="stat__label">En cours d'apprentissage</span>
          </div>
          <div className="stat stat--ok">
            <span className="stat__value">{maitrisees}</span>
            <span className="stat__label">Maîtrisées</span>
          </div>
        </div>

        {seance ? (
          <section className="section revision-session" style={{ marginTop: "var(--sp-6)" }}>
            <Seance cartes={seance} compte={compte} onFin={() => setSeance(null)} />
          </section>
        ) : dues.length === 0 ? (
          <div className="empty" style={{ marginTop: "var(--sp-6)", maxWidth: 620 }}>
            <h2>{cartes.length ? "Rien à revoir aujourd'hui" : "Pas encore de question à revoir"}</h2>
            <p>
              {cartes.length
                ? prochaine
                  ? `Prochaine révision le ${formatDate(Math.floor(prochaine / 1000))}.`
                  : "Toutes tes questions sont maîtrisées. Bravo !"
                : "Joue un quiz dans l'atelier : les questions ratées apparaîtront ici dès demain."}
            </p>
            <Link to="/atelier" className="btn btn--sm">
              Ouvrir l'atelier
              <Icon name="fleche" size={14} />
            </Link>
          </div>
        ) : null}

        {cartes.length ? (
          <section className="section" style={{ marginTop: "var(--sp-7)" }}>
            <div className="section-head">
              <h2 style={{ fontSize: "var(--text-xl)" }}>Les boîtes</h2>
              <span className="hint">Chaque bonne réponse fait avancer la question d'une boîte.</span>
            </div>
            <div className="boxes">
              {parBoite.map((nombre, i) => (
                <div key={i} className="box" data-last={i === BOITE_MAX - 1}>
                  <span className="box__count">{nombre}</span>
                  <span className="box__label">
                    Boîte {i + 1}
                    <small>{NOMS_BOITES[i + 1]}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {notions.length ? (
          <section className="section" style={{ marginTop: "var(--sp-7)" }}>
            <div className="section-head">
              <h2 style={{ fontSize: "var(--text-xl)" }}>Suivi par notion</h2>
              <span className="hint">Une notion correspond à un quiz.</span>
            </div>
            <div className="notions">
              {notions.map((notion) => {
                const taux = notion.vues ? Math.round((notion.justes / notion.vues) * 100) : 0;
                const aRevoir = dues.filter((c) => c.notion === notion.notion).length;
                return (
                  <div className="notion" key={notion.notion}>
                    <div className="notion__top">
                      <strong>{notion.notion}</strong>
                      <span className={`badge badge--${taux >= 80 ? "ok" : taux >= 50 ? "warn" : "danger"}`}>
                        {taux} % de réussite
                      </span>
                    </div>
                    <div className="notion__bar" aria-hidden="true">
                      <span style={{ width: `${taux}%` }} data-niveau={taux >= 80 ? "ok" : taux >= 50 ? "warn" : "bas"} />
                    </div>
                    <span className="notion__meta">
                      {notion.vues} réponse{notion.vues > 1 ? "s" : ""} · {aRevoir} à revoir · dernière
                      activité le {formatDate(Math.floor(notion.derniere / 1000))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <p className="hint" style={{ marginTop: "var(--sp-6)" }}>
          Ton suivi est gardé dans ce navigateur. Tu peux l'effacer depuis Réglages, Mes données.
        </p>
      </div>
    </AppShell>
  );
}
