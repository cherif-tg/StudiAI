/** Marque Nunyati : une tige verte, deux branches — le français et l'éwé
 *  portés par la même tige (Charte_visuel/nunya-etude-graphique.md §4). */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth={4}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M32 54V28" stroke="var(--green)" />
      <path d="M32 28C12 28 12 6 29 4" stroke="var(--green)" />
      <path d="M32 32C52 32 52 12 37 8" stroke="var(--accent)" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Mark size={compact ? 24 : 30} />
      <span>
        Nunya
        {!compact ? <small>Atelier d'apprentissage</small> : null}
      </span>
    </span>
  );
}
