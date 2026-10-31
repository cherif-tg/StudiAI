import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ArtifactGlyph } from "../components/ArtifactGlyph";
import { Mark } from "../components/Brand";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/Icon";
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
      "L'agent décide lui-même d'aller chercher dans tes sources. Il ne répond qu'avec les passages trouvés, sinon il le dit.",
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

const EVOLUTIONS = [
  {
    groupe: "Langue et contenus",
    items: [
      { titre: "Traduction éwé", texte: "Relue par un locuteur natif avant d'être proposée." },
      { titre: "OCR des scans", texte: "Lire aussi les PDF scannés, sans couche texte." },
      { titre: "Exports", texte: "Récupérer ses résumés et ses quiz dans un fichier." },
    ],
  },
  {
    groupe: "Apprentissage",
    items: [
      {
        titre: "Quiz proposé",
        texte: "Après quelques minutes d'échange, un quiz sur les points abordés : tout de suite ou à la fin.",
      },
      {
        titre: "Suivi enseignant",
        texte: "Une vue privée pour suivre sa classe, jamais un classement visible par les élèves.",
      },
    ],
  },
  {
    groupe: "Plateforme",
    items: [
      { titre: "Observabilité", texte: "Suivre le fonctionnement et le coût de chaque question." },
      { titre: "WhatsApp", texte: "Un second canal, branché sur la même API." },
    ],
  },
];

const SYMBOLES = [
  {
    cle: "livre",
    titre: "Le livre",
    texte:
      "L'apprentissage et la transmission du savoir : tes cours, ouverts, qui se partagent et se comprennent.",
  },
  {
    cle: "plume",
    titre: "La plume",
    texte:
      "L'écriture, l'effort d'apprendre et la création : on comprend vraiment ce qu'on sait reformuler.",
  },
  {
    cle: "soleil",
    titre: "Le soleil",
    texte:
      "La lumière de la compréhension, l'esprit qui s'éveille, et l'avenir qui se lève sur chaque apprenant.",
  },
];

const FRONTIERES = [
  {
    titre: "Aucune réponse inventée",
    texte: "Si tes documents ne contiennent pas l'information, l'agent te le dit au lieu d'inventer.",
  },
  {
    titre: "Aucun quiz imposé",
    texte: "Tu choisis quand t'évaluer, et rien ne rejoint ton carnet sans ton accord.",
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
              et quiz se génèrent à la demande, et rien n'est conservé sans ton geste.
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

              <span className="lp-mark">
                <Mark size={132} className="lp-logo" titre="Emblème Nunya : livre, plume et soleil" />
              </span>
              <span className="lp-mark__nom brand__texte" aria-hidden="true">
                Nunya
              </span>
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

        {/* --- Emblème ------------------------------------------------------ */}
        <section className="lp-embleme" data-reveal aria-labelledby="titre-embleme">
          <div className="lp-embleme__marque">
            <div className="lp-embleme__logo">
              <Mark size={220} className="lp-logo lp-logo--grand" />
            </div>
            <p className="lp-embleme__nom brand__texte" aria-hidden="true">
              Nunya
              <small>Atelier d'apprentissage</small>
            </p>
          </div>
          <div className="lp-embleme__texte">
            <p className="eyebrow">Notre emblème</p>
            <h2 id="titre-embleme">Un livre, une plume, un soleil</h2>
            <p className="lp-head__lead">
              « Nunya » veut dire « savoir, sagesse » en éwé. Notre emblème raconte ce chemin vers le
              savoir, en trois symboles.
            </p>
            <ul className="lp-symboles">
              {SYMBOLES.map((symbole) => (
                <li key={symbole.cle} data-symbole={symbole.cle}>
                  <span className="lp-symboles__puce" aria-hidden="true" />
                  <div>
                    <h3>{symbole.titre}</h3>
                    <p>{symbole.texte}</p>
                  </div>
                </li>
              ))}
            </ul>
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

        {/* --- Évolutions après le MVP --------------------------------------- */}
        <section className="section">
          <header className="lp-head" data-reveal>
            <p className="eyebrow">Après le MVP</p>
            <h2>Les prochaines évolutions</h2>
          </header>

          <div className="lp-evol">
            {EVOLUTIONS.map((bloc, index) => (
              <div key={bloc.groupe} className="lp-evol__groupe" data-reveal style={{ transitionDelay: `${index * 80}ms` }}>
                <h3>{bloc.groupe}</h3>
                <ul className="lp-evol__liste">
                  {bloc.items.map((item) => (
                    <li key={item.titre}>
                      <strong>{item.titre}</strong>
                      <span>{item.texte}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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

      </div>
    </AppShell>
  );
}
