import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { PAGES_JURIDIQUES, sections } from "../content/legal";
import type { CleJuridique } from "../content/legal";

/** Politique de confidentialité, conditions d'utilisation et « À propos ». */
export function Legal({ page }: { page: CleJuridique }) {
  const donnees = PAGES_JURIDIQUES[page];
  const { hash } = useLocation();
  const { intro, sections: liste } = useMemo(() => sections(donnees.contenu), [donnees]);

  // Lien direct vers une section (ex. /confidentialite#cookies depuis le bandeau).
  useEffect(() => {
    const id = hash.replace("#", "");
    if (!id) return;
    const cadre = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(cadre);
  }, [hash, page]);

  const autres = (Object.keys(PAGES_JURIDIQUES) as CleJuridique[]).filter((cle) => cle !== page);

  return (
    <AppShell>
      <div className="page page--wide">
        <div className="page-head">
          <div>
            <p className="eyebrow">{donnees.eyebrow}</p>
            <h1 style={{ marginTop: 6 }}>{donnees.titre}</h1>
            <p>{donnees.resume}</p>
          </div>
          <span className="badge">
            <Icon name="horloge" size={12} />
            Mise à jour le {donnees.miseAJour}
          </span>
        </div>

        <div className="docs-layout legal-layout">
          <aside className="docs-side">
            <nav aria-label="Sommaire de la page" className="legal-toc">
              {liste.map((section) => (
                <Link key={section.id} to={`#${section.id}`} className="docs-link" replace>
                  <strong>{section.titre}</strong>
                </Link>
              ))}
            </nav>

            <div className="legal-related">
              <span className="hint">Voir aussi</span>
              {autres.map((cle) => (
                <Link key={cle} to={PAGES_JURIDIQUES[cle].chemin} className="legal-related__link">
                  {PAGES_JURIDIQUES[cle].titre}
                  <Icon name="fleche" size={14} />
                </Link>
              ))}
            </div>
          </aside>

          <article className="docs-article legal-article" aria-label={donnees.titre}>
            {intro ? <Markdown text={intro} className="doc legal-intro" /> : null}
            {liste.map((section) => (
              <section key={section.id} id={section.id} className="legal-section">
                <h2>{section.titre}</h2>
                <Markdown text={section.contenu} className="doc" />
              </section>
            ))}
          </article>
        </div>
      </div>
    </AppShell>
  );
}
