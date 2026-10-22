import { useEffect, useState } from "react";

import { ArtifactGlyph } from "../ArtifactGlyph";
import { Icon } from "../Icon";
import { Markdown } from "../Markdown";
import { useAuth } from "../../context/AuthProvider";
import { noterReponse } from "../../lib/revision";
import type { Quiz } from "../../lib/types";

export type CleOutil = "resume" | "quiz" | "graphique" | "fiche" | "export";

const OUTILS: { cle: CleOutil; label: string; icone: "resume" | "quiz" | "graphique" | "fiche" | "export" }[] = [
  { cle: "resume", label: "Résumé", icone: "resume" },
  { cle: "quiz", label: "Quiz", icone: "quiz" },
  { cle: "graphique", label: "Graphique", icone: "graphique" },
  { cle: "fiche", label: "Fiche", icone: "fiche" },
  { cle: "export", label: "Export", icone: "export" },
];

const A_VENIR: Record<string, string> = {
  graphique:
    "Les graphiques seront produits par des gabarits fixes, sans exécuter de code généré. Cette brique arrive après le MVP.",
  fiche:
    "La fiche de révision bilingue est la dernière brique du projet : elle dépend de la traduction en éwé, qui arrive juste après le MVP.",
  export:
    "L'export PDF et Word réutilisera le contenu déjà généré. Il arrive après le MVP, une fois le Carnet stabilisé.",
};

function AireDeTravail({
  outil,
  label,
  texte,
}: {
  outil: string;
  label: string;
  texte: string;
}) {
  return (
    <>
      <div className="sheet">
        <div className="sheet__head">
          <ArtifactGlyph kind={outil === "fiche" ? "fiche" : outil} size={28} />
          <div>
            <h3>{label}</h3>
            <span className="m">Bientôt disponible</span>
          </div>
        </div>
        <p className="prose">{texte}</p>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Rien n'est simulé : cet outil n'est pas encore branché sur le moteur du MVP.
      </p>
    </>
  );
}

function LecteurQuiz({
  quiz,
  onAjouter,
  enregistrement,
}: {
  quiz: Quiz;
  onAjouter: () => void;
  enregistrement: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState<Record<number, number>>({});
  const [termine, setTermine] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIndex(0);
    setChoix({});
    setTermine(false);
  }, [quiz]);

  const question = quiz.questions[index];
  const selection = choix[index];
  const score = quiz.questions.reduce(
    (total, q, i) => (choix[i] === q.answer_index ? total + 1 : total),
    0,
  );

  if (termine) {
    return (
      <div className="sheet">
        <div className="sheet__head">
          <ArtifactGlyph kind="quiz" size={28} />
          <div>
            <h3>Quiz terminé</h3>
            <span className="m">
              Score : {score} sur {quiz.questions.length}
            </span>
          </div>
        </div>

        <div className="stack gap-2">
          {quiz.questions.map((q, i) => {
            const juste = choix[i] === q.answer_index;
            return (
              <div key={i} className="row gap-2" style={{ alignItems: "flex-start" }}>
                <span
                  className="dot"
                  style={{ marginTop: 7, color: juste ? "var(--green)" : "var(--red)" }}
                  aria-hidden="true"
                />
                <span className="small" style={{ color: "var(--ink-soft)" }}>
                  {q.question}
                </span>
              </div>
            );
          })}
        </div>

        <div className="row gap-2" style={{ marginTop: 4, flexWrap: "wrap" }}>
          <button
            className="btn btn--sm"
            onClick={() => {
              setIndex(0);
              setChoix({});
              setTermine(false);
            }}
          >
            <Icon name="rafraichir" size={13} />
            Rejouer
          </button>
          <button className="btn btn--primary btn--sm" onClick={onAjouter} disabled={enregistrement}>
            <Icon name="carnet" size={14} />
            Ajouter au Carnet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet">
      <div className="sheet__head">
        <ArtifactGlyph kind="quiz" size={28} />
        <div>
          <h3>{quiz.title}</h3>
          <span className="m">
            Question {index + 1} sur {quiz.questions.length}
          </span>
        </div>
      </div>

      <p className="prose" style={{ color: "var(--ink)", fontWeight: 500 }}>
        {question.question}
      </p>

      <div className="stack gap-2">
        {question.choices.map((reponse, i) => {
          const repondu = selection !== undefined;
          const etat = !repondu
            ? undefined
            : i === question.answer_index
              ? "good"
              : i === selection
                ? "bad"
                : undefined;
          return (
            <button
              key={i}
              className="quiz-option"
              data-state={etat}
              disabled={repondu}
              onClick={() => {
                setChoix((precedent) => ({ ...precedent, [index]: i }));
                // Révision espacée : une question ratée reviendra au bon moment.
                if (user) noterReponse(user.id, quiz.title, question, i === question.answer_index);
              }}
            >
              <span className="quiz-option__letter">{String.fromCharCode(65 + i)}</span>
              <span>{reponse}</span>
            </button>
          );
        })}
      </div>

      {selection !== undefined ? (
        <>
          {question.explanation ? (
            <p className="prose" style={{ fontSize: "var(--text-sm)" }}>
              {question.explanation}
            </p>
          ) : null}
          <button
            className="btn btn--primary btn--sm"
            onClick={() => {
              if (index + 1 < quiz.questions.length) setIndex(index + 1);
              else setTermine(true);
            }}
          >
            {index + 1 < quiz.questions.length ? "Question suivante" : "Voir le score"}
            <Icon name="fleche" size={14} />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function AtelierPane({
  outil,
  setOutil,
  resume,
  quiz,
  onAjouterResume,
  onAjouterQuiz,
  enregistrement,
  onFermer,
}: {
  outil: CleOutil;
  setOutil: (outil: CleOutil) => void;
  resume: string;
  quiz: Quiz | null;
  onAjouterResume: () => void;
  onAjouterQuiz: () => void;
  enregistrement: boolean;
  /** Replie le volet ; il se rouvre en cliquant la carte d'un artefact. */
  onFermer?: () => void;
}) {
  const label = OUTILS.find((o) => o.cle === outil)?.label ?? "Résumé";

  return (
    <section className="pane pane--atelier" aria-label="Atelier">
      <div className="pane__head">
        <h2 className="pane__title">
          <Icon name="atelier" size={15} />
          Atelier
        </h2>
        <span className="badge">Sans enregistrement</span>
        {onFermer ? (
          <button
            type="button"
            className="btn btn--quiet btn--icon btn--sm"
            onClick={onFermer}
            aria-label="Replier l'atelier"
            title="Replier l'atelier"
          >
            <Icon name="fermer" size={14} />
          </button>
        ) : null}
      </div>

      <div className="tools" role="toolbar" aria-label="Outils de l'atelier">
        {OUTILS.map((element) => {
          const bientot = element.cle === "graphique" || element.cle === "fiche" || element.cle === "export";
          return (
            <button
              key={element.cle}
              className="tool"
              aria-pressed={outil === element.cle}
              data-soon={bientot}
              onClick={() => setOutil(element.cle)}
              title={bientot ? `${element.label} (bientôt disponible)` : element.label}
            >
              <ArtifactGlyph kind={element.icone} size={20} />
              {element.label}
            </button>
          );
        })}
      </div>

      <div className="pane__body">
        {outil === "resume" ? (
          resume ? (
            <>
              <div className="sheet">
                <div className="sheet__head">
                  <ArtifactGlyph kind="summary" size={28} />
                  <div>
                    <h3>Résumé des sources</h3>
                    <span className="m">Généré depuis tes documents</span>
                  </div>
                </div>
                <Markdown text={resume} />
              </div>
              <button
                className="btn btn--primary btn--block"
                style={{ marginTop: 10 }}
                onClick={onAjouterResume}
                disabled={enregistrement}
              >
                <Icon name="carnet" size={15} />
                Ajouter au Carnet
              </button>
              <p className="hint" style={{ marginTop: 8 }}>
                Rien n'est enregistré tant que tu ne cliques pas.
              </p>
            </>
          ) : (
            <div className="empty">
              <h3>Aucun résumé pour l'instant</h3>
              <p>
                Quand l'agent produit un résumé, une carte apparaît dans la discussion.
                Clique-la pour l'ouvrir ici — rien ne s'affiche automatiquement.
              </p>
            </div>
          )
        ) : null}

        {outil === "quiz" ? (
          quiz ? (
            <LecteurQuiz quiz={quiz} onAjouter={onAjouterQuiz} enregistrement={enregistrement} />
          ) : (
            <div className="empty">
              <h3>Aucun quiz pour l'instant</h3>
              <p>
                Quand l'agent produit un quiz, une carte apparaît dans la discussion.
                Clique-la pour le jouer ici — rien ne s'affiche automatiquement.
              </p>
            </div>
          )
        ) : null}

        {outil !== "resume" && outil !== "quiz" ? (
          <AireDeTravail outil={outil} label={label} texte={A_VENIR[outil]} />
        ) : null}
      </div>
    </section>
  );
}
