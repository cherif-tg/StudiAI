import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ChampMotDePasse } from "../components/ChampMotDePasse";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { useAppData } from "../context/AppDataProvider";
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeProvider";
import type { ThemePreference } from "../context/ThemeProvider";
import { useToast } from "../context/ToastProvider";
import { ApiError, api, routeAbsente } from "../lib/api";
import { effacerAvis } from "../lib/avis";
import { effacerHistorique } from "../lib/conversations";
import { exporterDonnees } from "../lib/export";
import { EVENEMENT_INSTALLATION, dejaInstallee, installationPossible, installer } from "../lib/pwa";
import { effacerRevision } from "../lib/revision";

const SECTIONS = [
  { id: "apparence", label: "Apparence" },
  { id: "langue", label: "Langue" },
  { id: "compte", label: "Compte" },
  { id: "documents", label: "Documents" },
  { id: "donnees", label: "Mes données" },
  { id: "moteur", label: "Moteur" },
  { id: "apropos", label: "À propos" },
];

export function Settings() {
  const { preference, setPreference } = useTheme();
  const { user, deconnecter, supprimerCompte } = useAuth();
  const navigate = useNavigate();
  const { sessionId, nouvelleSession, sources, artefacts, sante } = useAppData();
  const { push } = useToast();
  const [verification, setVerification] = useState(false);

  // Page chargée à la demande : on rejoue le défilement vers l'ancre (#donnees…).
  const { hash } = useLocation();
  useEffect(() => {
    const id = hash.replace("#", "");
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [hash]);

  // --- Application installable --------------------------------------------
  const [peutInstaller, setPeutInstaller] = useState(installationPossible);
  const installee = typeof window !== "undefined" && dejaInstallee();
  useEffect(() => {
    const maj = () => setPeutInstaller(installationPossible());
    window.addEventListener(EVENEMENT_INSTALLATION, maj);
    return () => window.removeEventListener(EVENEMENT_INSTALLATION, maj);
  }, []);

  // --- Mes données : export et suppression du compte ---------------------
  const [exportEnCours, setExportEnCours] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);
  const [suppressionIndisponible, setSuppressionIndisponible] = useState(false);

  const exporter = async () => {
    if (!user) return;
    setExportEnCours(true);
    try {
      const mode = await exporterDonnees(user);
      push("Export prêt", {
        message:
          mode === "serveur"
            ? "L'archive complète de ton compte est téléchargée."
            : "Fichier JSON téléchargé : profil, liste des documents, carnet et données locales.",
        tone: "success",
      });
    } catch (erreur) {
      push("Export impossible", {
        message: erreur instanceof ApiError ? erreur.message : "Réessaie dans un instant.",
        tone: "error",
      });
    } finally {
      setExportEnCours(false);
    }
  };

  const fermerSuppression = () => {
    setSuppressionOuverte(false);
    setMotDePasse("");
    setErreurSuppression(null);
  };

  const confirmerSuppression = async (evenement?: FormEvent) => {
    evenement?.preventDefault();
    if (!user) return;
    if (motDePasse.length < 8) {
      setErreurSuppression("Saisis ton mot de passe pour confirmer.");
      return;
    }
    setSuppressionEnCours(true);
    setErreurSuppression(null);
    const compte = user.id;
    try {
      // On rejoint l'accueil avant de fermer la session : sinon la page protégée
      // redirigerait vers la connexion. La navigation du routeur est différée
      // (transition React), d'où la courte attente.
      await supprimerCompte(motDePasse, async () => {
        navigate("/", { replace: true });
        await new Promise((resoudre) => window.setTimeout(resoudre, 80));
      });
      effacerHistorique(compte);
      effacerRevision(compte);
      effacerAvis(compte);
      push("Compte supprimé", {
        message: "Ton compte, tes documents et ton carnet ont été effacés.",
        tone: "success",
      });
    } catch (erreur) {
      if (routeAbsente(erreur)) {
        setSuppressionIndisponible(true);
        setErreurSuppression(null);
      } else if (erreur instanceof ApiError && (erreur.status === 401 || erreur.status === 403)) {
        setErreurSuppression("Mot de passe incorrect.");
      } else {
        setErreurSuppression(
          erreur instanceof ApiError ? erreur.message : "La suppression a échoué. Réessaie.",
        );
      }
    } finally {
      setSuppressionEnCours(false);
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
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Application</strong>
                  <span>
                    {installee
                      ? "Nunya est installée sur cet appareil."
                      : peutInstaller
                        ? "Ajoute Nunya à ton écran d'accueil : ouverture rapide et carnet hors ligne."
                        : "Pour l'installer, utilise « Ajouter à l'écran d'accueil » dans le menu de ton navigateur."}
                  </span>
                </div>
                {installee ? (
                  <span className="badge badge--ok">Installée</span>
                ) : peutInstaller ? (
                  <button className="btn btn--sm" onClick={() => void installer()}>
                    <Icon name="telecharger" size={13} />
                    Installer
                  </button>
                ) : null}
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

            <section className="card card--pad settings-section" id="compte" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Compte</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>{user?.name || "Compte"}</strong>
                  <span className="mono">{user?.email}</span>
                </div>
                <button className="btn btn--sm" onClick={() => void deconnecter()}>
                  Se déconnecter
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Conversation en cours</strong>
                  <span className="mono">{sessionId.slice(0, 8)}</span>
                </div>
                <button className="btn btn--sm" onClick={nouvelleSession}>
                  <Icon name="rafraichir" size={13} />
                  Nouvelle conversation
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Contenu du compte</strong>
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
                Les documents et le carnet sont liés à ton compte. Une nouvelle conversation
                repart d'un historique vide, sans toucher au carnet.
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

            <section className="card card--pad settings-section" id="donnees" style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-lg)" }}>Mes données</h2>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Télécharger mes données</strong>
                  <span>Une copie de ton profil, de tes documents et de ton carnet.</span>
                </div>
                <button className="btn btn--sm" onClick={() => void exporter()} disabled={exportEnCours}>
                  {exportEnCours ? <span className="spinner" /> : <Icon name="telecharger" size={13} />}
                  Télécharger
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row__label">
                  <strong>Données sur cet appareil</strong>
                  <span>Historique des conversations, suivi des révisions et avis sur les réponses, gardés dans ce navigateur.</span>
                </div>
                <button
                  className="btn btn--sm"
                  onClick={() => {
                    if (!user) return;
                    effacerHistorique(user.id);
                    effacerRevision(user.id);
                    effacerAvis(user.id);
                    push("Données locales effacées", {
                      message: "Historique et révisions de cet appareil supprimés.",
                      tone: "info",
                    });
                  }}
                >
                  <Icon name="corbeille" size={13} />
                  Effacer
                </button>
              </div>

              <div className="danger-zone">
                <div className="settings-row__label">
                  <strong>Supprimer mon compte</strong>
                  <span>
                    Efface définitivement ton compte, tes documents, leur index et ton carnet. Cette
                    action est irréversible.
                  </span>
                </div>
                <button className="btn btn--danger btn--sm" onClick={() => setSuppressionOuverte(true)}>
                  <Icon name="corbeille" size={13} />
                  Supprimer mon compte
                </button>
              </div>
            </section>

            <Modal
              open={suppressionOuverte}
              title="Supprimer mon compte"
              onClose={fermerSuppression}
              footer={
                suppressionIndisponible ? (
                  <button className="btn" onClick={fermerSuppression}>
                    Fermer
                  </button>
                ) : (
                  <>
                    <button className="btn" onClick={fermerSuppression}>
                      Annuler
                    </button>
                    <button
                      className="btn btn--danger-solid"
                      onClick={() => void confirmerSuppression()}
                      disabled={suppressionEnCours}
                    >
                      {suppressionEnCours ? <span className="spinner" /> : null}
                      Supprimer définitivement
                    </button>
                  </>
                )
              }
            >
              {suppressionIndisponible ? (
                <div className="stack gap-3">
                  <p className="notice">
                    Cette instance ne propose pas encore la suppression en libre-service.
                  </p>
                  <p className="small muted">
                    Demande-la à l'équipe avec le formulaire de contact en bas de page : ton compte
                    et toutes tes données seront effacés. Tu peux d'abord télécharger une copie de
                    tes données.
                  </p>
                </div>
              ) : (
                <form className="stack gap-4" onSubmit={(e) => void confirmerSuppression(e)} noValidate>
                  <p className="small" style={{ color: "var(--ink-soft)" }}>
                    Seront effacés définitivement :
                  </p>
                  <ul className="danger-list">
                    <li>ton compte ({user?.email}) et tes sessions ouvertes ;</li>
                    <li>
                      tes {sources.length} document{sources.length > 1 ? "s" : ""} et leur index de
                      recherche ;
                    </li>
                    <li>
                      les {artefacts.length} artefact{artefacts.length > 1 ? "s" : ""} de ton carnet ;
                    </li>
                    <li>l'historique et les révisions gardés sur cet appareil.</li>
                  </ul>
                  <div className="field">
                    <label className="label" htmlFor="mdp-suppression">
                      Ton mot de passe, pour confirmer
                    </label>
                    <ChampMotDePasse
                      id="mdp-suppression"
                      autoComplete="current-password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                    />
                  </div>
                  {erreurSuppression ? (
                    <p className="error-text" role="alert">
                      {erreurSuppression}
                    </p>
                  ) : null}
                </form>
              )}
            </Modal>

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
                Nunya, atelier d'apprentissage documentaire. Version 0.1.0 (MVP). Projet togolais,
                pensé pour fonctionner en français et, après le MVP, en éwé.
              </p>
              <div className="row gap-2" style={{ marginTop: 12 }}>
                <Link to="/documentation" className="btn btn--sm">
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
