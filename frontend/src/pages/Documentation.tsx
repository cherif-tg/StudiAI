import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { SECTIONS, texteBrut } from "../content";
import { useToast } from "../context/ToastProvider";

function extrait(contenu: string, requete: string): string {
  const brut = texteBrut(contenu);
  const position = brut.toLowerCase().indexOf(requete.toLowerCase());
  if (position < 0) return brut.slice(0, 140);
  const debut = Math.max(0, position - 50);
  return `${debut > 0 ? "…" : ""}${brut.slice(debut, debut + 160)}…`;
}

export function Documentation() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const [recherche, setRecherche] = useState("");

  const sectionActive = useMemo(() => {
    const slug = hash.replace("#", "");
    return SECTIONS.find((section) => section.slug === slug) ?? SECTIONS[0];
  }, [hash]);

  useEffect(() => {
    if (!hash) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [hash]);

  const resultats = useMemo(() => {
    const requete = recherche.trim().toLowerCase();
    if (requete.length < 2) return [];
    return SECTIONS.filter(
      (section) =>
        section.titre.toLowerCase().includes(requete) ||
        texteBrut(section.contenu).toLowerCase().includes(requete),
    );
  }, [recherche]);

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pathname}#${sectionActive.slug}`);
      push("Lien copié", { tone: "success" });
    } catch {
      push("Copie impossible", { message: "Ton navigateur bloque le presse-papiers.", tone: "error" });
    }
  };

  return (
    <AppShell>
      <div className="page page--wide">
        <div className="page-head">
          <div>
            <p className="eyebrow">Documentation</p>
            <h1 style={{ marginTop: 6 }}>Mode d'emploi</h1>
            <p>
              Ce que fait Nunya, comment s'en servir, et ce qu'il ne fait pas encore. Cette
              documentation est embarquée dans l'application : elle est toujours à jour avec la
              version que tu utilises.
            </p>
          </div>
          <Link to="/atelier" className="btn btn--primary">
            <Icon name="atelier" size={15} />
            Ouvrir l'atelier
          </Link>
        </div>

        <div className="docs-layout">
          <aside className="docs-side">
            <div className="field">
              <label className="sr-only" htmlFor="recherche-doc">
                Rechercher dans la documentation
              </label>
              <input
                id="recherche-doc"
                className="input"
                type="search"
                placeholder="Rechercher…"
                value={recherche}
                onChange={(evenement) => setRecherche(evenement.target.value)}
              />
            </div>

            {recherche.trim().length >= 2 ? (
              <div className="docs-results" role="region" aria-label="Résultats de recherche">
                {resultats.length ? (
                  resultats.map((section) => (
                    <button
                      key={section.slug}
                      className="docs-result"
                      onClick={() => {
                        setRecherche("");
                        navigate(`/documentation#${section.slug}`);
                      }}
                    >
                      <strong>{section.titre}</strong>
                      <span>{extrait(section.contenu, recherche)}</span>
                    </button>
                  ))
                ) : (
                  <p className="hint" style={{ padding: "8px 4px" }}>
                    Aucun passage ne correspond à « {recherche.trim()} ».
                  </p>
                )}
              </div>
            ) : (
              <nav aria-label="Sommaire de la documentation">
                {SECTIONS.map((section) => (
                  <button
                    key={section.slug}
                    className="docs-link"
                    aria-current={section.slug === sectionActive.slug ? "page" : undefined}
                    onClick={() => navigate(`/documentation#${section.slug}`)}
                  >
                    <strong>{section.titre}</strong>
                    <span>{section.resume}</span>
                  </button>
                ))}
              </nav>
            )}
          </aside>

          <article className="docs-article" aria-label={sectionActive.titre}>
            <div className="row gap-2" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
              <button className="btn btn--quiet btn--sm" onClick={() => void copierLien()}>
                <Icon name="lien" size={13} />
                Copier le lien
              </button>
            </div>

            <Markdown text={sectionActive.contenu} className="doc" />
          </article>
        </div>
      </div>
    </AppShell>
  );
}
