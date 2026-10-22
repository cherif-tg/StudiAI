/**
 * Emblème Nunya : un livre ouvert, une plume et un soleil levant.
 * - Le livre : l'apprentissage et la transmission du savoir.
 * - La plume : l'écriture, l'effort d'apprendre et la création.
 * - Le soleil : la lumière de la compréhension, l'esprit qui s'éveille, l'avenir.
 *
 * Trois couleurs, celles de l'éducation : bleu académique, or et vert émeraude.
 * Les couleurs passent par des variables (`--logo-*`, voir tokens.css) pour rester
 * lisibles en thème sombre ; les ajours de la plume sont de vrais trous (evenodd).
 */

/** Rayons du soleil (11 rayons en éventail, du plus bas à gauche au plus bas à droite). */
const RAYONS = [
  "M75.6 142.4L45.4 137.9L74.0 127.3Z",
  "M74.4 120.4L43.8 105.4L77.9 105.6Z",
  "M80.6 99.3L48.7 70.1L88.7 86.5Z",
  "M93.3 81.3L68.3 37.5L105.2 71.9Z",
  "M111.3 68.6L100.4 14.4L125.6 63.6Z",
  "M132.4 62.4L140.0 6.0L147.6 62.4Z",
  "M154.4 63.6L179.6 14.4L168.7 68.6Z",
  "M174.8 71.9L211.7 37.5L186.7 81.3Z",
  "M191.3 86.5L231.3 70.1L199.4 99.3Z",
  "M202.1 105.6L236.2 105.4L205.6 120.4Z",
  "M206.0 127.3L234.6 137.9L204.4 142.4Z",
];

/** Plume : contour, fente et trou d'aération (découpés). */
const PLUME =
  "M135 80C126 98 112 112 106 130L120 162H150L164 130C158 112 144 98 135 80Z" +
  "M133.4 92H136.6V128H133.4Z" +
  "M128.8 134a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0 -12.4 0Z";

export function Mark({
  size = 34,
  className,
  titre,
}: {
  size?: number;
  className?: string;
  /** Texte alternatif ; sans lui, l'emblème est décoratif. */
  titre?: string;
}) {
  return (
    <svg
      className={className ? `nunya-mark ${className}` : "nunya-mark"}
      width={size}
      height={Math.round(size * (272 / 280))}
      viewBox="0 0 280 272"
      role={titre ? "img" : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : true}
      focusable="false"
    >
      <g className="nunya-mark__soleil" fill="var(--logo-or)">
        {RAYONS.map((d, i) => (
          <path key={i} d={d} style={{ ["--i" as string]: i }} />
        ))}
      </g>
      <g className="nunya-mark__livre" fill="none" strokeWidth={11} strokeLinejoin="round">
        <path d="M74 93H34V203C70 207 108 222 136 252" stroke="var(--logo-bleu)" />
        <path d="M15 116V222C60 224 104 238 134 263" stroke="var(--logo-bleu)" />
        <path d="M206 93H246V203C210 207 172 222 144 252" stroke="var(--logo-or)" />
        <path d="M265 116V222C220 224 176 238 146 263" stroke="var(--logo-bleu)" />
      </g>
      <g className="nunya-mark__plume">
        <path d={PLUME} fill="var(--logo-bleu)" fillRule="evenodd" />
        <path d="M118 170H152L141 192L131 230L117 214Z" fill="var(--logo-vert)" />
        <path d="M155 184C154 204 147 226 136 252C130 234 129 216 135 203C141 194 148 189 155 184Z" fill="var(--logo-vert-fonce)" />
      </g>
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Mark size={compact ? 28 : 36} />
      <span className="brand__texte">
        Nunya
        {!compact ? <small>Atelier d'apprentissage</small> : null}
      </span>
    </span>
  );
}
