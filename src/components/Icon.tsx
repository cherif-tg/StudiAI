import type { ReactNode } from "react";

/**
 * Jeu d'icônes maison : un seul trait de 1.6 px, coins arrondis, 24×24.
 * Jamais d'emoji comme icône — la forme doit rester lisible en mode sombre.
 */

type NomIcone =
  | "discussion"
  | "sources"
  | "atelier"
  | "carnet"
  | "reglages"
  | "aide"
  | "soleil"
  | "lune"
  | "plus"
  | "depot"
  | "corbeille"
  | "telecharger"
  | "coche"
  | "fleche"
  | "etincelle"
  | "alerte"
  | "rafraichir"
  | "externe"
  | "fermer"
  | "menu"
  | "cle"
  | "horloge"
  | "info"
  | "lien"
  | "copier"
  | "pouceHaut"
  | "pouceBas"
  | "chevronG"
  | "chevronD"
  | "oeil"
  | "oeilBarre"
  | "crayon";

const TRACES: Record<NomIcone, ReactNode> = {
  discussion: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4A.6.6 0 0 1 5 18v-3.2A2.5 2.5 0 0 1 4 12.7Z" />,
  sources: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9l1.6 2H18a2 2 0 0 1 2 2v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17Z" /><path d="M8 11h8M8 14.5h5" /></>,
  atelier: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  carnet: <><path d="M6 3.5h11.5A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5H6A2 2 0 0 1 4 18.5v-13A2 2 0 0 1 6 3.5Z" /><path d="M8 8h7M8 12h7M8 16h4" /></>,
  reglages: <><circle cx="12" cy="12" r="2.9" /><path d="M19.4 14.2a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1Z" /></>,
  aide: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.2.8-1.2 1.7" /><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" /></>,
  soleil: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  lune: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  depot: <><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></>,
  corbeille: <><path d="M4.5 6.5h15" /><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" /><path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" /></>,
  telecharger: <><path d="M12 4v12" /><path d="m7.5 11.5 4.5 4.5 4.5-4.5" /><path d="M4 19h16" /></>,
  coche: <path d="m5 12.5 4.5 4.5L19 7" />,
  fleche: <><path d="M4 12h15" /><path d="m13.5 6.5 5.5 5.5-5.5 5.5" /></>,
  etincelle: <><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3 10.2 12.6 4.5 10.8 10.2 9Z" /><path d="M18.5 16.5 19.3 19l2.2.8-2.2.7-.8 2.5-.7-2.5-2.3-.7 2.3-.8Z" /></>,
  alerte: <><path d="M12 4.5 21 19.5H3Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none" /></>,
  rafraichir: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4.5h-4.5" /></>,
  externe: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10" /></>,
  fermer: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cle: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H20" /><path d="M17 12v3M20 12v2" /></>,
  horloge: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none" /></>,
  copier: <><rect x="8.5" y="8.5" width="11" height="11" rx="2.2" /><path d="M15.5 8.5V6.2A1.7 1.7 0 0 0 13.8 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3" /></>,
  pouceHaut: <><path d="M7.5 10.5v9H5.2a1.2 1.2 0 0 1-1.2-1.2v-6.6a1.2 1.2 0 0 1 1.2-1.2Z" /><path d="M7.5 10.5 11 4.2a1.8 1.8 0 0 1 3.3 1.3l-.8 3.5h4.6a2 2 0 0 1 2 2.4l-1.3 6.3a2.2 2.2 0 0 1-2.2 1.8H7.5" /></>,
  pouceBas: <><path d="M7.5 13.5v-9H5.2A1.2 1.2 0 0 0 4 5.7v6.6a1.2 1.2 0 0 0 1.2 1.2Z" /><path d="M7.5 13.5 11 19.8a1.8 1.8 0 0 0 3.3-1.3l-.8-3.5h4.6a2 2 0 0 0 2-2.4l-1.3-6.3a2.2 2.2 0 0 0-2.2-1.8H7.5" /></>,
  chevronG: <path d="m14.5 6-6 6 6 6" />,
  chevronD: <path d="m9.5 6 6 6-6 6" />,
  oeil: <><path d="M2.8 12S6.2 5.5 12 5.5 21.2 12 21.2 12 17.8 18.5 12 18.5 2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="3" /></>,
  oeilBarre: <><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c5.8 0 9.2 6.5 9.2 6.5a16 16 0 0 1-2.6 3.4" /><path d="M14.1 14.2A3 3 0 0 1 9.8 9.9" /><path d="M6.4 7.4C4 9 2.8 12 2.8 12s3.4 6.5 9.2 6.5a9 9 0 0 0 4.4-1.1" /><path d="m4 4 16 16" /></>,
  crayon: <><path d="M15.2 5.3 18.7 8.8" /><path d="M4.5 19.5 5.3 15.6 16 4.9a1.7 1.7 0 0 1 2.4 0l.7.7a1.7 1.7 0 0 1 0 2.4L8.4 18.7Z" /></>,
  lien: <><path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" /><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.2-1.2" /></>,
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.6,
}: {
  name: NomIcone;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRACES[name]}
    </svg>
  );
}

export type IconName = NomIcone;
