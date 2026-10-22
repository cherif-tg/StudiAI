# Frontend Nunya — documentation technique

Interface de l'atelier : accueil, comptes, atelier à trois volets, carnet,
révisions, réglages, documentation intégrée et pages légales. Le mode d'emploi
visible par l'apprenant est la page `/documentation` de l'application.

---

## 1. Stack et partis pris

| Choix | Décision | Pourquoi |
|---|---|---|
| Framework | React 19 + TypeScript strict | Typage des données d'API de bout en bout |
| Build | Vite 8 | Démarrage instantané, relais de dev vers FastAPI |
| Routage | React Router 7, `React.lazy` sur les pages secondaires | Code chargé au démarrage réduit |
| Styles | CSS natif en jetons de design | Aucune dépendance d'interface, identité maîtrisée |
| Polices | Inter et Inter Tight | Couvrent l'alphabet éwé (Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ) |
| PWA | `manifest.json` + service worker écrits à la main | Installable, carnet consultable hors ligne |
| État | Quatre contextes React | Pas de store externe |
| Markdown | Parseur maison | Les réponses contiennent des tableaux |
| Tests | Rendu sous jsdom (`scripts/smoke.mjs`) | Attrape les crashs sans navigateur |

Bundle : ~362 Ko JS (112 Ko gzip) pour l'entrée, ~95 Ko CSS, pages secondaires
chargées à la demande.

---

## 2. Structure

```
frontend/
├── index.html              thème appliqué avant peinture, polices, manifeste
├── vite.config.ts          relais /chat /sources /artifacts /translate /health /agent
├── vercel.json             réécriture SPA, cache des assets, sw.js non caché
├── .env.example            VITE_API_BASE_URL, VITE_CONTACT_*, VITE_EDITEUR_NOM…
├── public/                 manifeste, service worker, icônes, emblème, captures
├── scripts/smoke.mjs       rendu du bundle dans jsdom
└── src/
    ├── main.tsx            montage, démarrage du service worker
    ├── App.tsx             fournisseurs, routes, bandeaux globaux
    ├── components/         AppShell, SiteFooter, CookieConsent, InstallPrompt,
    │                       OfflineBanner, ChampMotDePasse, RequireAuth, workspace/
    ├── pages/              Landing, Auth, Workspace, Carnet, Revisions,
    │                       Settings, Documentation, Legal, MotDePasse, 404
    ├── context/            Theme, Toast, Auth, AppData
    ├── hooks/              useFocusTrap, useRevision
    ├── lib/                api, types, pwa, conversations, revision, passages,
    │                       avis, export, contact, stockage, format
    ├── content/            documentation intégrée et pages légales (Markdown)
    └── styles/             tokens, base, app, pages, landing
```

---

## 3. Design system — refonte « Académie »

Le repère visuel est bleu académique / or / émeraude, inspiré des standards
edtech (Coursera, Khan Academy, edX, Moodle 4). Les anciens jetons terre de
barre / craie restent en alias pour les composants qui les référencent encore.

| Rôle | Clair | Sombre |
|---|---|---|
| Bleu académique (actions, liens, focus) | `#1d58d6` | `#6b9bff` |
| Or (distinction, sur-titres, révisions) | `#d99a16` | `#f0b73a` |
| Vert émeraude (réussite, « Indexé ») | `#057a5c` | `#3fcf9e` |
| Fond / panneau | `#f5f7fb` / `#ffffff` | `#0b1322` / `#121c2e` |
| Texte / atténué | `#111c2e` / `#5a6578` | `#e8edf5` / `#9aa6b9` |

- **Thème clair par défaut**, même si le système est en sombre ; « Sombre » et
  « Système » restent au choix dans les Réglages. Appliqué dans `index.html`
  avant la première peinture.
- **Coins de 4 à 14 px**, plus aucune forme « pilule ».
- **Mouvement** : 120 à 280 ms, coupé si `prefers-reduced-motion`.
- **Un seul accent fort par zone**, beaucoup d'air.

Les jetons sont dans `src/styles/tokens.css` : c'est le seul endroit à modifier
pour changer une couleur ou une police.

---

## 4. Routes

Voir le tableau du `README.md` (§2). Toutes les pages qui touchent des données
personnelles sont sous `RequireAuth`, qui redirige vers `/connexion` en conservant
la destination.

---

## 5. Données et API

`AppDataProvider` centralise sources, artefacts et santé du moteur ;
`AuthProvider` porte la session. Les appels passent tous par `src/lib/api.ts`.

| Méthode | Route | Usage |
|---|---|---|
| GET | `/health` | badge « Prêt / Moteur en préparation / LLM absent » |
| GET | `/agent/modes` | catalogue des modes de réponse |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | comptes |
| GET | `/auth/me` | profil courant |
| DELETE | `/auth/me` | suppression du compte (mot de passe requis) |
| GET | `/auth/me/export` | archive ZIP : profil, documents, carnet |
| POST | `/auth/password/forgot`, `/auth/password/reset` | mot de passe oublié |
| GET/POST/DELETE | `/sources`, `/sources/{id}` | documents |
| POST | `/chat` | question → réponse + `steps` (dont `passages`) |
| POST | `/chat/feedback` | avis utile / inutile sous une réponse |
| GET/POST | `/artifacts`, `/artifacts/{fichier}` | carnet |
| POST | `/contact` | formulaire du pied de page |

**Invariant respecté par l'interface** : aucun appel à `POST /artifacts` en dehors
du clic sur « Ajouter au Carnet ». Un résumé ou un quiz affiché n'est jamais
enregistré tout seul.

**Historique des conversations** : gardé dans le navigateur
(`lib/conversations.ts`), pas côté serveur. La mémoire de l'agent, elle, vit en
mémoire du processus et repart à vide au redémarrage.

---

## 6. Accessibilité et PWA

- Lien d'évitement, focus visible, focus piégé et restitué dans les fenêtres et le
  menu mobile, titres hiérarchisés, annonces pour lecteurs d'écran.
- Contrastes visés : WCAG 2.1 AA (4,5:1 pour le texte).
- Cibles tactiles de 40 à 44 px, champs en 16 px (pas de zoom sur iPhone), zones
  sûres des écrans à encoche.
- Service worker : coquille hors ligne et carnet en cache ; bandeau « Hors ligne ».
- Bandeau cookies avec choix mémorisé 12 mois, réouvrable depuis le pied de page.

---

## 7. Développement

```powershell
# terminal 1 — API
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# terminal 2 — interface
cd frontend
npm ci
npm run dev          # http://localhost:5173, relais vers :8000
```

Vérifications avant livraison :

```powershell
npm run typecheck     # tsc --noEmit
npm run build         # dist/
npm run build:smoke   # bundle IIFE pour jsdom
npm run smoke -- /atelier
npm run verifier      # les trois d'un coup
```

Le build est servi par FastAPI (`frontend/dist` monté sur `/`), avec repli sur
`Charte_visuel/nunya-maquette.html` puis sur une page d'information si aucun
build n'existe.

Variables utiles (`frontend/.env`) : `VITE_API_BASE_URL` (vide en même origine),
`VITE_CONTACT_ENDPOINT` ou `VITE_CONTACT_EMAIL`, `VITE_EDITEUR_NOM`,
`VITE_HEBERGEUR_NOM` (pages légales).

---

## 8. Conventions

- Français pour le domaine et l'affichage, anglais pour les noms d'API.
- Aucune bibliothèque d'interface ; une couleur vient de `tokens.css`, jamais
  d'un code hexadécimal dans un composant.
- Pas de `fetch` hors de `lib/api.ts`.
- Chaque écran gère quatre états : chargement, vide, erreur, rempli.
- Une page = un fichier dans `pages/` ; au-delà de ~250 lignes, découper.

---

## 9. Limites connues

- Pas de contrôle visuel automatisé : le test jsdom attrape les crashs de rendu,
  pas les défauts de mise en page.
- L'historique des conversations ne suit pas d'un appareil à l'autre.
- Les révisions espacées sont calculées dans le navigateur (perdues si le stockage
  local est effacé).
- Les pages légales doivent être relues par un juriste avant une mise en ligne
  publique.
