# Frontend Nunya — documentation technique

Interface web de l'atelier : sources, discussion, atelier, carnet, réglages et
documentation utilisateur. Ce document s'adresse à qui reprend le code ; le mode
d'emploi visible par l'apprenant est la page `/aide` de l'application.

---

## 1. Stack et partis pris

| Choix | Décision | Pourquoi |
|---|---|---|
| Framework | React 19 + TypeScript | Demande explicite ; typage strict sur les données d'API |
| Build | Vite 8 | Démarrage instantané, proxy de dev vers FastAPI |
| Routage | React Router 7 (`BrowserRouter`) | Routes réelles, URLs partageables |
| Styles | CSS écrit à la main, variables CSS | Aucune dépendance UI, identité Nunya conservée (pas de look « template ») |
| Icônes | SVG maison, 24×24, trait 1,6 px | Cohérence de trait, aucun emoji utilisé comme icône |
| État | Contexts React (`Theme`, `Toast`, `AppData`) | Trois providers suffisent ; pas de store externe |
| Markdown | Parseur maison (~150 lignes) | Les réponses contiennent des tableaux ; éviter une dépendance de 40 Ko |
| Tests | `tsc --noEmit` + smoke jsdom | Vérifie le rendu réel du bundle sans navigateur |

Bundle de production : **322 Ko JS (99 Ko gzip)**, **29 Ko CSS (6 Ko gzip)**.

---

## 2. Structure

```
frontend/
├── index.html              # thème appliqué avant peinture (pas de flash)
├── vite.config.ts          # proxy /chat /sources /artifacts /translate /health
├── scripts/smoke.mjs       # rendu du bundle dans jsdom
├── public/favicon.svg      # favicon Nunya
└── src/
    ├── main.tsx            # point d'entrée, ordre des feuilles de style
    ├── App.tsx             # providers + routes
    ├── styles/
    │   ├── tokens.css      # palette, typo, espacements, thèmes clair/sombre
    │   ├── base.css        # reset, focus, animations, utilitaires
    │   ├── app.css         # boutons, champs, cartes, topbar, modales, toasts
    │   └── pages.css       # accueil, atelier 3 volets, carnet, réglages, aide
    ├── context/
    │   ├── ThemeProvider.tsx
    │   ├── ToastProvider.tsx
    │   └── AppDataProvider.tsx   # session, sources, artefacts, santé du moteur
    ├── lib/
    │   ├── api.ts          # client HTTP typé + erreurs lisibles
    │   ├── types.ts        # miroir de backend/app/schemas.py
    │   └── format.ts       # dates, tailles, identifiants, titres
    ├── components/
    │   ├── AppShell.tsx    # barre supérieure, navigation, bascule de thème
    │   ├── Brand.tsx       # marque Nunyati
    │   ├── Icon.tsx        # jeu d'icônes
    │   ├── ArtifactGlyph.tsx  # formes des artefacts (charte §5)
    │   ├── Markdown.tsx
    │   ├── Modal.tsx
    │   ├── StatusPill.tsx  # état réel du moteur (RAG / LLM)
    │   └── workspace/
    │       ├── SourcesPane.tsx
    │       ├── ChatPane.tsx
    │       └── AtelierPane.tsx
    └── pages/
        ├── Landing.tsx  Auth.tsx  Workspace.tsx
        ├── Carnet.tsx  Settings.tsx  Help.tsx  NotFound.tsx
```

---

## 3. Design system

Hérité de `Charte_visuel/nunya-etude-graphique.md` : rien n'a été réinventé.

- **Palette** : craie (`#EFEAE1`), ardoise (`#1B2A2E`), terre de barre
  (`#A6472E`, accent), indigo (`#2B4357`, information), vert mil (`#5C6B4F`,
  succès), ochre et rouge pour les états.
- **Règle d'accent** : la terre de barre ne sert qu'à l'action principale et à
  l'état actif. Le reste est neutre — c'est ce qui garde l'interface sobre.
- **Typographie** : Fraunces (titres, accents éditoriaux), Work Sans (interface,
  corps de texte), JetBrains Mono (identifiants, traces d'outils). Piles de
  secours déclarées si les polices distantes ne chargent pas.
- **Thèmes** : clair, sombre, système. Le thème est appliqué dans `index.html`
  avant la première peinture pour éviter le flash.
- **Formes** : panneaux 22 px, boutons en pilule, champs 12 px — conformes à la
  charte « interface fluide ».
- **Mouvement** : transitions de 120 à 320 ms, une seule animation d'entrée
  (fade-up). `prefers-reduced-motion` désactive tout.

---

## 4. Routes

| Route | Page | Rôle |
|---|---|---|
| `/` | Landing | Présentation, preuve visuelle, entrée dans l'atelier |
| `/connexion` | Auth | Connexion / inscription (visuel), session locale |
| `/atelier` | Workspace | Trois volets : Sources, Discussion, Atelier |
| `/carnet` | Carnet | Artefacts explicitement enregistrés, filtres, ouverture |
| `/reglages` | Settings | Thème, langue, session, documents, moteur, à propos |
| `/aide` | Help | Mode d'emploi, limites connues, dépannage |
| `*` | NotFound | 404 |

---

## 5. Données et contrat d'API

`AppDataProvider` centralise ce que plusieurs pages partagent :

- `sessionId` (localStorage `nunya.session`), `nouvelleSession()`
- `sources`, `deposerFichiers()`, `retirerSource()`, `selection`
- `artefacts`, `enregistrerArtefact()`
- `sante` (interrogée toutes les 12 s tant que le RAG n'est pas prêt, puis 60 s)

Endpoints consommés (aucun autre) :

| Méthode | Route | Usage |
|---|---|---|
| GET | `/health` | badge « Prêt / Moteur en préparation / LLM absent » |
| GET | `/agent/modes` | catalogue des modes de réponse (libellé, description) |
| GET | `/sources` | liste des documents |
| POST | `/sources` | dépôt multipart, renvoie `chunks` |
| DELETE | `/sources/{id}` | retrait du document **et** de son index |
| POST | `/chat` | question → réponse + `steps` + artefacts vides (+ `mode`) |
| GET | `/artifacts?session_id=` | carnet |
| POST | `/artifacts` | enregistrement explicite (résumé ou quiz) |

**Invariant respecté par l'interface** : aucun appel à `POST /artifacts` n'est
déclenché autrement que par un clic sur « Ajouter au Carnet ». L'Atelier affiche
un rappel « Rien n'est enregistré tant que tu ne cliques pas ».

---

## 6. Accessibilité

- Lien d'évitement « Aller au contenu », focus visible conservé partout.
- Zones cliquables non-boutons (lignes de sources) : `role="button"`,
  `tabIndex=0`, activation par Entrée/Espace, `aria-pressed`.
- Toasts en `role="status"` + `aria-live="polite"`.
- Modale : `aria-modal`, fermeture par Échap, focus initial.
- Contrastes : texte principal sur fond craie/panneau ≥ 7:1 ; accents réservés
  aux éléments porteurs de sens.
- Aucune information ne repose sur la couleur seule (les formes d'artefacts
  diffèrent par leur géométrie).

---

## 7. Développement

```powershell
# terminal 1 — backend
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# terminal 2 — interface
cd frontend
npm install
npm run dev          # http://localhost:5173, proxy vers :8000
```

Vérifications avant livraison :

```powershell
npm run typecheck                                  # tsc --noEmit
npm run build                                      # produit dist/
npm run build:smoke                                # bundle IIFE pour jsdom
npm run smoke -- /atelier                          # rendu réel, page par page
npm run smoke -- /carnet ; npm run smoke -- /aide
```

Le smoke test exécute le bundle compilé dans jsdom et échoue si la page est
vide ou si une exception est levée au montage. Il ne juge pas la mise en page.

Le build est servi par FastAPI : `backend/app/main.py` monte `frontend/dist`
(`/assets`) et renvoie `index.html` pour toute route inconnue, avec repli sur
`Charte_visuel/nunya-maquette.html` si `dist/` n'existe pas.

---

## 8. Conventions

- Français pour les noms de variables d'interface et les commentaires ;
  anglais conservé pour les noms d'API (`summary`, `quiz`, `source_ids`).
- Aucun composant ne parle directement à `fetch` : tout passe par `lib/api.ts`.
- Les états sont explicites : `loading`, `ready`, `error` — pas de `undefined`
  ambigu à l'écran.
- Un composant = un fichier ; au-delà de ~250 lignes, découper.

---

## 9. Limites assumées de cette version

- **Pas d'authentification réelle** : la page de connexion l'annonce et propose
  une session locale. Le backend n'expose pas encore de comptes.
- **Pas de persistance de l'historique de discussion** : le composant garde les
  messages en mémoire ; un rechargement les efface (les artefacts et sources
  persistent).
- **Outils non branchés** (graphique, fiche bilingue, export) : visibles,
  désactivés, avec explication. Aucune simulation.
- **Pas de contrôle visuel automatisé** : le smoke test jsdom attrape les crashs
  de rendu, pas les défauts de mise en page.
