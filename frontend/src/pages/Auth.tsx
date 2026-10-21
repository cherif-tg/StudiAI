import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { useToast } from "../context/ToastProvider";

type Mode = "connexion" | "inscription";

export function Auth() {
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const { push } = useToast();

  const soumettre = (evenement: FormEvent) => {
    evenement.preventDefault();
    push("Compte pas encore disponible", {
      message:
        "L'authentification arrive avec le déploiement. En attendant, tu peux travailler en session locale.",
      tone: "info",
    });
  };

  return (
    <AppShell>
      <div className="auth">
        <aside className="auth__aside">
          <Brand />
          <h2>Ton savoir reste à toi.</h2>
          <p className="muted" style={{ maxWidth: "38ch" }}>
            Nunya indexe tes documents dans ta session. Les comptes permettront bientôt de
            retrouver ton carnet d'un appareil à l'autre, sans jamais partager tes sources.
          </p>

          <ul className="stack gap-3" style={{ marginTop: 12 }}>
            {[
              "Aucun document transmis à un tiers",
              "Aucune publication, aucun classement public",
              "Suppression d'un document = suppression de son index",
            ].map((texte) => (
              <li key={texte} className="row gap-2" style={{ fontSize: "var(--text-sm)" }}>
                <Icon name="coche" size={16} />
                {texte}
              </li>
            ))}
          </ul>
        </aside>

        <section className="auth__form">
          <div className="auth__card">
            <div className="auth__switch" role="group" aria-label="Mode d'accès">
              <button
                type="button"
                aria-pressed={mode === "connexion"}
                onClick={() => setMode("connexion")}
              >
                Connexion
              </button>
              <button
                type="button"
                aria-pressed={mode === "inscription"}
                onClick={() => setMode("inscription")}
              >
                Créer un compte
              </button>
            </div>

            <div>
              <h1 style={{ fontSize: "var(--text-2xl)" }}>
                {mode === "connexion" ? "Reprendre là où tu t'es arrêté" : "Ouvrir ton carnet"}
              </h1>
              <p className="muted small" style={{ marginTop: 6 }}>
                {mode === "connexion"
                  ? "Retrouve tes sources et tes artefacts."
                  : "Quelques secondes, et ton atelier est prêt."}
              </p>
            </div>

            <div className="notice">
              <Icon name="info" size={17} />
              <span>
                Les comptes ne sont pas encore ouverts : l'authentification arrive avec le
                déploiement. Tu peux déjà travailler en session locale, sans inscription.
              </span>
            </div>

            <form className="stack gap-4" onSubmit={soumettre}>
              <div className="field">
                <label className="label" htmlFor="email">
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="prenom@exemple.com"
                  value={email}
                  onChange={(evenement) => setEmail(evenement.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="mot-de-passe">
                  Mot de passe
                </label>
                <input
                  id="mot-de-passe"
                  className="input"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={motDePasse}
                  onChange={(evenement) => setMotDePasse(evenement.target.value)}
                />
                <span className="hint">8 caractères minimum, dont un chiffre.</span>
              </div>

              <button type="submit" className="btn btn--primary btn--lg btn--block">
                {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>

            <div className="divider" />

            <Link to="/atelier" className="btn btn--block">
              Continuer en session locale
              <Icon name="fleche" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
