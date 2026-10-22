# Contribuer à Nunya

Merci de rejoindre le projet. Ce document dit **où en est le code**, **comment le
lancer**, et **comment travailler sans casser ce qui fonctionne**. Lis-le en
entier une fois : il évite les trois erreurs classiques — coder une fonctionnalité
déjà faite, modifier une brique qui n'est pas branchée, ou commiter un fichier
qui ne doit jamais l'être.

---

## 1. Le projet en trente secondes

Nunya est un atelier d'apprentissage documentaire : l'apprenant dépose ses cours
(PDF, Word), pose des questions, et un agent répond **uniquement** à partir des
passages trouvés dans ces documents. Il peut aussi produire un résumé ou un quiz,
que l'apprenant choisit — ou non — d'enregistrer dans son carnet.

Trois principes non négociables, qui expliquent la plupart des choix de code :

1. **Rien n'est inventé.** Une question hors corpus reçoit un refus explicite.
2. **Rien n'est enregistré sans geste.** Un artefact n'existe qu'après un clic sur
   « Ajouter au Carnet ». Ce n'est pas un réglage, c'est structurel : les outils
   de génération n'ont pas accès à l'écriture du carnet.
3. **Rien n'est simulé.** Une fonctionnalité non prête est désactivée et
   expliquée dans l'interface, jamais remplacée par de fausses données.

---

## 2. Où en est le code (à lire avant d'écrire une ligne)

| Domaine | État | Détail |
|---|---|---|
| Authentification | **Fonctionne** | Inscription, connexion, session cookie 30 jours, données isolées par compte |
| Dépôt de documents | **Fonctionne** | PDF, DOCX (tableaux inclus), TXT/MD ; indexation réelle |
| Recherche documentaire | **Fonctionne** | ChromaDB + embeddings multilingues ; filtrage par source |
| Chat avec outils | **Fonctionne** | Boucle function calling, 3 outils exposés |
| Résumé / Quiz | **Fonctionne** | Via l'agent, affichés dans l'Atelier, non persistés |
| Carnet | **Fonctionne** | Persistance à la demande, liste par compte, téléchargement protégé |
| Modes de réponse | **Fonctionne** | standard, socratique, réflexion, précis |
| Interface web | **Fonctionne** | Accueil, connexion, atelier 3 volets, carnet, réglages, documentation |
| Documentation intégrée | **Fonctionne** | `/documentation`, 7 sections, recherche |
| Traduction éwé | **Non branchée** | Service écrit, `TRANSLATION_MODE=disabled` |
| Fiche bilingue, export PDF/Word, graphiques | **Non branchés** | Boutons visibles, désactivés, avec explication |
| Comptes : réinitialisation de mot de passe | **Absent** | Aucun envoi d'e-mail |
| Historique de conversation | **Volatile** | En mémoire ; perdu au redémarrage |

Autrement dit : le cœur du produit est complet et testé. Ce qui reste touche aux
extensions (langues locales, exports) et à l'exploitation (déploiement).

---

## 3. Architecture

```
 Navigateur
     │  React 19 + TypeScript (Vite)
     ▼
 FastAPI  ──►  Agent (boucle function calling, 4 modes)
     │              │
     │              ├─► rag_search   (ChromaDB + sentence-transformers)
     │              ├─► summarize    (LLM, sans écriture)
     │              └─► generate_quiz(LLM, JSON validé par Pydantic)
     │
     ├─► SQLite (journal.db) : utilisateurs, sessions, sources, artefacts, traces
     ├─► data/uploads, data/artifacts : fichiers
     └─► Groq (API externe) : génération de texte
```

Cinq couches, à ne pas mélanger :

| Couche | Dossier | Règle |
|---|---|---|
| Routes HTTP | `backend/app/api/` | Valide l'entrée, vérifie le propriétaire, appelle un service. Aucune logique métier. |
| Agent | `backend/app/agent/` | Décide quels outils appeler. Ne connaît ni HTTP ni SQL. |
| Outils | `backend/app/tools/` | Une capacité = un fichier. Déclare son schéma JSON et `run()`. |
| Services | `backend/app/services/` | Briques techniques réutilisables (RAG, LLM, journal, documents). |
| Interface | `frontend/src/` | Parle uniquement à `lib/api.ts`, jamais `fetch` directement. |

**Le flux d'une question** : `POST /chat` → vérification du compte et des sources
→ `run_agent` → le modèle choisit `rag_search` → passages récupérés → réponse
rédigée → `steps` renvoyés à l'interface pour afficher la trace.

---

## 4. Où trouver quoi

| Fichier | Rôle |
|---|---|
| `backend/app/main.py` | Point d'entrée : routes, CORS, préchauffage, service de l'interface |
| `backend/app/config.py` | Tous les réglages (`.env`), un seul endroit à modifier |
| `backend/app/agent/orchestrator.py` | La boucle de l'agent |
| `backend/app/agent/modes.py` | Les 4 modes et leurs consignes |
| `backend/app/tools/registry.py` | Liste des outils réellement exposés |
| `backend/app/services/rag.py` | Ingestion, recherche, suppression |
| `backend/app/services/journal.py` | Schéma SQLite et toutes les requêtes |
| `backend/app/api/guards.py` | Limites de taille, de stockage, de débit |
| `frontend/src/lib/api.ts` | Client HTTP typé, seul point de sortie réseau |
| `frontend/src/styles/tokens.css` | Palette, typographie, espacements, thèmes |
| `frontend/src/content/` | Documentation publique (Markdown, intégrée à l'app) |
| `docs/` | Documents de référence du projet |
| `scripts/` | Démarrage, arrêt, tunnel, publication |

---

## 5. Mettre le projet en route

### Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| Python | 3.12 conseillé (3.13 fonctionne) | API et RAG |
| [uv](https://docs.astral.sh/uv/) | récent | Environnement virtuel rapide |
| Node.js | ≥ 22 | Construire l'interface |
| Docker | optionnel | Déploiement et reproduction |

Compte environ 3 Go de disque : dépendances, modèle d'embedding (~470 Mo) et
documents.

### Installation

```powershell
# 1. Dépendances Python, dans un venv à la racine
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt

# 2. Configuration
Copy-Item .env.example .env
#    puis renseigner GROQ_API_KEY (obligatoire pour les réponses)

# 3. Interface
cd frontend
npm ci
npm run build
cd ..
```

Sous Linux ou macOS, remplacer `.venv\Scripts\python.exe` par `.venv/bin/python`.

### Lancer

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Ouvrir <http://127.0.0.1:8000/>. Le badge en haut à droite passe de « Moteur en
préparation » à « Prêt » quand le modèle est chargé — **de quelques secondes à
plusieurs minutes** selon la machine.

Le premier lancement télécharge le modèle d'embedding. C'est un coût unique.

Alternative conteneurisée, interface incluse : `docker compose up --build`
(compte ~1,5 Go d'image et ~1 Go de RAM une fois le moteur chargé).

---

## 6. Boucle de travail

### Backend

`--reload` recharge le code à chaque sauvegarde. Attention : chaque rechargement
relance le processus, donc **recharge aussi le modèle** — c'est le prix d'un
développement confortable.

### Interface (rechargement à chaud)

```powershell
cd frontend
npm run dev      # http://localhost:5173, proxy vers :8000
```

Vite relaie `/chat`, `/sources`, `/artifacts`, `/translate`, `/health` et
`/agent/modes` vers l'API. Les cookies passent par le proxy : la session
fonctionne en développement.

Après une modification destinée à `http://127.0.0.1:8000`, reconstruire :
`npm run build`. Sinon l'ancien bundle reste servi.

### Tests

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q --timeout=90 tests/test_documents.py tests/test_orchestrator.py tests/test_api.py tests/test_guards.py tests/test_modes.py
```

37 tests, environ 20 secondes, **sans réseau et sans clé**. Ils couvrent la boucle
de l'agent (avec un faux client LLM), l'extraction DOCX, l'authentification,
l'isolation entre comptes et les garde-fous.

Tests d'intégration, à lancer quand on touche au RAG ou aux prompts :

```powershell
cd backend
..\.venv\Scripts\python.exe -u tests\recette_rag.py     # RAG sur documents réels
..\.venv\Scripts\python.exe -u tests\recette_agent.py   # agent + vrai LLM (consomme du quota)
$env:RUN_RAG_LIVE='1'; ..\.venv\Scripts\python.exe -m pytest -q tests\test_rag_live.py
```

### Vérifications de l'interface

```powershell
cd frontend
npm run typecheck
npm run build
npm run build:smoke
npm run smoke -- /atelier     # rendu réel du bundle dans jsdom
```

Le smoke test attrape les crashs de rendu (page blanche, provider manquant). Il
ne juge **pas** la mise en page : un coup d'œil humain reste nécessaire.

### Montrer le projet à quelqu'un

```powershell
.\scripts\demarrer.ps1            # local
.\scripts\demarrer.ps1 -Public    # + tunnel public éphémère
.\scripts\arreter.ps1             # tout arrêter
```

---

## 7. Conventions

### Langue

- **Français** pour les noms du domaine (variables d'interface, commentaires,
  libellés, messages d'erreur destinés à l'utilisateur).
- **Anglais** conservé pour les noms imposés par l'API et les bibliothèques
  (`summary`, `kind`, `source_ids`, `run`).
- Les messages d'erreur sont **destinés à être lus** : « Fichier trop volumineux :
  maximum 20 Mo », pas `ValueError: 413`.

### Backend

- Une route valide, délègue, et ne contient pas de logique métier.
- Toute route qui touche des données d'utilisateur déclare
  `Depends(utilisateur_requis)` ou `Depends(proprietaire)`.
- Un outil hérite de `Tool` et déclare `name`, `description`, `parameters`, `run`.
- Pas de dépendance nouvelle sans raison : chaque paquet ajouté pèse dans
  l'image et dans le temps de démarrage.

### Frontend

- **Aucune bibliothèque d'interface.** Le style vient de `tokens.css` ; un
  composant qui a besoin d'une couleur utilise une variable, jamais un code hex.
- Pas de `fetch` hors de `lib/api.ts`.
- Tout écran doit gérer quatre états : chargement, vide, erreur, rempli.
- Accessibilité : `aria-*` sur les composants interactifs, focus visible, cible
  cliquable réelle (pas un `div` sans `role`).

### Données

- `data/` n'est **jamais** commité : c'est l'état local (comptes, documents).
- Une migration de schéma se fait dans `Journal._migrer`, de façon idempotente —
  la base existante doit continuer à s'ouvrir.

---

## 8. Git

### Branches

- `main` : stable, déployable.
- Une branche par sujet : `feat/modes-agent`, `fix/cookie-cross-site`,
  `docs/contributing`. Les préfixes suivent le type de travail.

### Messages de commit

En français, à l'impératif, préfixés par la zone touchée :

```
backend: corriger l'extraction des tableaux DOCX
frontend: ajouter le sélecteur de mode
docs: documenter le déploiement séparé
deploy: publier l'image sur GHCR
```

Le corps explique **pourquoi**, pas seulement quoi. Un commit = un sujet.

### Ce qu'on ne commite jamais

`.env` (clés), `data/` (données réelles), `node_modules/`, `dist/`, `tools/`
(binaire cloudflared), `.zwork/`. Ces chemins sont déjà dans `.gitignore` : si tu
vois l'un d'eux dans `git status`, c'est un signal d'alarme.

### Pull request

Décrire : le problème, la solution, ce qui a été testé. Joindre une capture pour
tout changement visuel. Une PR qui touche l'agent ou le RAG doit dire quels tests
d'intégration ont été lancés.

---

## 9. Checklist avant de pousser

- [ ] `pytest` passe (37 tests)
- [ ] `npm run typecheck` sans erreur
- [ ] `npm run build` passe (l'interface se construit)
- [ ] Si l'interface change : `npm run build` puis vérification à l'écran
- [ ] Aucun fichier de `data/`, `.env` ou `dist/` dans le diff
- [ ] La documentation est à jour si le comportement change
      (`frontend/src/content/` pour l'utilisateur, `docs/` pour l'équipe)

---

## 10. Recettes

### Ajouter un mode de réponse

1. Ajouter une entrée dans `backend/app/agent/modes.py` (`label`, `description`,
   `consigne`).
2. Ajouter l'identifiant dans le `Literal AgentMode` de `backend/app/schemas.py`.
3. Ajouter un test dans `backend/tests/test_modes.py`.
4. Rien à faire côté interface : la liste vient de `GET /agent/modes`, avec un
   repli local dans `ChatPane.tsx` à mettre à jour pour rester cohérent.

### Ajouter un outil à l'agent

1. Créer `backend/app/tools/mon_outil.py` : hériter de `Tool`, déclarer `name`,
   `description`, `parameters` (JSON Schema) et `run(ctx, ...)`.
2. L'enregistrer dans `build_registry()` (`backend/app/tools/registry.py`).
3. Ajouter un test : outil appelé, résultat réinjecté dans la conversation.
4. Si l'outil modifie l'état, vérifier qu'il **n'écrit pas** dans le carnet.

### Ajouter une route

1. Créer `backend/app/api/mon_sujet.py` avec un `APIRouter`.
2. L'inclure dans `backend/app/main.py`.
3. Protéger avec `Depends(utilisateur_requis)` dès qu'il y a des données
   personnelles.
4. Tester le cas nominal, le cas non authentifié, et le cas « données d'un autre
   compte ».

### Ajouter une page

1. Créer `frontend/src/pages/MaPage.tsx`.
2. Déclarer la route dans `frontend/src/App.tsx` (sous `RequireAuth` si elle
   exige un compte).
3. Ajouter le lien dans `AppShell` si c'est une section principale.
4. Styles dans `frontend/src/styles/pages.css`, en réutilisant les variables.

---

## 11. Pièges connus

**Le démarrage est lent.** L'import de torch et le chargement du modèle coûtent
de quelques secondes à plusieurs minutes selon la machine — sur Windows,
l'antivirus qui analyse les bibliothèques peut multiplier ce temps. Le serveur
préchauffe en tâche de fond et `/health` expose `rag`. Ne tue pas le processus
pendant le chargement.

**Le modèle se télécharge une fois.** ~470 Mo dans `~/.cache/huggingface`. Sans
réseau au premier lancement, le RAG ne démarre pas.

**`data/` est l'état réel.** Supprimer ce dossier efface les comptes, les
documents indexés et les carnets. Ce n'est pas un cache.

**Le cookie ne suit pas entre deux domaines.** Interface sur Vercel + API
ailleurs : il faut `COOKIE_SAMESITE=none` côté serveur, et Safari peut refuser le
cookie tiers. La solution propre est un domaine commun (`app.` et `api.`).

**Les scripts PowerShell et les chemins courts.** Sur Windows, `$env:TEMP`
renvoie parfois `C:\Users\CEPC~1\…`, ce qui fait échouer les suppressions de
fichiers. Normaliser avec `(Get-Item $chemin).FullName` avant d'agir.

**Le port 8000 est peut-être occupé.** `Get-NetTCPConnection -LocalPort 8000`
pour identifier le coupable.

---

## 12. Poser une question

Ouvre une issue avec : ce que tu essayais de faire, la commande exacte, le
message d'erreur complet. Les journaux utiles sont la sortie d'uvicorn et, côté
interface, la console du navigateur.

Les documents de référence sont listés dans `README.md`. En cas de doute sur
l'état du projet, `docs/ETAT_DU_PROJET.md` fait foi ; les fichiers de
`docs/archive/` décrivent des versions antérieures et ne sont là que pour
l'historique.
