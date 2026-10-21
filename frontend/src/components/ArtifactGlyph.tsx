/**
 * Formes des artefacts (charte §5) : la forme porte le sens en premier, la
 * couleur le renforce — les types restent distinguables sans couleur.
 */

type Forme = "fiche" | "resume" | "quiz" | "graphique" | "export";

const COULEURS: Record<Forme, string> = {
  fiche: "var(--accent)",
  resume: "var(--info)",
  quiz: "var(--green)",
  graphique: "var(--ochre)",
  export: "var(--muted-2)",
};

const LIBELLES: Record<Forme, string> = {
  fiche: "Fiche",
  resume: "Résumé",
  quiz: "Quiz",
  graphique: "Graphique",
  export: "Export",
};

/** Les artefacts de l'API utilisent des identifiants proches mais pas identiques. */
export function formeDepuisKind(kind: string): Forme {
  if (kind === "summary" || kind === "resume") return "resume";
  if (kind === "quiz") return "quiz";
  if (kind === "chart" || kind === "graphique") return "graphique";
  if (kind === "pdf" || kind === "docx" || kind === "export") return "export";
  return "fiche";
}

export function libelleForme(kind: string): string {
  return LIBELLES[formeDepuisKind(kind)];
}

export function ArtifactGlyph({ kind, size = 34 }: { kind: string; size?: number }) {
  const forme = formeDepuisKind(kind);
  const couleur = COULEURS[forme];
  const a = { fill: couleur, stroke: couleur, strokeWidth: 1.5, strokeLinejoin: "round" as const };
  const trait = {
    stroke: "var(--panel)",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    fill: "none",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      {forme === "fiche" && (
        <>
          <rect x="3.5" y="2.5" width="17" height="19" rx="5" {...a} />
          <path d="M8 9h8M8 13h8M8 17h4" {...trait} />
        </>
      )}
      {forme === "resume" && (
        <>
          <circle cx="12" cy="12" r="10" {...a} />
          <path d="M7.5 9.5h9M7.5 13h9M7.5 16.5h5" {...trait} />
        </>
      )}
      {forme === "quiz" && (
        <>
          <path d="M12 2 22 12 12 22 2 12Z" {...a} />
          <path d="M9.8 10.2a2.3 2.3 0 1 1 3.3 2c-.7.4-1.1.8-1.1 1.6" {...trait} />
          <circle cx="12" cy="16.3" r=".9" fill="var(--panel)" />
        </>
      )}
      {forme === "graphique" && (
        <>
          <path d="M12 2l8.7 5v10L12 22l-8.7-5V7Z" {...a} />
          <path d="M8.5 16v-3M12 16V9M15.5 16v-5" {...trait} />
        </>
      )}
      {forme === "export" && (
        <>
          <path d="M5 2.5h9.5L19 7v14.5H5Z" {...a} />
          <path d="M12 9.5v7M9 14l3 3 3-3" {...trait} />
        </>
      )}
    </svg>
  );
}
