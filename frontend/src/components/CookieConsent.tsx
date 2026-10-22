import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Icon } from "./Icon";

/**
 * Bandeau d'information sur les cookies. Nunya n'utilise qu'un cookie de session
 * strictement nécessaire et du stockage local de préférences : le bandeau informe
 * et mémorise le choix pendant 12 mois. Il peut être rouvert depuis le footer.
 */

const CLE = "nunya.cookies";
const DUREE_MS = 365 * 24 * 60 * 60 * 1000;
export const EVENEMENT_COOKIES = "nunya:cookies";
/** Émis quand l'utilisateur a fait son choix (le bandeau se ferme). */
export const EVENEMENT_COOKIES_CHOISI = "nunya:cookies-choisi";

export function choixValide(): boolean {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return false;
    const { date } = JSON.parse(brut) as { date?: number };
    return typeof date === "number" && Date.now() - date < DUREE_MS;
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(() => !choixValide());

  useEffect(() => {
    const rouvrir = () => setVisible(true);
    window.addEventListener(EVENEMENT_COOKIES, rouvrir);
    return () => window.removeEventListener(EVENEMENT_COOKIES, rouvrir);
  }, []);

  if (!visible) return null;

  const accepter = () => {
    try {
      localStorage.setItem(CLE, JSON.stringify({ choix: "accepte", date: Date.now() }));
    } catch {
      /* sans stockage, le bandeau reviendra à la prochaine visite */
    }
    setVisible(false);
    window.dispatchEvent(new Event(EVENEMENT_COOKIES_CHOISI));
  };

  return (
    <section className="cookie-banner" role="region" aria-label="Consentement aux cookies">
      <span className="cookie-banner__icon" aria-hidden="true">
        <Icon name="info" size={18} />
      </span>
      <div className="cookie-banner__text">
        <strong>Ce site utilise des cookies</strong>
        <p>
          Nunya utilise un cookie de session et un stockage local pour te garder connecté et
          retenir tes préférences. Aucun cookie publicitaire ni de mesure d'audience.
        </p>
      </div>
      <div className="cookie-banner__actions">
        <Link to="/confidentialite#cookies" className="btn btn--sm">
          En savoir plus
        </Link>
        <button type="button" className="btn btn--primary btn--sm" onClick={accepter}>
          Accepter
        </button>
      </div>
    </section>
  );
}
