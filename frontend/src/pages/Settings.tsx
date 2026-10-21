import { useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { useAppData } from "../context/AppDataProvider";
import { useTheme } from "../context/ThemeProvider";
import type { ThemePreference } from "../context/ThemeProvider";
import { useToast } from "../context/ToastProvider";
import { api } from "../lib/api";

const SECTIONS = [
  { id: "apparence", label: "Apparence" },
  { id: "langue", label: "Langue" },
  { id: "session", label: "Session" },
  { id: "documents", label: "Documents" },
  { id: "moteur", label: "Moteur" },
  { id: "apropos", label: "À propos" },
];

export function Settings() {
  const { preference, setPreference } = useTheme();
  const { sessionId, nouvelleSession, sources, artefacts, sante } = useAppData();
  const { push } = useToast();
  const [verification, setVerification] = useState(false);

  const copierSession = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      push("Identifiant copié", { tone: "success" });
    } catch {
      push("Copie impossible", {
        message: `Ton identifiant : ${sessionId}`,
        tone: "error",
      });
    }
  };

  const verifierMoteur = async () => {
    setVerification(true);
    try {
      const etat = await api.health();
      push("Moteur vérifié", {
        message: `Recherche : ${etat.rag ? "prête" : "en préparation"} · Génération : ${
          etat.llm ? "configurée" : "absente"
        }`,
        tone: etat.rag && etat.llm ? "success" : "info",
      });
    } catch {
      push("Serveur injoignable", { tone: "error" });
    } finally {
      setVerification(false);
    }
  };

  return (
    <AppShell>
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Réglages</p>
            <h1 style={{ marginTop: 6 }}>Ton atelier, tes règles</h1>
            <p>Tout est stocké sur ton appareil et sur le serveur de ton équipe.</p>
          </div>
        </div>

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Sections des réglages">
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>

          <div>
            <section className="card card--pad settings-section" id="apparence">
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>
                Apparence
              </h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Thème</strong>
                  <span>Le mode système suit le réglage de ton appareil.</span>
                </div>
                <div className="segmented" role="group" aria-label="Thème">
                  {(
                    [
                      ["light", "Clair"],
                      ["dark", "Sombre"],
                      ["system", "Système"],
                    ] as [ThemePreference, string][]
                  ).map(([valeur, label]) => (
                    <button
                      key={valeur}
                      aria-pressed={preference === valeur}
                      onClick={() => setPreference(valeur)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="card card--pad settings-section" id="langue" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Langue</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Français</strong>
                  <span>Langue de l'interface et des réponses.</span>
                </div>
                <span className="badge badge--ok">Active</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Éwé</strong>
                  <span>Traduction des fiches et des résumés par le modèle Nunya.</span>
                </div>
                <span className="badge badge--warn">Après le MVP</span>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Kabiyè</strong>
                  <span>Couverture typographique en cours de validation.</span>
                </div>
                <span className="badge">À l'étude</span>
              </div>
            </section>

            <section className="card card--pad settings-section" id="session" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Session</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Identifiant</strong>
                  <span className="mono">{sessionId}</span>
                </div>
                <div className="row gap-2">
                  <button className="btn btn--sm" onClick={() => void copierSession()}>
                    <Icon name="cle" size={13} />
                    Copier
                  </button>
                  <button className="btn btn--sm" onClick={nouvelleSession}>
                    <Icon name="rafraichir" size={13} />
                    Nouvelle session
                  </button>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Contenu de la session</strong>
                  <span>
                    {sources.length} document{sources.length > 1 ? "s" : ""} · {artefacts.length}{" "}
                    artefact{artefacts.length > 1 ? "s" : ""}
                  </span>
                </div>
                <Link to="/carnet" className="btn btn--sm">
                  Voir le carnet
                </Link>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                Les documents sont partagés par l'atelier ; les artefacts sont rattachés à cette
                session. Une nouvelle session repart avec un carnet vide.
              </p>
            </section>

            <section className="card card--pad settings-section" id="documents" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Documents</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Bibliothèque</strong>
                  <span>Déposer, sélectionner ou retirer un document se fait dans l'atelier.</span>
                </div>
                <Link to="/atelier" className="btn btn--sm">
                  <Icon name="sources" size={13} />
                  Gérer les documents
                </Link>
              </div>
            </section>

            <section className="card card--pad settings-section" id="moteur" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Moteur</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Recherche documentaire</strong>
                  <span>Index vectoriel et modèle d'embedding multilingue.</span>
                </div>
                <span className={`badge badge--${sante?.rag ? "ok" : "warn"}`}>
                  {sante?.rag ? "Prête" : sante ? "En préparation" : "Inconnue"}
                </span>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Génération</strong>
                  <span>Modèle de langage et appels d'outils.</span>
                </div>
                <span className={`badge badge--${sante?.llm ? "ok" : "warn"}`}>
                  {sante?.llm ? "Configurée" : "Clé absente"}
                </span>
              </div>
              <button className="btn btn--sm" onClick={() => void verifierMoteur()} disabled={verification}>
                {verification ? <span className="spinner" /> : <Icon name="rafraichir" size={13} />}
                Vérifier maintenant
              </button>
            </section>

            <section className="card card--pad settings-section" id="apropos" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>À propos</h2>
              <p className="muted small" style={{ marginTop: 8 }}>
                Nunya — atelier d'apprentissage documentaire. Version 0.1.0 (MVP). Projet togolais,
                pensé pour fonctionner en français et, après le MVP, en éwé.
              </p>
              <div className="row gap-2" style={{ marginTop: 12 }}>
                <Link to="/aide" className="btn btn--sm">
                  <Icon name="aide" size={13} />
                  Guide d'utilisation
                </Link>
                <Link to="/" className="btn btn--sm">
                  Page d'accueil
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
