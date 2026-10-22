import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ChampMotDePasse } from "../components/ChampMotDePasse";
import { Icon } from "../components/Icon";
import { ApiError, api, routeAbsente } from "../lib/api";

/**
 * Mot de passe oublié et réinitialisation par lien e-mail.
 * Les deux routes (`/auth/password/forgot`, `/auth/password/reset`) sont à
 * ajouter au backend : voir README. Sans elles, la page l'indique clairement.
 */

function Cadre({ titre, sousTitre, children }: { titre: string; sousTitre: string; children: ReactNode }) {
  return (
    <AppShell>
      <div className="auth-solo">
        <div className="auth__card">
          <div>
            <p className="eyebrow">Mot de passe</p>
            <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 6 }}>{titre}</h1>
            <p className="muted small" style={{ marginTop: 6 }}>
              {sousTitre}
            </p>
          </div>
          {children}
        </div>
      </div>
    </AppShell>
  );
}

function Indisponible() {
  return (
    <div className="stack gap-3">
      <p className="notice">
        La réinitialisation par e-mail n'est pas encore activée sur cette instance.
      </p>
      <p className="small muted">
        Écris à l'équipe avec le formulaire de contact en bas de page : l'administrateur pourra
        t'aider à récupérer l'accès à ton compte.
      </p>
      <Link to="/connexion" className="btn btn--block">
        Retour à la connexion
      </Link>
    </div>
  );
}

export function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<"saisie" | "envoye" | "indisponible">("saisie");

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setErreur("Cette adresse e-mail n'est pas valide.");
      return;
    }
    setEnvoi(true);
    try {
      await api.motDePasseOublie(email.trim());
      setEtat("envoye");
    } catch (probleme) {
      if (routeAbsente(probleme)) setEtat("indisponible");
      else setErreur(probleme instanceof ApiError ? probleme.message : "Envoi impossible. Réessaie.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Cadre
      titre="Mot de passe oublié"
      sousTitre="Indique l'adresse de ton compte : nous t'enverrons un lien pour choisir un nouveau mot de passe."
    >
      {etat === "indisponible" ? <Indisponible /> : null}

      {etat === "envoye" ? (
        <div className="stack gap-3" role="status">
          <div className="success-box">
            <Icon name="coche" size={18} strokeWidth={2.2} />
            <p>
              Si un compte existe pour <strong>{email.trim()}</strong>, un e-mail vient de partir. Le
              lien est valable 30 minutes.
            </p>
          </div>
          <p className="small muted">Pense à regarder dans les courriers indésirables.</p>
          <Link to="/connexion" className="btn btn--block">
            Retour à la connexion
          </Link>
        </div>
      ) : null}

      {etat === "saisie" ? (
        <form className="stack gap-4" onSubmit={(e) => void soumettre(e)} noValidate>
          <div className="field">
            <label className="label" htmlFor="email-oubli">
              Adresse e-mail
            </label>
            <input
              id="email-oubli"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="prenom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {erreur ? (
            <p className="error-text" role="alert">
              {erreur}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={envoi}>
            {envoi ? <span className="spinner" /> : null}
            Recevoir le lien
          </button>
          <Link to="/connexion" className="btn btn--quiet btn--block">
            Retour à la connexion
          </Link>
        </form>
      ) : null}
    </Cadre>
  );
}

export function Reinitialiser() {
  const [parametres] = useSearchParams();
  const jeton = parametres.get("jeton") ?? "";
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<"saisie" | "fait" | "expire" | "indisponible">(
    jeton ? "saisie" : "expire",
  );

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setEnvoi(true);
    try {
      await api.reinitialiserMotDePasse(jeton, motDePasse);
      setEtat("fait");
    } catch (probleme) {
      if (routeAbsente(probleme)) setEtat("indisponible");
      else if (probleme instanceof ApiError && [400, 410].includes(probleme.status)) setEtat("expire");
      else setErreur(probleme instanceof ApiError ? probleme.message : "Échec. Réessaie.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Cadre titre="Nouveau mot de passe" sousTitre="Choisis un mot de passe d'au moins 8 caractères.">
      {etat === "indisponible" ? <Indisponible /> : null}

      {etat === "expire" ? (
        <div className="stack gap-3">
          <p className="notice">Ce lien n'est plus valable : il a expiré ou a déjà servi.</p>
          <Link to="/mot-de-passe-oublie" className="btn btn--primary btn--block">
            Demander un nouveau lien
          </Link>
        </div>
      ) : null}

      {etat === "fait" ? (
        <div className="stack gap-3" role="status">
          <div className="success-box">
            <Icon name="coche" size={18} strokeWidth={2.2} />
            <p>Ton mot de passe a été modifié. Tes autres sessions ont été fermées.</p>
          </div>
          <Link to="/connexion" className="btn btn--primary btn--block">
            Se connecter
          </Link>
        </div>
      ) : null}

      {etat === "saisie" ? (
        <form className="stack gap-4" onSubmit={(e) => void soumettre(e)} noValidate>
          <div className="field">
            <label className="label" htmlFor="nouveau-mdp">
              Nouveau mot de passe
            </label>
            <ChampMotDePasse
              id="nouveau-mdp"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirmation-mdp">
              Confirme le mot de passe
            </label>
            <ChampMotDePasse
              id="confirmation-mdp"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          {erreur ? (
            <p className="error-text" role="alert">
              {erreur}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={envoi}>
            {envoi ? <span className="spinner" /> : null}
            Enregistrer le mot de passe
          </button>
        </form>
      ) : null}
    </Cadre>
  );
}
