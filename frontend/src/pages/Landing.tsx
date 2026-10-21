import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ArtifactGlyph } from "../components/ArtifactGlyph";
import { Icon } from "../components/Icon";
import { Mark } from "../components/Brand";

const ATOUTS = [
  {
    icone: "discussion" as const,
    titre: "Réponses sourcées",
    texte:
      "Nunya cherche d'abord dans tes documents, puis répond. Si l'information n'y est pas, il te le dit au lieu d'inventer.",
  },
  {
    icone: "sources" as const,
    titre: "Résumé fidèle",
    texte:
      "Un résumé structuré, généré à partir de tes passages — pas d'un modèle qui complète les trous de mémoire.",
  },
  {
    icone: "atelier" as const,
    titre: "Quiz d'auto-évaluation",
    texte: "Des QCM tirés de ton cours, jouables immédiatement, avec l'explication de chaque réponse.",
  },
  {
    icone: "carnet" as const,
    titre: "Carnet personnel",
    texte:
      "Ce que tu choisis de garder. Rien n'est enregistré sans ton geste : ni résumé, ni quiz, ni fiche.",
  },
];

const ETAPES = [
  {
    titre: "Dépose tes cours",
    texte: "PDF ou Word. Chaque document est découpé en passages et indexé pour la recherche.",
  },
  {
    titre: "Pose tes questions",
    texte: "L'agent choisit lui-même quand chercher dans tes sources, résumer ou générer un quiz.",
  },
  {
    titre: "Garde l'essentiel",
    texte: "Un clic sur « Ajouter au Carnet » et le support rejoint ta collection personnelle.",
  },
];

export function Landing() {
  return (
    <AppShell>
      <div className="landing">
        <section className="hero">
          <div>
            <p className="eyebrow">Atelier d'apprentissage documentaire</p>
            <h1 className="hero__title">
              Apprendre commence
              <br />
              par <em>comprendre</em>.
            </h1>
            <p className="hero__lead">
              Dépose tes cours, pose tes questions. Nunya répond uniquement à partir de tes
              documents — et garde ce qui compte dans ton carnet.
            </p>

            <div className="hero__actions">
              <Link to="/atelier" className="btn btn--primary btn--lg">
                Ouvrir l'atelier
                <Icon name="fleche" size={17} />
              </Link>
              <Link to="/aide" className="btn btn--lg">
                Comment ça marche
              </Link>
            </div>

            <div className="hero__meta">
              <span className="row gap-2">
                <Icon name="cle" size={15} /> Documents privés à ta session
              </span>
              <span className="row gap-2">
                <Icon name="coche" size={15} /> Réponses traçables
              </span>
              <span className="row gap-2">
                <Icon name="horloge" size={15} /> Éwé : juste après le MVP
              </span>
            </div>
          </div>

          <div className="hero__panel" aria-hidden="true">
            <div className="row gap-2" style={{ marginBottom: 16 }}>
              <Mark size={22} />
              <span className="small muted">Aperçu de l'atelier</span>
            </div>

            <div className="stack gap-2" style={{ marginBottom: 18 }}>
              <div className="row gap-2 small muted">
                <Icon name="sources" size={14} /> Sources
              </div>
              <div className="row gap-2" style={{ fontSize: 13 }}>
                <span className="dot" style={{ color: "var(--green)" }} />
                Chapitre 3 — Photosynthèse.pdf
              </div>
              <div className="row gap-2" style={{ fontSize: 13 }}>
                <span className="dot" style={{ color: "var(--green)" }} />
                Fiche respiration.docx
              </div>
            </div>

            <div
              style={{
                background: "var(--panel-2)",
                borderRadius: 14,
                padding: 12,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Pourquoi la photosynthèse s'arrête-t-elle la nuit ?
            </div>

            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 12,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--ink-soft)",
              }}
            >
              Sans lumière, la phase claire ne produit plus l'ATP ni le NADPH dont le cycle de
              Calvin a besoin : il ralentit, puis s'arrête.
              <div className="row gap-2" style={{ marginTop: 10 }}>
                <span className="badge">Chapitre 3 · p. 14</span>
                <span className="badge badge--ok">Traçable</span>
              </div>
            </div>

            <div className="row gap-2" style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
              <ArtifactGlyph kind="summary" size={22} />
              Résumé ajouté au Carnet
            </div>
          </div>
        </section>

        <section className="eyebrow-alphabet" aria-label="Couverture typographique de l'éwé">
          <div>
            <p className="eyebrow" style={{ color: "var(--info)" }}>
              Langue éwé
            </p>
            <p className="small muted">Tous les caractères s'affichent — la traduction arrive après le MVP.</p>
          </div>
          <div className="glyphs" lang="ee">
            Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Ce que fait Nunya</p>
              <h2 style={{ marginTop: 6 }}>Un atelier, pas un chatbot de plus</h2>
            </div>
          </div>

          <div className="feature-grid">
            {ATOUTS.map((atout) => (
              <article className="feature" key={atout.titre}>
                <span className="feature__icon">
                  <Icon name={atout.icone} size={19} />
                </span>
                <h3>{atout.titre}</h3>
                <p>{atout.texte}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">La démarche</p>
              <h2 style={{ marginTop: 6 }}>Trois gestes, dans l'ordre</h2>
            </div>
          </div>

          <div className="steps">
            {ETAPES.map((etape) => (
              <article className="step" key={etape.titre}>
                <h4>{etape.titre}</h4>
                <p>{etape.texte}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="cta-band">
            <div>
              <h2 style={{ fontSize: "var(--text-2xl)" }}>Un cours à réviser ce soir ?</h2>
              <p className="muted" style={{ marginTop: 6 }}>
                L'atelier est ouvert. Aucune inscription : ta session reste sur ton appareil.
              </p>
            </div>
            <Link to="/atelier" className="btn btn--primary btn--lg">
              Commencer maintenant
              <Icon name="fleche" size={17} />
            </Link>
          </div>
        </section>

        <footer className="footer">
          <span>Nunya — projet d'agent éducatif, Togo. MVP documentaire en construction.</span>
          <span className="row gap-4">
            <Link to="/aide">Aide</Link>
            <Link to="/reglages">Réglages</Link>
            <Link to="/connexion">Connexion</Link>
          </span>
        </footer>
      </div>
    </AppShell>
  );
}
