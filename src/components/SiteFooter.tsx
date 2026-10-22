import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { Mark } from "./Brand";
import { EVENEMENT_COOKIES } from "./CookieConsent";
import { Icon } from "./Icon";
import { useAuth } from "../context/AuthProvider";
import { useToast } from "../context/ToastProvider";
import { ContactNonConfigure, envoyerContact } from "../lib/contact";

const MESSAGE_MAX = 2000;

function FormulaireContact() {
  const { user } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [piege, setPiege] = useState(""); // champ invisible : seuls les robots le remplissent
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);

    if (piege) return;
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setErreur("Indique une adresse e-mail valide pour qu'on puisse te répondre.");
      return;
    }
    if (message.trim().length < 10) {
      setErreur("Ton message est un peu court : 10 caractères minimum.");
      return;
    }

    setEnvoi(true);
    try {
      const resultat = await envoyerContact(email.trim(), message.trim());
      if (resultat === "envoye") {
        setEnvoye(true);
        setMessage("");
        push("Message envoyé", { message: "Merci, nous te répondrons par e-mail.", tone: "success" });
      } else {
        push("Ta messagerie s'ouvre", {
          message: "Le message est prêt : il ne reste qu'à l'envoyer.",
          tone: "info",
        });
      }
    } catch (probleme) {
      setErreur(
        probleme instanceof ContactNonConfigure
          ? "Le contact n'est pas encore configuré sur cette instance. Réessaie plus tard."
          : "L'envoi a échoué. Vérifie ta connexion et réessaie.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  if (envoye) {
    return (
      <div className="footer-form footer-form--done" role="status">
        <span className="footer-form__ok" aria-hidden="true">
          <Icon name="coche" size={18} strokeWidth={2.2} />
        </span>
        <div>
          <strong>Merci pour ton message !</strong>
          <p>Nous te répondrons à l'adresse indiquée.</p>
        </div>
        <button type="button" className="btn btn--quiet btn--sm" onClick={() => setEnvoye(false)}>
          Écrire un autre message
        </button>
      </div>
    );
  }

  return (
    <form className="footer-form" onSubmit={(e) => void soumettre(e)} noValidate id="contact">
      <div className="footer-form__head">
        <h2 className="footer__title">Une question, un avis ?</h2>
        <p>Écris-nous, nous répondons par e-mail.</p>
      </div>

      <div className="field">
        <label className="sr-only" htmlFor="contact-email">
          Ton adresse e-mail
        </label>
        <input
          id="contact-email"
          className="input"
          type="email"
          autoComplete="email"
          placeholder="ton.adresse@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="sr-only" htmlFor="contact-message">
          Ton message
        </label>
        <textarea
          id="contact-message"
          className="textarea"
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder="Ton message, une idée, un problème rencontré…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <input
        className="footer-form__trap"
        type="text"
        name="site"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={piege}
        onChange={(e) => setPiege(e.target.value)}
      />

      {erreur ? (
        <p className="error-text" role="alert">
          {erreur}
        </p>
      ) : null}

      <div className="footer-form__foot">
        <span className="hint">
          En envoyant ce message, tu acceptes notre{" "}
          <Link to="/confidentialite#donnees">politique de confidentialité</Link>.
        </span>
        <button type="submit" className="btn btn--primary" disabled={envoi}>
          {envoi ? <span className="spinner" /> : <Icon name="fleche" size={15} />}
          Envoyer
        </button>
      </div>
    </form>
  );
}

export function SiteFooter() {
  const { user } = useAuth();
  const annee = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link to="/" className="brand" aria-label="Nunya, accueil">
            <Mark size={40} />
            <span className="brand__texte">
              Nunya
              <small>Atelier d'apprentissage</small>
            </span>
          </Link>
          <p>
            Comprendre ses cours à partir de ses propres documents. Né au Togo, pensé pour le
            français et, bientôt, l'éwé.
          </p>
        </div>

        <nav className="site-footer__cols" aria-label="Liens de pied de page">
          <div>
            <h2 className="footer__title">Produit</h2>
            <ul>
              <li><Link to={user ? "/atelier" : "/connexion"}>Atelier</Link></li>
              <li><Link to={user ? "/carnet" : "/connexion"}>Carnet</Link></li>
              <li><Link to="/documentation">Documentation</Link></li>
              <li><Link to={user ? "/reglages" : "/connexion"}>{user ? "Réglages" : "Créer un compte"}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__title">Ressources</h2>
            <ul>
              <li><Link to="/documentation#demarrer">Démarrer</Link></li>
              <li><Link to="/documentation#auto-hebergement">Auto-héberger</Link></li>
              <li><Link to="/documentation#limites">Limites et dépannage</Link></li>
              <li><Link to="/documentation#api">Référence de l'API</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__title">Informations</h2>
            <ul>
              <li><Link to="/a-propos">À propos</Link></li>
              <li><Link to="/confidentialite">Confidentialité</Link></li>
              <li><Link to="/conditions">Conditions d'utilisation</Link></li>
              <li>
                <button
                  type="button"
                  className="site-footer__linkbtn"
                  onClick={() => {
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    document.getElementById("contact-email")?.focus({ preventScroll: true });
                  }}
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <FormulaireContact />
      </div>

      <div className="site-footer__bottom">
        <p>© {annee} Nunya. Tous droits réservés.</p>
        <div className="site-footer__legal">
          <Link to="/confidentialite">Confidentialité</Link>
          <Link to="/conditions">CGU</Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event(EVENEMENT_COOKIES))}>
            Gérer les cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
