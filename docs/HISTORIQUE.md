# Historique des évolutions

> Journal du travail réalisé sur l'interface. Le [README](../README.md) décrit le projet tel qu'il est aujourd'hui.

## Ce qui a été fait

Règle suivie tout au long du travail : **aucune route, aucun appel API existant,
aucune logique métier n'a été modifié**. Les nouvelles fonctions s'ajoutent à côté
de l'existant ; celles qui dépendent du serveur détectent l'absence de route et le
disent à l'utilisateur au lieu d'échouer.

### 1. Refonte visuelle et UX

**Benchmark.** Coursera, Khan Academy (système Wonder Blocks), edX/Open edX
(Paragon), Moodle 4 et uLesson. Retenus : un bleu unique pour toutes les actions,
des fonds blancs ou gris très clairs, des ombres légères, des contrastes vérifiés
(WCAG), une navigation principale soulignée sous l'onglet actif, un menu dépliant
sur mobile.

**Charte (`src/styles/tokens.css`).**

| Rôle | Clair | Sombre |
|---|---|---|
| Bleu académique (actions, liens, focus) | `#1d58d6` | `#6b9bff` |
| Or (distinction, sur-titres, révisions) | `#d99a16` | `#f0b73a` |
| Émeraude (réussite, « Indexé ») | `#057a5c` | `#3fcf9e` |
| Fond / panneau | `#f5f7fb` / `#ffffff` | `#0b1322` / `#121c2e` |
| Texte / atténué | `#111c2e` / `#5a6578` | `#e8edf5` / `#9aa6b9` |

- Arrondis discrets de 4 à 14 px, plus aucune forme « pilule ».
- Typographie : **Inter** pour le texte, **Inter Tight** pour les titres. Les deux
  couvrent tout l'alphabet éwé (Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ), ce qui a été vérifié dans les
  fichiers de police ; Lexend et Plus Jakarta Sans ont été écartées pour cette raison.
- Composants harmonisés : boutons, champs, cartes, badges, onglets, modales,
  notifications, tableaux.
- Tous les couples texte/fond dépassent 4,5:1 dans les deux thèmes.

**Responsive.**
- Menu burger sous 860 px, avec les mêmes destinations que la barre.
- Atelier sur mobile : un seul volet à la fois, avec des onglets Sources /
  Discussion / Atelier ; une pastille dorée signale un résumé ou un quiz prêt.
- Sommaire de la documentation et navigation des réglages en bandeaux défilants.
- Cibles tactiles de 40 à 44 px, champs à 16 px (pas de zoom automatique sur iPhone),
  zones sûres des écrans à encoche respectées, notifications en haut sur mobile.

**Animations.** Apparitions de 120 à 280 ms, léger soulèvement des cartes au survol
(désactivé sur écran tactile), ouverture douce des menus et des fenêtres. Tout est
coupé si le système demande de réduire les animations.

### 2. Thème, textes, pages juridiques, footer, cookies

- **Thème clair par défaut** (`ThemeProvider.tsx`, `index.html`), même si l'appareil
  est en sombre ; « Sombre » et « Système » restent au choix dans les Réglages.
- **Tirets supprimés** : puces rondes devant les sur-titres et les titres de
  « Nos limites », ponctuation normale à la place des tirets longs dans les textes.
- **Inscription** : case obligatoire « J'accepte les Conditions d'utilisation et la
  Politique de confidentialité », liens ouverts dans un nouvel onglet.
- **Pages** `/confidentialite`, `/conditions`, `/a-propos` (`pages/Legal.tsx`,
  `content/legal/*.md`) avec sommaire et liens directs vers chaque section. La
  politique décrit ce que l'application fait réellement et les droits prévus par
  la loi togolaise n° 2019-014 (autorité : IPDCP). **À faire relire par un juriste
  avant une mise en ligne publique.**
- **Footer** (`SiteFooter.tsx`) sur toutes les pages sauf l'atelier : liens produit,
  ressources, informations, copyright, « Gérer les cookies », et un formulaire de
  contact (validation, champ anti-robots, confirmation).
- **Bandeau cookies** (`CookieConsent.tsx`) : « Accepter » et « En savoir plus », choix
  retenu 12 mois, réouvrable depuis le footer. Seuls un cookie de session et du
  stockage local sont utilisés : aucun traceur publicitaire ni de mesure d'audience.

### 3. Améliorations fonctionnelles

| # | Amélioration | Où | Côté serveur |
|---|---|---|---|
| 1 | **Listes Markdown** : une ligne indentée après un point de liste le prolonge au lieu de créer un paragraphe ; les listes numérotées affichent leurs numéros | `components/Markdown.tsx`, `styles/pages.css` | Rien |
| 2 | **Export des données et suppression du compte** (Réglages, Mes données) | `pages/Settings.tsx`, `lib/export.ts`, `context/AuthProvider.tsx`, `lib/api.ts` | Routes à ajouter (voir [intégration backend](INTEGRATION_BACKEND.md), § 2). Sans elles : export JSON assemblé dans le navigateur, suppression indiquée « non disponible » |
| 3 | **Mot de passe oublié** : lien sur la connexion, pages `/mot-de-passe-oublie` et `/reinitialiser?jeton=…` | `pages/MotDePasse.tsx`, `pages/Auth.tsx` | Routes et envoi d'e-mail à ajouter (voir [intégration backend](INTEGRATION_BACKEND.md), § 3). Sans elles : message « pas encore activé » |
| 4 | **Historique des conversations** : bouton Historique dans la discussion, reprise d'une conversation, résumé et quiz retrouvés | `lib/conversations.ts`, `pages/Workspace.tsx`, `workspace/ChatPane.tsx`, `context/AppDataProvider.tsx` | Fonctionne déjà (stockage local, par compte). Pour que **l'agent** se souvienne après un redémarrage : § 4 |
| 5 | **Passages cités** : les documents utilisés apparaissent sous chaque réponse ; un clic montre les extraits exacts (page, pertinence) | `lib/passages.ts`, `workspace/ChatPane.tsx` | Renvoyer les passages dans l'étape `rag_search` (voir [intégration backend](INTEGRATION_BACKEND.md), § 6) |
| 6 | **Application installable et carnet hors ligne** : manifeste, icônes, service worker, bandeau hors ligne, bouton « Installer » dans les Réglages | `public/manifest.json`, `public/sw.js`, `lib/pwa.ts`, `components/OfflineBanner.tsx` | Servir `/sw.js` et le manifeste à la racine (voir [intégration backend](INTEGRATION_BACKEND.md), § 7) |
| 7 | **Révision espacée** : chaque question ratée revient le lendemain, puis à 3 jours, 1 semaine, 2 semaines et 1 mois ; page `/revisions` avec boîtes et réussite par notion ; pastille « à revoir » dans la navigation | `lib/revision.ts`, `pages/Revisions.tsx`, `hooks/useRevision.ts`, `workspace/AtelierPane.tsx` | Rien (stockage local). Synchronisation entre appareils : option § 8 |
| 8 | **Accessibilité** : focus piégé et restitué dans les fenêtres et le menu mobile, titres hiérarchisés, lignes de documents sans contrôles imbriqués, contrastes corrigés | `hooks/useFocusTrap.ts`, `components/Modal.tsx`, `AppShell.tsx`, volets | Rien |
| 9 | **Performance** : pages secondaires chargées à la demande, graisses de police inutiles retirées | `App.tsx`, `components/PageLoader.tsx`, `index.html` | Rien |

Détails utiles :

- **Fenêtres modales** : la fonction de fermeture était une dépendance de l'effet de
  focus ; à chaque frappe dans un champ, le focus repartait sur le premier bouton.
  C'est corrigé (fermeture gardée dans une référence).
- **Suppression du compte** : l'utilisateur revient à l'accueil, l'historique et les
  révisions de l'appareil sont effacés, et le service worker vide son cache de données.
- **Service worker** : la coquille de l'application et les lectures `GET /auth/me`,
  `/sources`, `/artifacts` et `/artifacts/*` sont gardées pour le mode hors ligne ;
  questions, dépôts et exports passent toujours par le réseau. Le cache de données
  est vidé à la connexion, à la déconnexion, à la suppression du compte et au
  changement de mot de passe.
- **Taille du code chargé au démarrage** : 414 Ko → 345 Ko (−17 %), avant compression.
- **Documentation intégrée** mise à jour (limites, mot de passe, historique,
  révisions) ainsi que la politique de confidentialité.

### 4. Nouveau logo et application installable (finalisation)

- **Nouvel emblème** (livre ouvert, plume, soleil) redessiné en vecteur d'après le
  logo officiel, dans `components/Brand.tsx` : net à toutes les tailles, couleurs
  pilotées par des jetons (`--logo-bleu`, `--logo-or`, `--logo-vert` ; l'orange
  initial a ensuite été remplacé par `--logo-vert-fonce`, voir § 5) avec une variante
  claire pour le thème sombre. Il remplace
  l'ancienne marque partout : barre du haut, footer, page de connexion, accueil,
  chargement, page 404, favicon, icônes de l'application.
- **Signification du logo** : section « Notre emblème » sur l'accueil et sur la page
  À propos (le livre, la plume, le soleil).
- **Accueil** : l'emblème du héros s'anime au chargement (le livre apparaît, la plume
  descend, les rayons s'allument un à un), une seule fois et en moins d'une seconde.
- **PWA** : `manifest.json` (nom, icônes classiques et « maskable », couleur de thème,
  raccourcis Atelier, Carnet, Révisions, captures d'écran pour la fenêtre
  d'installation), service worker `nunya-v2`, et **proposition d'installation**
  (« Installer l'application Nunya » / « Plus tard ») qui déclenche l'invite native
  du navigateur ; sur iPhone et iPad, elle explique le geste « Sur l'écran d'accueil ».
- **Nettoyage** : relais de développement complété (`/auth`, `/agent` manquaient,
  ce qui empêchait la connexion avec `npm run dev`), cible du backend réglable,
  styles inutilisés retirés, `.gitignore`, documentation réorganisée (`docs/`).

### 5. Discussion : réflexion visible et actions sur les réponses

- **Emblème recentré** sur le livre, la plume et les rayons, en trois couleurs
  (bleu académique, or, vert émeraude) ; le nom « Nunya » passe **sous l'emblème
  sur mobile**. Icônes, favicon et images régénérées.
- **Indicateur de réflexion** (`IndicateurReflexion.tsx`) : emblème animé, statut
  qui évolue (réflexion, recherche, exécution des outils adaptée à la demande,
  génération), frise d'étapes, temps écoulé, lignes fantômes.
- **Actions sous les réponses** (`ActionsMessage.tsx`) : copier (« Copié ! »),
  avis 👍 / 👎 avec motif, régénérer avec versions consultables (« ‹ 1/2 › »).
- **Backend** : route `POST /chat/feedback` fournie et testée ; option de diffusion
  des étapes réelles documentée.

### 6. Finalisations : mot de passe visible, questions modifiables

- **Afficher / masquer le mot de passe** : bouton en forme d'œil (ouvert / barré)
  intégré au champ, sur la connexion **et** l'inscription, ainsi que sur la page
  « Nouveau mot de passe » et la confirmation de suppression du compte
  (`components/ChampMotDePasse.tsx`). Le bouton ne soumet jamais le formulaire,
  annonce son action (« Afficher le mot de passe ») et son état (`aria-pressed`) ;
  le champ démarre toujours masqué et garde sa saisie quand on bascule.
- **Modifier une question envoyée** : crayon discret sous chaque message de
  l'utilisateur (`workspace/MessageUtilisateur.tsx`). La bulle devient un champ :
  Entrée relance, Échap annule, focus rendu au crayon. La discussion est coupée juste
  avant l'ancienne question, puis la question réécrite repart par le chemin d'envoi
  habituel (`envoyer`, inchangé). Un avertissement s'affiche si d'autres échanges
  suivaient.
- **Contraste** : la barre d'actions sous les réponses n'est plus atténuée au repos
  (ses libellés passaient sous 4,5:1).
- Documentation intégrée (`content/01-demarrer.md`, `03-questions.md`) et README
  complétés.

## Données gardées dans le navigateur

| Clé | Contenu | Effacement |
|---|---|---|
| `nunya.theme` | Thème choisi | Réglages, ou effacement du site |
| `nunya.mode` | Mode de réponse de l'agent | idem |
| `nunya.session` | Identifiant de la conversation en cours | idem |
| `nunya.cookies` | Choix sur le bandeau cookies (12 mois) | « Gérer les cookies » |
| `nunya.conversations.<compte>` et `nunya.conv.<compte>.<id>` | 30 dernières conversations | Réglages, Mes données, Effacer ; suppression du compte |
| `nunya.revision.<compte>` | Questions à revoir, réussite par notion | idem |
| `nunya.avis.<compte>` | Avis 👍 / 👎 sur les réponses | Réglages, Mes données, Effacer ; suppression du compte |
| `nunya.installation` | « Plus tard » sur la proposition d'installation (7 jours) | Automatique |
| Caches `nunya-v2-*` | Coquille de l'application, carnet hors ligne, polices | Vidés à la connexion et à la déconnexion (données) |

## Vérifications réalisées

- `npm run typecheck` et `npm run build` sans erreur.
- Test de rendu (`npm run smoke`) sur les 14 routes, avec et sans compte : aucune erreur.
- Audit d'accessibilité **axe-core** (WCAG 2.1 AA et bonnes pratiques) sur 11 pages,
  en thème clair et sombre : **0 violation**.
- Captures en 375, 768, 900, 1024, 1280 et 1440 px, sans défilement horizontal.
- Parcours complets testés dans un navigateur, sur la démo branchée à un serveur
  simulé : inscription avec consentement, bandeau cookies, demande de mot de passe
  oublié, question avec passages cités, quiz puis révision, historique et reprise,
  suppression du compte, envoi du formulaire de contact. Service worker et rendu
  hors ligne testés sur la version de production (`vite preview`).
- Code Python d'intégration : `10 passed`.
- Œil du mot de passe et édition des questions testés dans Chromium à 1280 et 390 px
  (bascule, valeur conservée, relance, coupure de la suite, historique enregistré,
  Échap) ; axe-core : 0 violation sur l'inscription et sur la discussion en édition.
