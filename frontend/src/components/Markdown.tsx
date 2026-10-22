import { Fragment, useMemo } from "react";
import type { ReactNode } from "react";

/**
 * Rendu Markdown minimal, sans dépendance : titres, listes, tableaux, citations,
 * gras et code en ligne. Le modèle produit souvent des tableaux — ils sont
 * rendus correctement plutôt que laissés en pipes illisibles.
 */

type Bloc =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

function decouperLigne(ligne: string): string[] {
  return ligne
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cellule) => cellule.trim());
}

function analyser(markdown: string): Bloc[] {
  const lignes = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  let paragraphe: string[] = [];
  let liste: string[] | null = null;
  let listeOrdonnee = false;
  let code: string[] | null = null;

  const viderParagraphe = () => {
    if (paragraphe.length) {
      blocs.push({ type: "paragraph", text: paragraphe.join(" ") });
      paragraphe = [];
    }
  };
  const viderListe = () => {
    if (liste?.length) blocs.push({ type: "list", ordered: listeOrdonnee, items: liste });
    liste = null;
  };

  for (const brute of lignes) {
    const ligne = brute.trimEnd();

    if (ligne.trim().startsWith("```")) {
      if (code) {
        blocs.push({ type: "code", text: code.join("\n") });
        code = null;
      } else {
        viderParagraphe();
        viderListe();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(brute);
      continue;
    }

    if (!ligne.trim()) {
      viderParagraphe();
      viderListe();
      continue;
    }

    const titre = /^(#{1,3})\s+(.*)$/.exec(ligne);
    if (titre) {
      viderParagraphe();
      viderListe();
      blocs.push({
        type: "heading",
        level: titre[1].length as 1 | 2 | 3,
        text: titre[2].trim(),
      });
      continue;
    }

    if (/^\|.*\|$/.test(ligne.trim())) {
      viderParagraphe();
      viderListe();
      const cellules = decouperLigne(ligne.trim());
      if (cellules.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue;
      const dernier = blocs[blocs.length - 1];
      if (dernier && dernier.type === "table") dernier.rows.push(cellules);
      else blocs.push({ type: "table", head: cellules, rows: [] });
      continue;
    }

    // Ligne indentée juste après un point de liste : c'est la suite de ce point,
    // pas un nouveau paragraphe (cas des listes dont le texte est replié).
    if (liste && liste.length && /^\s+\S/.test(ligne)) {
      liste[liste.length - 1] = `${liste[liste.length - 1]} ${ligne.trim()}`;
      continue;
    }

    const puce = /^[-*+]\s+(.*)$/.exec(ligne);
    const numero = /^\d+[.)]\s+(.*)$/.exec(ligne);
    if (puce || numero) {
      viderParagraphe();
      const ordonne = Boolean(numero);
      if (!liste || listeOrdonnee !== ordonne) {
        viderListe();
        liste = [];
        listeOrdonnee = ordonne;
      }
      liste.push((puce?.[1] ?? numero?.[1] ?? "").trim());
      continue;
    }

    if (ligne.startsWith(">")) {
      viderParagraphe();
      viderListe();
      blocs.push({ type: "quote", text: ligne.replace(/^>\s?/, "") });
      continue;
    }

    viderListe();
    paragraphe.push(ligne.trim());
  }

  viderParagraphe();
  viderListe();
  if (code?.length) blocs.push({ type: "code", text: code.join("\n") });

  return blocs;
}

/** Gras, code en ligne et liens markdown → éléments React (aucun HTML injecté). */
function enrichir(texte: string, cle: string): ReactNode[] {
  const morceaux = texte.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return morceaux.map((morceau, index) => {
    const id = `${cle}-${index}`;
    if (morceau.startsWith("**") && morceau.endsWith("**")) {
      return <strong key={id}>{morceau.slice(2, -2)}</strong>;
    }
    if (morceau.startsWith("`") && morceau.endsWith("`")) {
      return <code key={id}>{morceau.slice(1, -1)}</code>;
    }
    const lien = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(morceau);
    if (lien) {
      return (
        <a key={id} href={lien[2]} target="_blank" rel="noreferrer noopener">
          {lien[1]}
        </a>
      );
    }
    return <Fragment key={id}>{morceau}</Fragment>;
  });
}

export function Markdown({ text, className = "prose" }: { text: string; className?: string }) {
  const blocs = useMemo(() => analyser(text), [text]);

  return (
    <div className={className}>
      {blocs.map((bloc, index) => {
        const cle = `bloc-${index}`;
        if (bloc.type === "heading") {
          const contenu = enrichir(bloc.text, cle);
          if (bloc.level === 1) return <h1 key={cle}>{contenu}</h1>;
          if (bloc.level === 2) return <h2 key={cle}>{contenu}</h2>;
          return <h3 key={cle}>{contenu}</h3>;
        }
        if (bloc.type === "list") {
          const items = bloc.items.map((item, i) => (
            <li key={`${cle}-${i}`}>{enrichir(item, `${cle}-${i}`)}</li>
          ));
          return bloc.ordered ? <ol key={cle}>{items}</ol> : <ul key={cle}>{items}</ul>;
        }
        if (bloc.type === "table") {
          return (
            <div key={cle} className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {bloc.head.map((cellule, i) => (
                      <th key={`${cle}-h-${i}`}>{enrichir(cellule, `${cle}-h-${i}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloc.rows.map((ligne, i) => (
                    <tr key={`${cle}-r-${i}`}>
                      {ligne.map((cellule, j) => (
                        <td key={`${cle}-c-${i}-${j}`}>{enrichir(cellule, `${cle}-c-${i}-${j}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (bloc.type === "quote") {
          return (
            <blockquote key={cle} className="md-quote">
              {enrichir(bloc.text, cle)}
            </blockquote>
          );
        }
        if (bloc.type === "code") {
          return (
            <pre key={cle} className="md-code">
              <code>{bloc.text}</code>
            </pre>
          );
        }
        return <p key={cle}>{enrichir(bloc.text, cle)}</p>;
      })}
    </div>
  );
}
