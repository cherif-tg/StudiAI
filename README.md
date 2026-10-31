<p align="center">
  <img src="docs/images/nunya-logo.png" alt="Nunya, atelier d'apprentissage" width="360">
</p>

# Nunya

Atelier d'apprentissage documentaire né au Togo. On dépose ses cours (PDF, Word),
on pose des questions, et l'agent répond **uniquement à partir de ces documents**,
en citant ses sources. Il produit aussi des résumés et des quiz, que l'on garde
dans un carnet et que l'on révise au bon moment.

L'interface est une **application web progressive (PWA)** : elle s'installe sur un
téléphone ou un ordinateur et garde le carnet consultable hors ligne.

> Le dépôt s'appelle encore `StudiAI` sur GitHub ; le produit s'appelle **Nunya**
> (« connaissance, sagesse » en éwé).

---

## 1. Ce que fait l'application

- **Déposer** des PDF et des Word (tableaux inclus), indexés par un modèle
  multilingue qui tourne sur le serveur.
- **Interroger** ses documents : recherche vectorielle, réponse rédigée à partir
  des passages trouvés, refus explicite hors corpus.
- **Voir les sources** : passages cités sous chaque réponse, outils réellement
  appelés, avis (👍/👎) pour signaler une réponse douteuse.
- **Produire** un résumé ou un quiz, avec une trace des outils utilisés.
- **Choisir un mode** : standard, tuteur socratique, réflexion, précis.
- **Réviser** : chaque question ratée revient selon un calendrier espacé
  (1 jour, 3 jours, 1 semaine, 2 semaines, 1 mois).
- **Un compte** : documents et carnet isolés, accessibles d'un appareil à l'autre,
  export de ses données et suppression du compte.

## 2. Pages et routes

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
| Confidentialité, conditions, à propos | `/confidentialite`, `/conditions`, `/a-propos` | Public |

## 3. Stack

| Brique | Choix |
|---|---|
| API | FastAPI + Uvicorn (Python 3.12/3.13) |
| Agent | Boucle function calling, Groq (`openai/gpt-oss-120b`) |
| Recherche | ChromaDB + `sentence-transformers` multilingue |
| Données | SQLite (comptes, sources, artefacts, avis) + fichiers sur disque |
| Interface | React 19 + TypeScript strict + Vite 8, CSS natif (aucune bibliothèque d'UI) |
| PWA | `manifest.json` et service worker écrits à la main |
| Déploiement | Interface statique (Vercel) + API conteneurisée |

## 4. Démarrage rapide

```powershell
# 1. Dépendances Python (venv à la racine)
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt

# 2. Configuration serveur
Copy-Item .env.example .env        # renseigner GROQ_API_KEY

# 3. Interface
cd frontend
npm ci
npm run build
cd ..

# 4. Lancer
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

<http://127.0.0.1:8000/> — le badge passe à « Prêt » quand le moteur est chargé
(quelques secondes à plusieurs minutes selon la machine).

En développement, l'interface se lance à part avec rechargement à chaud :
`cd frontend; npm run dev` (port 5173, relais vers l'API sur 8000).

Autres entrées : `scripts\demarrer.ps1`, `scripts\arreter.ps1`,
`scripts\tunnel.ps1` (publication temporaire), `docker compose up --build`
(conteneur unique, interface incluse).

## 5. Structure

```
backend/app/     api/ agent/ tools/ services/ integration/   (FastAPI, agent, RAG, SQLite)
backend/tests/   tests rapides, recettes RAG et agent
frontend/        React + Vite (src/pages, src/components, src/styles, src/content)
  public/        manifeste, service worker, icônes, emblème
docs/            plan, recette, documentation technique, historique, intégration backend
deploy/          fichiers de déploiement (Space Hugging Face)
scripts/         démarrage, arrêt, tunnel, publication
data/            état local : uploads, artefacts, Chroma, journal.db (non versionné)
```

## 6. Configuration

Variables du serveur (`.env`, voir `.env.example`) :

| Variable | Rôle |
|---|---|
| `GROQ_API_KEY` | Clé du fournisseur de modèle (obligatoire pour répondre) |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules |
| `COOKIE_SAMESITE` | `lax` (même domaine) ou `none` (interface et API séparées) |
| `APP_PUBLIC_URL` | Adresse publique, pour le lien de réinitialisation |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS` | Envoi d'e-mails. Sans `SMTP_HOST`, le message est écrit dans le journal (développement) |
| `CONTACT_DESTINATAIRE` | Adresse qui reçoit le formulaire de contact |
| `MAX_UPLOAD_MB`, `MAX_STORAGE_MB`, `CHAT_RATE_LIMIT`, `CHAT_RATE_WINDOW_S` | Garde-fous d'exposition publique |

Variables de l'interface (`frontend/.env`, voir `frontend/.env.example`) :
`VITE_API_BASE_URL`, `VITE_CONTACT_ENDPOINT`, `VITE_CONTACT_EMAIL`,
`VITE_EDITEUR_NOM`, `VITE_HEBERGEUR_NOM`.

## 7. Tests

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q --timeout=90 tests
```

49 tests, sans réseau ni clé : boucle de l'agent, extraction DOCX, authentification,
isolation entre comptes, garde-fous, droits sur les données, contact et avis.

Côté interface : `cd frontend; npm run verifier` (types, build, rendu sous jsdom).
Les détails et les recettes sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 8. Documentation

| Document | Contenu |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | **À lire en premier** : état du code, architecture, conventions, workflow |
| [`docs/ETAT_DU_PROJET.md`](docs/ETAT_DU_PROJET.md) | Où en est le projet, décisions prises, ce qui reste |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Interface : pages, composants, design system, PWA, contrat d'API |
| [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) | Tunnel, Vercel, hébergeurs, cookies et CORS |
| [`docs/INTEGRATION_BACKEND.md`](docs/INTEGRATION_BACKEND.md) | Routes ajoutées pour l'interface, et leur code |
| [`docs/HISTORIQUE.md`](docs/HISTORIQUE.md) | Journal de la refonte de l'interface |
| [`docs/RECETTE_MVP.md`](docs/RECETTE_MVP.md) | Mesures réelles : tests, RAG, agent, performances |
| [`docs/PLAN_REALISATION_MVP_v2.md`](docs/PLAN_REALISATION_MVP_v2.md) | Plan d'exécution, sprints et portes de sortie |
| `docs/Nunya_Cahier_des_charges_MVP.docx` | Périmètre fonctionnel du MVP |

La documentation destinée aux utilisateurs est intégrée à l'application :
`/documentation`.

## 9. État du projet

Fonctionnent de bout en bout : comptes, dépôt et indexation, chat sourcé, résumé,
quiz, carnet, révisions, export et suppression du compte, contact, avis.

Ne sont pas encore branchés, et l'interface le dit : traduction éwé, fiche
bilingue, export PDF/Word, graphiques. Voir `docs/ETAT_DU_PROJET.md`.

## 10. Contribuer

Les règles sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md) : conventions, tests à
lancer, ce qu'on ne commite jamais.

## 11. Correctifs du 31 octobre 2026

| Problème | Solution | Fichiers |
|---|---|---|
| Une simple question produisait une carte « résumé », et une question hors du cours (ex. les index) recevait un résumé inventé | Règles de l'agent : une question reçoit une réponse citée dans le chat ; résumé et quiz seulement sur demande explicite. L'outil de résumé refuse un sujet absent des documents | `agent/orchestrator.py`, `tools/summarize.py` |
| Erreur 500 : requêtes trop grosses pour la limite Groq gratuite (8 000 tokens/min) | Historique allégé (4 échanges, sans résultats d'outils, échange raté non mémorisé), 5 passages max par recherche, réponse plafonnée, message clair (503) au lieu d'une erreur 500 | `agent/orchestrator.py`, `tools/rag_search.py`, `services/llm.py` |
| Réponses très lentes | Plus d'attente automatique du client Groq (jusqu'à 2 × 60 s) en cas de saturation, réflexion du modèle en effort faible, 2 recherches max par question | `services/llm.py`, `agent/orchestrator.py` |
| « WHERE et HAVING » déclaré absent alors que le cours le traite | Nettoyage des PDF extraits « un mot par ligne », recherche par mots-clés en complément de la recherche par le sens, règle hors-corpus assouplie | `services/documents.py`, `services/rag.py`, `agent/orchestrator.py` |
| Impossible de supprimer un artefact du carnet | Route `DELETE /artifacts/{id}` (contrôle du propriétaire, fichier effacé) et bouton « Supprimer » avec confirmation dans le Carnet | `api/artifacts.py`, `frontend/src/pages/Carnet.tsx`, `lib/api.ts`, `context/AppDataProvider.tsx` |
| Bandeau cookies sans refus | Bouton « Refuser » (choix mémorisé 12 mois, seul le cookie de session reste actif) | `frontend/src/components/CookieConsent.tsx` |
| Page d'accueil | Section « Après le MVP » en trois blocs, bandes colorées retirées des cartes, textes de « Nos limites » reformulés | `frontend/src/pages/Landing.tsx`, `styles/landing.css` |

À savoir :

- **Redéposer les documents déjà indexés** pour profiter du nettoyage des PDF.
- La limite gratuite de Groq reste juste pour un agent qui enchaîne plusieurs appels : laisser
  environ une minute entre deux questions, ou passer au palier payant (Dev Tier).
- Après une modification de l'interface : `cd frontend; npm run build`, puis Ctrl+F5.

## Licence

[MIT](LICENSE.md).
