import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ArtifactGlyph } from "../components/ArtifactGlyph";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
import { Mark } from "../components/Brand";
import { useAuth } from "../context/AuthProvider";

/* --------------------------------------------------------------------------
   Contenu
   -------------------------------------------------------------------------- */

const GARANTIES = [
  { icone: "coche" as IconName, texte: "Réponses citées" },
  { icone: "cle" as IconName, texte: "Documents privés" },
  { icone: "sources" as IconName, texte: "PDF et Word" },
  { icone: "horloge" as IconName, texte: "Éwé : après le MVP" },
];

const ETAPES = [
  {
    icone: "depot" as IconName,
    titre: "Dépose tes cours",
    texte:
      "PDF ou Word. Le document est découpé en passages, puis indexé par un modèle multilingue qui tourne sur ton serveur.",
  },
  {
    icone: "discussion" as IconName,
    titre: "Pose ta question",
    texte:
      "L'agent décide lui-même d'aller chercher dans tes sources. Il ne répond qu'avec les passages trouvés — sinon il le dit.",
  },
  {
    icone: "carnet" as IconName,
    titre: "Garde ce qui compte",
    texte:
      "Un résumé, un quiz : tout reste à l'écran jusqu'à ce que tu cliques sur « Ajouter au Carnet ». Rien ne s'enregistre tout seul.",
  },
];

const FONCTIONNALITES = [
  {
    icone: "discussion" as IconName,
    titre: "Questions ancrées",
    texte:
      "Chaque réponse s'appuie sur les passages de tes documents. Une question hors corpus reçoit un refus, pas une approximation.",
  },
  {
    icone: "sources" as IconName,
    titre: "Plusieurs documents à la fois",
    texte:
      "Coche les sources utiles : l'agent cherche dans la sélection, pas dans tout ce que tu as déposé.",
  },
  {
    icone: "atelier" as IconName,
    titre: "Résumé structuré",
    texte:
      "Un plan court, des points clés, la longueur que tu demandes. Généré depuis tes passages, jamais depuis un modèle qui « sait » à ta place.",
  },
  {
    icone: "carnet" as IconName,
    titre: "Quiz d'auto-évaluation",
    texte:
      "Des QCM tirés du cours, jouables immédiatement, avec l'explication de chaque réponse et le score à la fin.",
  },
  {
    icone: "etincelle" as IconName,
    titre: "Trace des outils",
    texte:
      "Sous chaque réponse, les outils réellement appelés. Tu vois ce que l'agent a fait, au lieu de le croire sur parole.",
  },
  {
    icone: "cle" as IconName,
    titre: "Compte personnel",
    texte:
      "Documents et carnet liés à ton compte, accessibles d'un appareil à l'autre. Aucun partage entre deux personnes.",
  },
];

const PUBLICS = [
  {
    titre: "Étudiant",
    texte: "Réviser un chapitre, vérifier une notion, s'auto-évaluer avant un contrôle.",
  },
  {
    titre: "Enseignant",
    texte: "Préparer un quiz à partir de son propre cours, sans ressaisir le contenu.",
  },
  {
    titre: "Autodidacte",
    texte: "Transformer des PDF accumulés en réponses claires et en fiches consultables.",
  },
];

const FRONTIERES = [
  {
    titre: "Aucune réponse inventée",
    texte: "Si le document ne contient pas l'information, l'agent refuse de répondre.",
  },
  {
    titre: "Aucun artefact automatique",
    texte: "Résumés et quiz ne rejoignent le carnet que sur un clic explicite.",
  },
  {
    titre: "Aucun classement public",
    texte: "Pas de score partagé, pas de comparaison entre apprenants.",
  },
  {
    titre: "Aucune traduction non relue",
    texte: "L'éwé arrivera avec une relecture par un locuteur natif, pas avant.",
  },
];

/* --------------------------------------------------------------------------
   Révélation au défilement
   -------------------------------------------------------------------------- */

function useRevelation(actif: boolean) {
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actif || !racine.current) return undefined;
    const cibles = racine.current.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      cibles.forEach((cible) => cible.classList.add("vu"));
      return undefined;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) {
            entree.target.classList.add("vu");
            observateur.unobserve(entree.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    cibles.forEach((cible) => observateur.observe(cible));
    return () => observateur.disconnect();
  }, [actif]);

  return racine;
}

/* --------------------------------------------------------------------------
   Visuel du héros : le trajet d'un document vers une réponse citée
   -------------------------------------------------------------------------- */

function Pipeline() {
  return (
    <div className="lp-pipe" aria-hidden="true">
      <div className="lp-pipe__row">
        <div className="lp-pipe__node">
          <Icon name="sources" size={17} />
          <span>cours.pdf</span>
        </div>
        <div className="lp-pipe__track">
          <span className="lp-pipe__dot" />
        </div>
        <div className="lp-pipe__node">
          <Icon name="atelier" size={17} />
          <span>passages</span>
        </div>
        <div className="lp-pipe__track">
          <span className="lp-pipe__dot lp-pipe__dot--2" />
        </div>
        <div className="lp-pipe__node">
          <Icon name="etincelle" size={17} />
          <span>recherche</span>
        </div>
      </div>

      <div className="lp-answer">
        <p>
          Sans lumière, la phase claire ne produit plus l'ATP ni le NADPH dont le cycle de
          Calvin a besoin : il ralentit, puis s'arrête.
        </p>
        <div className="lp-answer__foot">
          <span className="badge">Chapitre 3 · p. 14</span>
          <span className="badge badge--ok">Sourcé</span>
          <ArtifactGlyph kind="summary" size={20} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */

export function Landing() {
  const { user } = useAuth();
  const destination = user ? "/atelier" : "/connexion";
  const libelle = user ? "Ouvrir l'atelier" : "Créer un compte";

  const [anime, setAnime] = useState(false);

  useEffect(() => {
    const reduire = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduire) setAnime(true);
  }, []);

  const racine = useRevelation(anime);

  return (
    <AppShell>
      <div className={`landing${anime ? " landing--anime" : ""}`} ref={racine}>
        {/* --- Héros ------------------------------------------------------ */}
        <section className="lp-hero">
          <div className="lp-hero__text">
            <p className="eyebrow">Atelier d'apprentissage documentaire · Togo</p>
            <h1 className="lp-hero__title">
              Apprendre commence
              <br />
              par <em>comprendre</em>.
            </h1>
            <p className="lp-hero__lead">
              Nunya lit tes cours, retrouve le passage juste et répond avec sa source. Résumés
              et quiz se génèrent à la demande — et rien n'est conservé sans ton geste.
            </p>

            <div className="lp-actions">
              <Link to={destination} className="btn btn--primary btn--lg">
                {libelle}
                <Icon name="fleche" size={17} />
              </Link>
              <Link to="/documentation" className="btn btn--lg">
                Voir comment ça marche
              </Link>
            </div>

            {!user ? (
              <p className="lp-connect">
                Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
              </p>
            ) : null}
          </div>

          <div className="lp-hero__visual">
            <div className="lp-orbit">
              <span className="lp-glyph lp-glyph--1" aria-hidden="true">
                Ɖ
              </span>
              <span className="lp-glyph lp-glyph--2" aria-hidden="true">
                ƒ
              </span>
              <span className="lp-glyph lp-glyph--3" aria-hidden="true">
                Ŋ
              </span>
              <span className="lp-glyph lp-glyph--4" aria-hidden="true">
                ɛ
              </span>

              <svg className="lp-mark" viewBox="0 0 64 64" aria-hidden="true">
                <path
                  className="lp-mark__path"
                  pathLength={1}
                  d="M32 54V28"
                  stroke="var(--green)"
                />
                <path
                  className="lp-mark__path lp-mark__path--2"
                  pathLength={1}
                  d="M32 28C12 28 12 6 29 4"
                  stroke="var(--green)"
                />
                <path
                  className="lp-mark__path lp-mark__path--3"
                  pathLength={1}
                  d="M32 32C52 32 52 12 37 8"
                  stroke="var(--accent)"
                />
              </svg>
            </div>

            <Pipeline />
          </div>
        </section>

        {/* --- Garanties --------------------------------------------------- */}
        <ul className="lp-garanties" aria-label="Ce que garantit Nunya">
          {GARANTIES.map((item) => (
            <li key={item.texte}>
              <Icon name={item.icone} size={16} />
              {item.texte}
            </li>
          ))}
        </ul>

        {/* --- Démarche ---------------------------------------------------- */}
        <section className="section">
          <header className="lp-head" data-reveal>
            <p className="eyebrow">La démarche</p>
            <h2>Trois gestes, dans l'ordre</h2>
            <p className="lp-head__lead">
              Pas de tableau de bord à configurer. Déposer, demander, garder : le reste est du
              travail d'indexation.
            </p>
          </header>

          <ol className="lp-steps">
            {ETAPES.map((etape, index) => (
              <li key={etape.titre} data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                <span className="lp-steps__num">{String(index + 1).padStart(2, "0")}</span>
                <span className="lp-steps__icon">
                  <Icon name={etape.icone} size={19} />
                </span>
                <h3>{etape.titre}</h3>
                <p>{etape.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* --- Sous le capot ----------------------------------------------- */}
        <section className="lp-under" aria-label="Comment l'agent travaille">
          <div className="lp-under__text" data-reveal>
            <p className="eyebrow" style={{ color: "var(--info)" }}>
              Sous le capot
            </p>
            <h2>Une recherche documentaire, pas une mémoire</h2>
            <p>
              Le modèle de langage ne connaît pas ton cours. Il reçoit les passages retrouvés
              dans <strong>tes</strong> documents, puis rédige à partir d'eux. C'est ce qui rend
              la réponse vérifiable : chaque affirmation vient d'un extrait que tu peux relire.
            </p>
            <ul className="lp-checks">
              <li>
                <Icon name="coche" size={15} /> Index vectoriel local, multilingue
              </li>
              <li>
                <Icon name="coche" size={15} /> Sélection des sources par question
              </li>
              <li>
                <Icon name="coche" size={15} /> Refus explicite hors corpus
              </li>
            </ul>
          </div>

          <div className="lp-under__diagram" data-reveal aria-hidden="true">
            <div className="lp-flow">
              <div className="lp-flow__box">
                <Icon name="sources" size={16} />
                Documents
              </div>
              <span className="lp-flow__arrow" />
              <div className="lp-flow__box">
                <Icon name="atelier" size={16} />
                Passages
              </div>
              <span className="lp-flow__arrow" />
              <div className="lp-flow__box">
                <Icon name="etincelle" size={16} />
                Agent
              </div>
              <span className="lp-flow__arrow" />
              <div className="lp-flow__box lp-flow__box--accent">
                <Icon name="discussion" size={16} />
                Réponse citée
              </div>
            </div>
            <p className="lp-flow__note">Aucune étape ne sort de ton serveur, sauf l'appel au modèle.</p>
          </div>
        </section>

        {/* --- Fonctionnalités --------------------------------------------- */}
        <section className="section">
          <header className="lp-head" data-reveal>
            <p className="eyebrow">Fonctionnalités</p>
            <h2>Un atelier, pas un chatbot de plus</h2>
            <p className="lp-head__lead">
              Six capacités seulement, mais chacune vérifiable. Ce qui n'est pas prêt est
              annoncé comme tel dans l'interface.
            </p>
          </header>

          <div className="lp-grid">
            {FONCTIONNALITES.map((item, index) => (
              <article
                key={item.titre}
                className="lp-card"
                data-reveal
                style={{ transitionDelay: `${(index % 3) * 80}ms` }}
              >
                <span className="lp-card__icon">
                  <Icon name={item.icone} size={19} />
                </span>
                <h3>{item.titre}</h3>
                <p>{item.texte}</p>
              </article>
            ))}
          </div>
        </section>

        {/* --- Publics ----------------------------------------------------- */}
        <section className="section">
          <header className="lp-head" data-reveal>
            <p className="eyebrow">Pour qui</p>
            <h2>Trois usages, un même geste</h2>
          </header>

          <div className="lp-publics">
            {PUBLICS.map((public_, index) => (
              <div key={public_.titre} className="lp-public" data-reveal style={{ transitionDelay: `${index * 80}ms` }}>
                <h3>{public_.titre}</h3>
                <p>{public_.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- Frontières --------------------------------------------------- */}
        <section className="lp-limites" data-reveal>
          <div className="lp-limites__head">
            <p className="eyebrow" style={{ color: "var(--red)" }}>
              Nos limites
            </p>
            <h2>Ce que Nunya refuse de faire</h2>
            <p>
              Un outil d'apprentissage se juge autant à ce qu'il n'invente pas qu'à ce qu'il
              produit.
            </p>
          </div>

          <div className="lp-limites__grid">
            {FRONTIERES.map((item) => (
              <div key={item.titre} className="lp-limite">
                <h3>{item.titre}</h3>
                <p>{item.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- Alphabet ----------------------------------------------------- */}
        <section className="lp-alphabet" aria-label="Couverture typographique de l'éwé">
          <div>
            <p className="eyebrow" style={{ color: "var(--info)" }}>
              Langue éwé
            </p>
            <p className="small muted">
              Tous les caractères s'affichent déjà. La traduction arrive après le MVP, relue par
              un locuteur natif.
            </p>
          </div>
          <div className="lp-alphabet__glyphs" lang="ee">
            Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ
          </div>
        </section>

        {/* --- Appel final --------------------------------------------------- */}
        <section className="lp-cta" data-reveal>
          <div>
            <h2>Un cours à réviser ce soir ?</h2>
            <p>
              Le compte est gratuit et prend dix secondes. Ton carnet te suit ensuite d'un
              appareil à l'autre.
            </p>
          </div>
          <Link to={destination} className="btn btn--primary btn--lg">
            {user ? "Reprendre l'atelier" : "Commencer maintenant"}
            <Icon name="fleche" size={17} />
          </Link>
        </section>

        <footer className="lp-footer">
          <div className="lp-footer__brand">
            <Mark size={22} />
            <span>
              Nunya — atelier d'apprentissage, Togo.
              <br />
              <span className="muted small">MVP documentaire en construction.</span>
            </span>
          </div>
          <nav className="lp-footer__links" aria-label="Liens de pied de page">
            <Link to="/documentation">Documentation</Link>
            <Link to={user ? "/documentation#auto-hebergement" : "/connexion"}>
              {user ? "Auto-héberger" : "Connexion"}
            </Link>
            <Link to="/documentation#limites">Limites</Link>
          </nav>
        </footer>
      </div>
    </AppShell>
  );
}
