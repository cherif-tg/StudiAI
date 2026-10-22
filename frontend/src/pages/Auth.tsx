import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthProvider";
import { ApiError } from "../lib/api";

type Mode = "connexion" | "inscription";

export function Auth() {
  const [mode, setMode] = useState<Mode>("connexion");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const { user, connecter, inscrire } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const depuis = (location.state as { depuis?: string } | null)?.depuis ?? "/atelier";

  // Déjà connecté : la page de connexion n'a rien à proposer.
  if (user) return <Navigate to={depuis} replace />;

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);

    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setErreur("Cette adresse e-mail n'est pas valide.");
      return;
    }
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mode === "inscription" && nom.trim().length < 2) {
      setErreur("Indique un prénom ou un nom, même court.");
      return;
    }

    setEnvoi(true);
    try {
      if (mode === "connexion") {
        await connecter(email.trim(), motDePasse);
      } else {
        await inscrire(nom.trim(), email.trim(), motDePasse);
      }
      navigate(depuis, { replace: true });
    } catch (probleme) {
      setErreur(
        probleme instanceof ApiError
          ? probleme.message
          : "Connexion impossible. Réessaie dans un instant.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AppShell>
      <div className="auth">
        <aside className="auth__aside">
          <Brand />
          <h2>Ton savoir reste à toi.</h2>
          <p className="muted" style={{ maxWidth: "38ch" }}>
            Chaque compte a ses documents et son carnet. Rien n'est partagé entre deux
            personnes, et rien ne quitte le serveur de ton équipe.
          </p>

          <ul className="stack gap-3" style={{ marginTop: 12 }}>
            {[
              "Documents indexés dans ton espace, pas dans un pot commun",
              "Carnet personnel, accessible d'un appareil à l'autre",
              "Supprimer un document retire aussi son index",
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
                onClick={() => {
                  setMode("connexion");
                  setErreur(null);
                }}
              >
                Connexion
              </button>
              <button
                type="button"
                aria-pressed={mode === "inscription"}
                onClick={() => {
                  setMode("inscription");
                  setErreur(null);
                }}
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
                  ? "Retrouve tes documents et tes artefacts."
                  : "Quelques secondes, et ton atelier est prêt."}
              </p>
            </div>

            <form className="stack gap-4" onSubmit={soumettre} noValidate>
              {mode === "inscription" ? (
                <div className="field">
                  <label className="label" htmlFor="nom">
                    Prénom ou nom
                  </label>
                  <input
                    id="nom"
                    className="input"
                    type="text"
                    autoComplete="name"
                    placeholder="Kossi"
                    value={nom}
                    onChange={(evenement) => setNom(evenement.target.value)}
                  />
                </div>
              ) : null}

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
                  placeholder={mode === "inscription" ? "8 caractères minimum" : "Votre mot de passe"}
                  value={motDePasse}
                  onChange={(evenement) => setMotDePasse(evenement.target.value)}
                />
                {mode === "inscription" ? (
                  <span className="hint">8 caractères minimum. Aucune règle de composition imposée.</span>
                ) : null}
              </div>

              {erreur ? (
                <p className="error-text" role="alert">
                  {erreur}
                </p>
              ) : null}

              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={envoi}>
                {envoi ? (
                  <>
                    <span className="spinner" />
                    {mode === "connexion" ? "Connexion…" : "Création…"}
                  </>
                ) : mode === "connexion" ? (
                  "Se connecter"
                ) : (
                  "Créer mon compte"
                )}
              </button>
            </form>

            <p className="hint" style={{ textAlign: "center" }}>
              {mode === "connexion" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button className="btn btn--quiet btn--sm" onClick={() => setMode("inscription")}>
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Déjà inscrit ?{" "}
                  <button className="btn btn--quiet btn--sm" onClick={() => setMode("connexion")}>
                    Se connecter
                  </button>
                </>
              )}
            </p>

            <div className="divider" />

            <Link to="/documentation" className="btn btn--block">
              Lire la documentation
              <Icon name="fleche" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
