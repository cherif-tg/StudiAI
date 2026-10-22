import { useEffect, useState } from "react";

import { Mark } from "./Brand";
import { EVENEMENT_COOKIES_CHOISI, choixValide } from "./CookieConsent";
import { Icon } from "./Icon";
import { lireJSON, ecrireJSON } from "../lib/stockage";
import {
  EVENEMENT_INSTALLATION,
  dejaInstallee,
  estIOS,
  installationPossible,
  installer,
} from "../lib/pwa";

/**
 * Proposition d'installation de l'application, discrète :
 * - n'apparaît qu'après le choix sur les cookies (jamais deux fenêtres à la fois) ;
 * - « Plus tard » la fait taire 7 jours ; jamais si l'application est déjà installée ;
 * - sur Chrome, Edge, Android : bouton qui ouvre l'invite native du navigateur ;
 * - sur iPhone/iPad (pas d'invite native) : le geste à faire, en une phrase.
 */

const CLE = "nunya.installation";
const SILENCE_MS = 7 * 24 * 60 * 60 * 1000;
const DELAI_MS = 1500;

function enSilence(): boolean {
  const { plusTard } = lireJSON<{ plusTard?: number }>(CLE, {});
  return typeof plusTard === "number" && Date.now() - plusTard < SILENCE_MS;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"natif" | "ios">("natif");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || dejaInstallee() || enSilence()) return undefined;
    let minuterie = 0;

    const evaluer = () => {
      window.clearTimeout(minuterie);
      if (dejaInstallee() || enSilence() || !choixValide()) return;
      const natif = installationPossible();
      const ios = !natif && estIOS();
      if (!natif && !ios) return;
      minuterie = window.setTimeout(() => {
        setMode(natif ? "natif" : "ios");
        setVisible(true);
      }, DELAI_MS);
    };

    evaluer();
    window.addEventListener(EVENEMENT_INSTALLATION, evaluer);
    window.addEventListener(EVENEMENT_COOKIES_CHOISI, evaluer);
    return () => {
      window.clearTimeout(minuterie);
      window.removeEventListener(EVENEMENT_INSTALLATION, evaluer);
      window.removeEventListener(EVENEMENT_COOKIES_CHOISI, evaluer);
    };
  }, []);

  // L'installation a eu lieu (ou l'invite n'est plus disponible) : on se retire.
  useEffect(() => {
    if (!visible || mode !== "natif") return undefined;
    const maj = () => {
      if (!installationPossible()) setVisible(false);
    };
    window.addEventListener(EVENEMENT_INSTALLATION, maj);
    return () => window.removeEventListener(EVENEMENT_INSTALLATION, maj);
  }, [visible, mode]);

  if (!visible) return null;

  const plusTard = () => {
    ecrireJSON(CLE, { plusTard: Date.now() });
    setVisible(false);
  };

  const lancer = async () => {
    setEnCours(true);
    try {
      const accepte = await installer();
      if (!accepte) ecrireJSON(CLE, { plusTard: Date.now() });
    } finally {
      setEnCours(false);
      setVisible(false);
    }
  };

  return (
    <section className="install-prompt" role="dialog" aria-labelledby="install-titre" aria-describedby="install-texte">
      <span className="install-prompt__icone" aria-hidden="true">
        <Mark size={40} />
      </span>
      <div className="install-prompt__texte">
        <strong id="install-titre">Installer l'application Nunya</strong>
        <p id="install-texte">
          {mode === "natif"
            ? "Ouvre Nunya depuis ton écran d'accueil, comme une application, et consulte ton carnet même hors ligne."
            : "Sur iPhone ou iPad : touche le bouton Partager de Safari, puis « Sur l'écran d'accueil »."}
        </p>
      </div>
      <div className="install-prompt__actions">
        <button type="button" className="btn btn--quiet btn--sm" onClick={plusTard}>
          Plus tard
        </button>
        {mode === "natif" ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void lancer()} disabled={enCours}>
            <Icon name="telecharger" size={14} />
            Installer
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--sm" onClick={plusTard}>
            Compris
          </button>
        )}
      </div>
    </section>
  );
}
