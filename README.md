<p align="center">
  <img src="docs/images/nunya-logo.png" alt="Nunya, atelier d'apprentissage" width="420">
</p>

# Nunya : interface web

Interface de **Nunya**, atelier d'apprentissage documentaire né au Togo. On y dépose
ses cours (PDF, Word), on pose des questions, et l'agent répond **uniquement à partir
de ces documents**, en citant ses sources. Il produit aussi des résumés et des quiz,
que l'on garde dans un carnet et que l'on révise au bon moment.

L'interface est une **application web progressive (PWA)** : elle s'installe sur
l'écran d'accueil d'un téléphone ou d'un ordinateur et garde le carnet consultable
hors ligne.

## Sommaire

1. [Aperçu](#1-aperçu)
2. [Bilan de la refonte](#2-bilan-de-la-refonte)
3. [Technologies et dépendances](#3-technologies-et-dépendances)
4. [Démarrage rapide](#4-démarrage-rapide)
5. [Architecture du code](#5-architecture-du-code)
6. [Interface de discussion](#6-interface-de-discussion)
7. [Connecter l'interface au backend](#7-connecter-linterface-au-backend)
8. [Application installable (PWA)](#8-application-installable-pwa)
9. [Identité visuelle](#9-identité-visuelle)
10. [Qualité et tests](#10-qualité-et-tests)
11. [Documentation complémentaire](#11-documentation-complémentaire)

---

## 1. Aperçu

| Page | Route | Accès |
|---|---|---|
| Accueil | `/` | Public |
| Connexion, inscription | `/connexion` | Public |
| Mot de passe oublié, nouveau mot de passe | `/mot-de-passe-oublie`, `/reinitialiser?jeton=…` | Public |
| Atelier : sources, discussion, résumé et quiz | `/atelier` | Compte |
| Carnet : résumés et quiz enregistrés | `/carnet` | Compte |
| Révisions espacées, suivi par notion | `/revisions` | Compte |
| Réglages : thème, compte, mes données, installation | `/reglages` | Compte |
| Documentation intégrée | `/documentation` | Public |
| Confidentialité, conditions d'utilisation, à propos | `/confidentialite`, `/conditions`, `/a-propos` | Public |
| Page introuvable | toute autre adresse | Public |

## 2. Bilan de la refonte

Règle suivie du début à la fin : **aucune route, aucun appel API existant, aucun
état ni aucune logique métier n'a été modifié.** Les nouveautés s'ajoutent à côté de
l'existant. Celles qui dépendent d'une route serveur encore absente le détectent
(`404`/`405`/`501`) et le disent à l'utilisateur au lieu d'échouer. Le journal
détaillé, étape par étape, est dans [`docs/HISTORIQUE.md`](docs/HISTORIQUE.md).

### 2.1 Design UI/UX

- **Benchmark** de Coursera, Khan Academy, edX/Open edX, Moodle 4 et uLesson : un bleu
  unique pour les actions, des fonds clairs, des ombres légères, une navigation
  soulignée sous l'onglet actif, un menu dépliant sur mobile.
- **Mode clair par défaut**, même si l'appareil est en sombre. « Sombre » et
  « Système » restent au choix dans les Réglages. Le thème est appliqué avant
  l'affichage (`index.html`), sans flash.
- **Palette de l'éducation** (`src/styles/tokens.css`) :

  | Rôle | Clair | Sombre |
  |---|---|---|
  | Bleu académique : actions, liens, focus | `#1d58d6` | `#6b9bff` |
  | Or : distinction, sur-titres, révisions | `#d99a16` | `#f0b73a` |
  | Vert émeraude : réussite, « Indexé » | `#057a5c` | `#3fcf9e` |
  | Fond / panneau | `#f5f7fb` / `#ffffff` | `#0b1322` / `#121c2e` |
  | Texte / texte atténué | `#111c2e` / `#5a6578` | `#e8edf5` / `#9aa6b9` |

- **Coins subtilement arrondis** : de 4 à 14 px, plus aucune forme « pilule ».
- **Typographie** : Inter pour le texte, Inter Tight pour les titres ; les deux
  couvrent tout l'alphabet éwé (Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ).
- **Tirets parasites supprimés** : plus de « -- » ni de tirets longs devant les mots
  et les phrases ; puces rondes, séparateurs « · » et ponctuation normale à la place.
- **Responsive complet** : menu burger sous 860 px ; atelier en onglets
  (Sources / Discussion / Atelier) sur mobile ; cibles tactiles de 40 à 44 px ;
  champs en 16 px (pas de zoom automatique sur iPhone) ; zones sûres des écrans à
  encoche ; aucun défilement horizontal de 375 à 1440 px.
- **Animations** subtiles et rapides (120 à 280 ms), coupées si le système demande
  de réduire les mouvements.
- **Accessibilité** WCAG 2.1 AA : contrastes de 4,5:1 minimum, focus visible, focus
  piégé et restitué dans les fenêtres et le menu mobile, titres hiérarchisés, lien
  d'évitement « Aller au contenu », annonces pour lecteurs d'écran.

### 2.2 Logo et nom

- L'emblème contient **uniquement** le livre ouvert, la plume et les rayons de lumière,
  en bleu académique, or et vert émeraude (détails en § 9).
- Le nom **« Nunya » s'affiche juste en dessous de l'emblème sur mobile** (barre du
  haut, pied de page, accueil) et à côté sur ordinateur.
- Section « Notre emblème » sur l'accueil et la page À propos (signification des trois
  symboles). Favicon, icônes d'application et images régénérés.

### 2.3 Pages juridiques, consentement et cookies

- Pages **Politique de confidentialité** (`/confidentialite`), **Conditions
  d'utilisation** (`/conditions`) et **À propos** (`/a-propos`), avec sommaire et liens
  directs vers chaque section (`pages/Legal.tsx`, `content/legal/*.md`). Elles
  décrivent ce que l'application fait réellement et les droits prévus par la loi
  togolaise n° 2019-014. **À faire relire par un juriste avant une mise en ligne publique.**
- **Inscription** : case obligatoire « J'accepte les Conditions d'utilisation et la
  Politique de confidentialité », avec liens cliquables ouverts dans un nouvel onglet.
- **Bandeau cookies** (`CookieConsent.tsx`) : « Accepter » et « En savoir plus », choix
  retenu 12 mois, réouvrable depuis le footer (« Gérer les cookies »).

### 2.4 Pied de page et retours

- **Footer professionnel** (`SiteFooter.tsx`) sur toutes les pages sauf l'atelier :
  navigation, ressources, liens juridiques (Confidentialité, Conditions, À propos,
  Contact), copyright.
- **Mini-formulaire de contact et de retours** (e-mail et message) : validation,
  champ anti-robots invisible, confirmation. Envoi vers `POST /contact`, vers une
  route configurable, ou ouverture de la messagerie (voir § 7.2).

### 2.5 Compte et données

- **Afficher / masquer le mot de passe** : bouton en forme d'œil (ouvert / barré)
  **intégré au champ**, sur la **connexion** et la **création de compte**, ainsi que
  sur « Nouveau mot de passe » et la confirmation de suppression du compte
  (`components/ChampMotDePasse.tsx`).
- **Mot de passe oublié** : lien sur la connexion, pages `/mot-de-passe-oublie` et
  `/reinitialiser?jeton=…`.
- **Réglages, Mes données** : télécharger ses données (JSON), effacer les données
  gardées sur l'appareil, supprimer son compte (avec mot de passe).

### 2.6 Apprentissage

- **Historique des conversations** gardé dans le navigateur, reprise en un clic.
- **Passages cités** sous chaque réponse : un clic montre les extraits exacts utilisés.
- **Révision espacée** : chaque question de quiz ratée revient le lendemain, puis à
  3 jours, 1 semaine, 2 semaines et 1 mois (page `/revisions`, pastille « à revoir »).
- **Markdown** : listes numérotées et listes à plusieurs lignes correctement affichées.

### 2.7 Discussion avec l'IA

- **Indicateur de réflexion animé** : emblème animé et statut qui évolue
  (« Réflexion en cours… », recherche, exécution des outils, « Génération de la
  réponse… »).
- **Barre d'outils sous chaque réponse** : Copier (« Copié ! »), 👍 / 👎 avec motif,
  Régénérer avec versions consultables.
- **Édition des questions** : crayon sous chaque message envoyé, réécriture en place
  et relance.

Détails en § 6.

### 2.8 Application installable et performance

- **PWA complète** : `manifest.json`, service worker, proposition d'installation
  « Installer l'application Nunya » / « Plus tard » qui déclenche l'invite native,
  bandeau « Hors ligne » (détails en § 8).
- Pages secondaires chargées à la demande : code chargé au démarrage réduit de 17 %.

## 3. Technologies et dépendances

| Domaine | Choix |
|---|---|
| Interface | **React 19** et **TypeScript** (mode strict) |
| Navigation | **React Router 7** ; pages secondaires chargées à la demande (`React.lazy`) |
| Outillage | **Vite 8** (serveur de développement, relais vers l'API, build) |
| Styles | CSS natif organisé en jetons de design, sans framework |
| Polices | Inter et Inter Tight (Google Fonts) |
| PWA | `manifest.json` et service worker écrits à la main (`public/sw.js`), sans dépendance |
| Tests | Test de rendu sous **jsdom** (`scripts/smoke.mjs`) ; audit **axe-core** et parcours Playwright (hors dépôt) |
| Déploiement | Servi par FastAPI (même origine) ou par **Vercel** (`vercel.json`) |

Dépendances déclarées dans `package.json` (versions minimales) :

| Paquet | Version | Type | Rôle |
|---|---|---|---|
| `react`, `react-dom` | ^19.3.1 | exécution | Bibliothèque d'interface |
| `react-router-dom` | ^7.18.4 | exécution | Routes et navigation |
| `vite` | ^8.3.5 | développement | Serveur, relais vers l'API, build |
| `@vitejs/plugin-react` | ^6.1.2 | développement | JSX et rechargement à chaud |
| `typescript` | ^7.0.2 | développement | Vérification des types |
| `@types/react`, `@types/react-dom` | ^19.3.0 | développement | Types de React |
| `jsdom` | ^30.1.3 | développement | Test de rendu sans navigateur |

Volontairement **aucune** bibliothèque d'interface, d'état global, de requêtes ou
d'icônes : l'état vit dans quatre contextes React, les requêtes passent par
`fetch`, les icônes sont dessinées en SVG dans `Icon.tsx`.

## 4. Démarrage rapide

Prérequis : **Node.js 22** ou plus récent, et le backend Nunya (FastAPI) qui tourne
sur `http://127.0.0.1:8000`.

```bash
cd frontend
npm install                 # ou « npm ci » pour respecter exactement package-lock.json
cp .env.example .env        # facultatif : voir § 7.2

npm run dev                 # http://localhost:5173 (l'API est relayée vers le backend)
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement avec rechargement instantané |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Version de production dans `dist/` (vérifie aussi les types) |
| `npm run preview` | Sert `dist/` sur `http://localhost:4173` (pour tester la PWA) |
| `npm run build:smoke` puis `npm run smoke -- /atelier` | Test de rendu d'une route sans navigateur |
| `npm run verifier` | Enchaîne types, build et test de rendu |

## 5. Architecture du code

### 5.1 Arborescence

```
frontend/
├─ index.html                 point d'entrée : thème appliqué avant affichage, polices, manifeste
├─ vite.config.ts             relais de développement vers l'API, build
├─ vercel.json                hébergement Vercel : réécritures et en-têtes (cache, sw.js)
├─ .env.example               variables d'environnement documentées
├─ public/                    fichiers servis tels quels, à la racine du site
│  ├─ manifest.json           manifeste de l'application installable
│  ├─ sw.js                   service worker : coquille hors ligne et carnet en cache
│  ├─ favicon.svg             emblème (s'adapte au thème du navigateur)
│  ├─ icons/                  icônes 192, 512, « maskable », Apple, favicon PNG
│  ├─ screenshots/            captures montrées dans la fenêtre d'installation
│  └─ brand/                  emblème Nunya en SVG
├─ src/
│  ├─ main.tsx                montage de l'application, démarrage de la PWA
│  ├─ App.tsx                 fournisseurs de contexte, routes, bandeaux globaux
│  ├─ components/             éléments partagés
│  │  ├─ Brand.tsx            emblème et nom (logo vectoriel)
│  │  ├─ ChampMotDePasse.tsx  champ mot de passe avec bouton « œil »
│  │  ├─ AppShell.tsx         barre du haut, menu mobile, pied de page
│  │  ├─ SiteFooter.tsx       footer, liens juridiques, formulaire de contact
│  │  ├─ CookieConsent.tsx    bandeau cookies
│  │  ├─ InstallPrompt.tsx    proposition d'installation de l'application
│  │  ├─ OfflineBanner.tsx    bandeau « hors ligne »
│  │  ├─ RequireAuth.tsx      garde des pages réservées aux comptes
│  │  ├─ Modal.tsx, Markdown.tsx, Icon.tsx, PageLoader.tsx, StatusPill.tsx…
│  │  └─ workspace/           volets de l'atelier
│  │     ├─ SourcesPane.tsx         documents : dépôt, sélection, suppression
│  │     ├─ ChatPane.tsx            discussion : messages, saisie, modes, historique
│  │     ├─ MessageUtilisateur.tsx  question envoyée, crayon « Modifier »
│  │     ├─ IndicateurReflexion.tsx état de chargement pendant la réponse
│  │     ├─ ActionsMessage.tsx      copier, avis, régénérer, versions
│  │     └─ AtelierPane.tsx         résumé, quiz, ajout au carnet
│  ├─ pages/                  une page par route (voir § 1)
│  ├─ context/                état partagé (voir § 5.2)
│  ├─ hooks/                  useFocusTrap (focus clavier), useRevision (révisions dues)
│  ├─ lib/                    logique sans affichage
│  │  ├─ api.ts               client HTTP : toutes les routes du backend
│  │  ├─ types.ts             types partagés avec l'API
│  │  ├─ pwa.ts               service worker et invite d'installation
│  │  ├─ conversations.ts     historique local des conversations
│  │  ├─ revision.ts          révision espacée (boîtes de Leitner)
│  │  ├─ passages.ts          lecture des passages cités par l'agent
│  │  ├─ avis.ts              avis sur les réponses, copie dans le presse-papiers
│  │  └─ export.ts, contact.ts, stockage.ts, format.ts
│  ├─ content/                documentation intégrée en Markdown
│  │  └─ legal/               confidentialité, conditions d'utilisation, à propos
│  └─ styles/
│     ├─ tokens.css           couleurs, typographie, espacements, thèmes clair et sombre
│     ├─ base.css             remise à zéro, typographie, animations
│     ├─ app.css              composants (boutons, champs, barre, bandeaux…)
│     ├─ pages.css            pages (atelier, discussion, carnet, réglages, révisions…)
│     └─ landing.css          page d'accueil
├─ scripts/smoke.mjs          test de rendu sous jsdom
├─ integration-backend/       code Python à ajouter au backend, avec ses tests
└─ docs/
   ├─ INTEGRATION_BACKEND.md  routes à ajouter côté serveur (code complet)
   ├─ HISTORIQUE.md           journal de la refonte et des évolutions
   └─ images/                 logo pour la documentation
```

### 5.2 Circulation des données

```
pages et composants ──► contextes React ──► lib/api.ts ──► fetch + cookie de session ──► FastAPI
         ▲                     │
         └──── affichage ◄─────┘            lib/stockage.ts ──► localStorage (préférences, historique…)
```

| Contexte | Rôle |
|---|---|
| `ThemeProvider` | Thème clair / sombre / système, appliqué sur `<html data-theme>` |
| `ToastProvider` | Notifications (`push(titre, { message, tone })`) |
| `AuthProvider` | Compte connecté (`GET /auth/me`), connexion, inscription, déconnexion, suppression du compte |
| `AppDataProvider` | Session de discussion, documents, sélection, carnet, état du service |

- **Un seul point d'accès au réseau** : `src/lib/api.ts`. Chaque route y a sa
  fonction ; les erreurs deviennent des `ApiError` avec le `detail` renvoyé par
  FastAPI, et `routeAbsente(erreur)` reconnaît une route pas encore déployée.
- **Pages protégées** : `RequireAuth` redirige vers `/connexion` sans session.
- **Atelier** : `pages/Workspace.tsx` tient la discussion (envoyer, régénérer,
  modifier une question, changer de version) et la transmet aux volets.
- **Styles** : uniquement des jetons (`var(--accent)`, `var(--r-md)`…) ; changer
  une couleur dans `tokens.css` suffit à la changer partout, dans les deux thèmes.

### 5.3 Données gardées dans le navigateur

| Clé | Contenu |
|---|---|
| `nunya.theme`, `nunya.mode`, `nunya.session` | Thème, mode de réponse, conversation en cours |
| `nunya.cookies` | Choix sur le bandeau cookies (12 mois) |
| `nunya.conversations.<compte>`, `nunya.conv.<compte>.<id>` | 30 dernières conversations |
| `nunya.revision.<compte>` | Questions à revoir, réussite par notion |
| `nunya.avis.<compte>` | Avis 👍 / 👎 sur les réponses |
| `nunya.installation` | « Plus tard » sur la proposition d'installation (7 jours) |
| Caches `nunya-v2-*` | Coquille de l'application, carnet hors ligne, polices |

Historique, révisions et avis s'effacent depuis Réglages, Mes données, et à la
suppression du compte.

## 6. Interface de discussion

La discussion se trouve dans l'atelier (`components/workspace/ChatPane.tsx`). Elle
envoie la question à `POST /chat` avec les documents cochés et le mode de réponse
choisi (Standard, Tuteur socratique, Réflexion, Précis).

### 6.1 Pendant que l'agent répond

`IndicateurReflexion.tsx` affiche :

- l'**emblème Nunya animé** (rayons qui tournent et pulsent, plume qui oscille,
  halo doré) ;
- un **statut textuel** qui évolue, avec un reflet qui défile :
  « Réflexion en cours… », « Recherche dans tes documents… », puis l'exécution des
  outils adaptée à la demande (« Rédaction du résumé à partir des passages… »,
  « Préparation des questions du quiz… », « Lecture et tri des passages trouvés… »),
  et enfin « Génération de la réponse… » ;
- une **frise d'étapes** (Réflexion, Recherche, Exécution des outils, Génération) qui
  se coche au fil de l'attente, avec le temps écoulé ;
- des **lignes fantômes** à l'emplacement de la réponse.

Le statut est annoncé aux lecteurs d'écran (`role="status"`).

> `POST /chat` répond en une seule fois : les étapes sont **estimées** d'après la
> durée écoulée et la nature de la demande. Pour afficher les étapes **réelles**, le
> backend peut diffuser des événements ; le composant accepte déjà une prop
> `etapeReelle` (voir [intégration backend, § 7](docs/INTEGRATION_BACKEND.md#7-avis-sur-les-réponses-et-régénération)).

### 6.2 Sous chaque réponse

`ActionsMessage.tsx` ajoute une barre d'outils discrète :

| Action | Effet | Côté serveur |
|---|---|---|
| **Copier** | Copie le texte de la réponse (Markdown) ; le bouton affiche « Copié ! » | Rien |
| **👍 / 👎** | Note la réponse utile ou inutile ; après 👎, motif facultatif (Inexact, Hors sujet, Incomplet, Peu clair). Re-cliquer annule | `POST /chat/feedback` (à ajouter) ; en attendant, l'avis reste dans le navigateur |
| **Régénérer** | Repose la même question pour une autre réponse. Chaque réponse est gardée : flèches « ‹ 1/2 › » | Rien : réutilise `POST /chat` |

« Régénérer » apparaît sous la dernière réponse, et sous une réponse en erreur pour
réessayer. Si la régénération échoue, la réponse précédente est conservée.

### 6.3 Modifier une question envoyée

`MessageUtilisateur.tsx` ajoute un **crayon** discret sous chaque message de
l'utilisateur (visible au survol ou au clavier, toujours visible sur écran tactile) :

1. Un clic transforme la bulle en **champ de texte** prérempli, curseur en fin de texte.
2. **Entrée** (ou « Relancer ») envoie la question réécrite ; **Maj+Entrée** va à la
   ligne ; **Échap** (ou « Annuler ») referme sans rien changer.
3. La discussion est coupée juste avant l'ancienne question, puis la nouvelle repart
   par le chemin d'envoi habituel : indicateur de réflexion, réponse, historique.
4. Si d'autres échanges suivaient, un avertissement prévient qu'ils seront remplacés.

Le crayon est désactivé pendant qu'une réponse est en cours. Aucune route nouvelle
n'est nécessaire (voir la note sur la mémoire de l'agent dans
[l'intégration backend, § 7](docs/INTEGRATION_BACKEND.md#modifier-une-question-déjà-envoyée)).

### 6.4 Autour de la discussion

- **Sources citées** sous chaque réponse : un clic montre les extraits exacts utilisés.
- **Historique** : les conversations sont gardées dans le navigateur et peuvent être
  reprises (bouton « Historique »).
- **Révisions** : les questions de quiz ratées reviennent sur la page `/revisions`.

## 7. Connecter l'interface au backend

### 7.1 Trois façons de déployer

| Mode | Interface | API | Réglage |
|---|---|---|---|
| **Développement** | `npm run dev` sur `:5173` | FastAPI sur `:8000` | Rien : Vite relaie les routes de l'API (`VITE_DEV_API_TARGET` si le backend est ailleurs) |
| **Tout-en-un** (recommandé) | `dist/` servi par FastAPI | Même serveur, même origine | Rien : `VITE_API_BASE_URL` reste vide |
| **Séparé** | Vercel, Netlify… | Autre domaine | `VITE_API_BASE_URL=https://api.exemple.tg` + CORS et cookies côté backend (§ 7.4) |

### 7.2 Variables d'environnement de l'interface

Fichier `.env` à la racine de `frontend/` (voir `.env.example`). Les variables
`VITE_*` sont **intégrées au moment du build** : après une modification, relancer
`npm run build`.

| Variable | Rôle | Exemple / défaut |
|---|---|---|
| `VITE_API_BASE_URL` | URL de l'API, sans `/` final. Vide = même origine que l'interface | vide · `https://api.nunya.tg` |
| `VITE_DEV_API_TARGET` | Backend utilisé par le relais de `npm run dev` | `http://127.0.0.1:8000` |
| `VITE_CONTACT_ENDPOINT` | Route qui reçoit le formulaire de contact (`POST` JSON `{email, message, page}`) | vide · `/contact` |
| `VITE_CONTACT_EMAIL` | À défaut de route : le formulaire ouvre la messagerie vers cette adresse (affichée aussi dans les pages juridiques) | vide |
| `VITE_EDITEUR_NOM` | Exploitant de l'instance, cité dans les pages juridiques | « l'équipe Nunya » |
| `VITE_HEBERGEUR_NOM` | Hébergeur, cité dans la politique de confidentialité | « L'hébergeur du serveur » |

### 7.3 Routes de l'API utilisées par l'interface

Toutes les requêtes passent par `src/lib/api.ts`, avec le cookie de session
(`credentials: "include"`). Les erreurs sont lues dans le champ `detail` (format FastAPI).

| Méthode | Route | Usage | État côté backend |
|---|---|---|---|
| `GET` | `/health` | Badge d'état (`rag`, `llm`) | Existe |
| `POST` | `/auth/register`, `/auth/login`, `/auth/logout` | Compte et session | Existe |
| `GET` | `/auth/me` | Profil, vérification de session | Existe |
| `GET`, `POST`, `DELETE` | `/sources`, `/sources/{id}` | Documents | Existe |
| `POST` | `/chat` | Question, régénération, question modifiée | Existe (passages cités : [doc § 6](docs/INTEGRATION_BACKEND.md#6-passages-cités-dans-la-réponse)) |
| `GET` | `/agent/modes` | Modes de réponse | Existe |
| `GET`, `POST` | `/artifacts`, `/artifacts/{fichier}` | Carnet | Existe |
| `DELETE` | `/auth/me` | Supprimer son compte | **À ajouter** |
| `GET` | `/auth/me/export` | Exporter ses données | **À ajouter** |
| `POST` | `/auth/password/forgot`, `/auth/password/reset` | Mot de passe oublié | **À ajouter** |
| `POST` | `/contact` | Formulaire du footer | **À ajouter** (ou service externe) |
| `POST` | `/chat/feedback` | Avis 👍 / 👎 sous les réponses | **À ajouter** (sinon gardé localement) |
| `POST` | `/chat/stream` | Étapes réelles pendant la réponse | Option (voir doc § 7) |

Les routes « à ajouter » sont fournies, testées, dans
[`docs/INTEGRATION_BACKEND.md`](docs/INTEGRATION_BACKEND.md) et
[`integration-backend/`](integration-backend). Tant qu'elles n'existent pas,
l'interface le détecte et affiche un message clair au lieu d'échouer.

### 7.4 Si l'interface et l'API sont sur deux domaines

L'interface envoie le cookie `nunya_session` avec chaque requête. Pour qu'il
traverse les domaines, le backend doit :

1. **Autoriser l'origine de l'interface avec identifiants** (jamais `*`) :

   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://nunya.vercel.app"],     # l'adresse exacte de l'interface
       allow_credentials=True,
       allow_methods=["GET", "POST", "DELETE"],
       allow_headers=["Content-Type", "Accept"],
   )
   ```

2. **Poser le cookie de session en `SameSite=None; Secure`** si les deux domaines
   sont différents (`nunya.vercel.app` et `api.nunya.tg`). Avec deux sous-domaines
   d'un même domaine (`app.nunya.tg` et `api.nunya.tg`), `SameSite=Lax` suffit.
3. Être servi en **HTTPS** (obligatoire pour `Secure` et pour la PWA).

Puis, côté interface : `VITE_API_BASE_URL=https://api.nunya.tg` et `npm run build`.
Le service worker reçoit cette adresse automatiquement pour la mise en cache du carnet.

### 7.5 Si FastAPI sert l'interface

1. `npm run build`, puis servir `frontend/dist/` comme fichiers statiques.
2. Déclarer les routes de l'API **avant** le montage des fichiers statiques et le
   repli vers `index.html` (sinon une route d'API inconnue renvoie la page HTML).
3. Servir à la racine `sw.js` (sans cache) et `manifest.json` :

   ```python
   from fastapi.responses import FileResponse

   @app.get("/sw.js", include_in_schema=False)
   def service_worker():
       return FileResponse(DIST / "sw.js", media_type="text/javascript",
                           headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"})

   @app.get("/manifest.json", include_in_schema=False)
   def manifeste():
       return FileResponse(DIST / "manifest.json", media_type="application/manifest+json")
   ```

4. Pour toute route de l'interface (`/atelier`, `/carnet`, `/reinitialiser`…),
   renvoyer `index.html` : c'est une application monopage.

### 7.6 Vérifier le couplage en 2 minutes

```bash
curl -i http://127.0.0.1:8000/health          # 200 et {"status": "ok", "rag": …, "llm": …}
npm run dev                                    # puis ouvrir http://localhost:5173
```

Dans l'interface : le badge en haut à droite doit afficher **Prêt**, puis
l'inscription doit ouvrir l'atelier. « Serveur injoignable » signifie que l'API ne
répond pas à l'adresse configurée.

### 7.7 Liste de contrôle du couplage

- [x] Toutes les routes existantes du backend sont utilisées telles quelles : connexion,
      documents, discussion, carnet, modes, état du service.
- [x] Régénération et modification des questions réutilisent `POST /chat` : aucune
      route nouvelle.
- [x] Une seule variable décide où se trouve l'API (`VITE_API_BASE_URL`) ; en
      développement, le relais de Vite couvre toutes les routes (`/auth`, `/agent`,
      `/chat`, `/sources`, `/artifacts`, `/health`, `/translate`, `/contact`, `/conversations`).
- [x] Les fonctions qui attendent une route encore absente le détectent (`404`/`405`)
      et l'indiquent proprement : rien ne casse si le backend n'est pas encore à jour.
- [ ] Côté backend : ajouter les routes de
      [`docs/INTEGRATION_BACKEND.md`](docs/INTEGRATION_BACKEND.md) (compte, mot de passe,
      contact, avis, passages cités), avec les tests fournis.
- [ ] Interface et API sur deux domaines : CORS avec identifiants et cookie
      `SameSite=None; Secure` (§ 7.4).
- [ ] Production : HTTPS, `sw.js` et `manifest.json` servis à la racine (§ 7.5).

## 8. Application installable (PWA)

### 8.1 Ce qui est en place

- `public/manifest.json` : nom **Nunya**, icônes 192 et 512 px (classiques et
  « maskable »), couleur de thème `#134a6e`, ouverture sur l'atelier, raccourcis
  Atelier, Carnet et Révisions, captures d'écran pour la fenêtre d'installation.
- `public/sw.js` : la coquille de l'application s'ouvre sans réseau ; le profil, la
  liste des documents et le carnet déjà consultés restent lisibles hors ligne. Les
  questions, dépôts et exports passent toujours par le réseau. Les données en cache
  sont effacées à la connexion, à la déconnexion et à la suppression du compte.
- **Proposition d'installation** (`components/InstallPrompt.tsx`) : après le choix
  sur les cookies, une fenêtre discrète propose « Installer l'application Nunya ».
  **Installer** ouvre l'invite native du navigateur ; **Plus tard** la fait taire
  7 jours. Sur iPhone et iPad, elle indique le geste « Partager, puis Sur l'écran
  d'accueil ».
- Réglages, Apparence : bouton **Installer** permanent, ou « Installée ».

### 8.2 Tester l'installation

Le service worker n'est actif que dans la version de production, et l'installation
exige HTTPS ou `localhost`.

```bash
npm run build
npm run preview        # http://localhost:4173
```

1. Ouvrir `http://localhost:4173` dans **Chrome** ou **Edge** (fenêtre normale, pas
   en navigation privée).
2. Accepter le bandeau cookies : la proposition « Installer l'application Nunya »
   apparaît après un court instant. Cliquer sur **Installer**, puis confirmer.
3. Nunya s'ouvre dans sa propre fenêtre, avec son icône dans le menu des
   applications (ou sur l'écran d'accueil sur Android).
4. **Hors ligne** : DevTools, onglet *Application*, *Service workers*, cocher
   *Offline*, puis recharger : l'interface s'affiche avec le bandeau « Hors ligne ».
5. **Vérifier le manifeste** : DevTools, *Application*, *Manifest* : aucune erreur,
   icônes et captures visibles.

Pour faire réapparaître la proposition après « Plus tard » : DevTools, *Application*,
*Local storage*, supprimer la clé `nunya.installation`.

> Après une nouvelle version, le service worker se met à jour au chargement suivant.
> Si un ancien affichage persiste pendant les tests : DevTools, *Application*,
> *Service workers*, *Unregister*, puis recharger.

## 9. Identité visuelle

<p>
  <img src="public/brand/nunya-embleme.svg" alt="Emblème Nunya" width="96" align="right">
</p>

**L'emblème** se compose **uniquement** du livre ouvert, de la plume et des rayons de
lumière, en trois couleurs : bleu académique, or et vert émeraude.

- **Le livre ouvert** : l'apprentissage et la transmission du savoir.
- **La plume** : l'écriture, l'effort d'apprendre et la création.
- **Le soleil** : la lumière de la compréhension, l'esprit qui s'éveille et l'avenir.

« Nunya » veut dire « savoir, sagesse » en éwé. L'emblème est dessiné en vecteur
dans `src/components/Brand.tsx` (et `public/brand/nunya-embleme.svg`) pour rester net
à toutes les tailles ; ses couleurs passent par des jetons et s'éclaircissent en
thème sombre.

| Jeton | Couleur | Usage |
|---|---|---|
| `--logo-bleu` | `#134a6e` | Pages du livre, bec de la plume, nom « Nunya » |
| `--logo-or` | `#e5a612` | Rayons du soleil, une page du livre |
| `--logo-vert` | `#0f8a63` | Vert émeraude : corps de la plume |
| `--logo-vert-fonce` | `#0a6648` | Vert émeraude foncé : relief de la plume |
| `--accent` | `#1d58d6` | Actions de l'interface (boutons, liens, focus) |

**Le nom « Nunya »** accompagne l'emblème : à côté sur ordinateur (avec
« Atelier d'apprentissage »), **juste en dessous sur mobile**. Dans le code, la marque
s'utilise toujours via le composant :

```tsx
import { Brand, Mark } from "./components/Brand";

<Brand />                 // emblème + nom (le nom passe sous l'emblème sur mobile)
<Mark size={40} />        // emblème seul (décoratif)
<Mark titre="Nunya" />    // emblème seul, annoncé aux lecteurs d'écran
```

Fichiers prêts à l'emploi : `public/brand/nunya-embleme.svg` (emblème seul),
`docs/images/nunya-logo.png` (emblème et nom), icônes dans `public/icons/`.

## 10. Qualité et tests

```bash
npm run verifier                                  # types + build + test de rendu de l'accueil
npm run build:smoke && npm run smoke -- /reglages # n'importe quelle route
SMOKE_ANONYME=1 npm run smoke -- /atelier         # sans compte : redirection vers /connexion

cd integration-backend && python -m pytest -q     # routes backend fournies (FastAPI)
```

Dernières vérifications :

- 0 erreur TypeScript, build de production réussi, test de rendu réussi sur les 14 routes ;
- 0 violation axe-core (WCAG 2.1 AA) sur les pages en thème clair et sombre, y compris
  l'inscription avec l'œil du mot de passe et la discussion avec une question en édition ;
- parcours testés dans Chromium à 1280 et 390 px : œil du mot de passe (bascule,
  saisie conservée), copier, avis, régénérer et versions, modification et relance
  d'une question (coupure de la suite, historique enregistré, Échap) ;
- manifeste et service worker validés par Chrome (aucune erreur d'installabilité) ;
- tests backend : `10 passed`.

## 11. Documentation complémentaire

- [`docs/INTEGRATION_BACKEND.md`](docs/INTEGRATION_BACKEND.md) : routes à ajouter
  au backend (suppression de compte, export, mot de passe oublié, mémoire de l'agent,
  contact, passages cités, avis, édition des questions), code complet, tables SQL,
  tests et liste de contrôle avant la mise en production.
- [`docs/HISTORIQUE.md`](docs/HISTORIQUE.md) : journal de la refonte, étape par étape.
- Documentation utilisateur : intégrée à l'application, page `/documentation`.
