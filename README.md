# Nunya

Atelier d'apprentissage documentaire. Tu déposes tes cours, tu poses des
questions, et l'agent répond **uniquement** à partir de tes documents — avec la
source. Résumés et quiz se génèrent à la demande, et ne sont conservés que si tu
le demandes.

> Le dépôt s'appelle encore `StudiAI` sur GitHub ; le produit s'appelle **Nunya**
> (« connaissance, sagesse » en éwé). Le renommage du dépôt viendra plus tard.

---

## Ce que ça fait

- **Déposer** des PDF et des Word (tableaux inclus), indexés par un modèle
  multilingue local.
- **Interroger** ses documents : recherche vectorielle, réponse rédigée à partir
  des passages trouvés, refus explicite hors corpus.
- **Produire** un résumé ou un quiz, avec une trace des outils réellement appelés.
- **Choisir un mode** : standard, tuteur socratique, réflexion, précis.
- **Garder** ce qui compte dans un carnet personnel — jamais automatiquement.
- **Un compte** : documents et carnet isolés, accessibles d'un appareil à l'autre.

Ce qui n'est **pas** branché et qui le dit dans l'interface : traduction éwé,
fiche bilingue, export PDF/Word, graphiques. Voir `docs/ETAT_DU_PROJET.md`.

---

## Stack

| Brique | Choix |
|---|---|
| API | FastAPI + Uvicorn (Python 3.12/3.13) |
| Agent | Boucle function calling, Groq (`openai/gpt-oss-120b`) |
| Recherche | ChromaDB + `sentence-transformers` multilingue |
| Données | SQLite (comptes, sources, artefacts) + fichiers sur disque |
| Interface | React 19 + TypeScript + Vite, CSS maison (aucune lib d'UI) |
| Déploiement | Interface statique (Vercel) + API conteneurisée |

---

## Démarrage rapide

```powershell
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt
Copy-Item .env.example .env        # renseigner GROQ_API_KEY
cd frontend; npm ci; npm run build; cd ..
cd backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

<http://127.0.0.1:8000/> — le badge passe à « Prêt » quand le moteur est chargé
(quelques secondes à plusieurs minutes selon la machine).

Les scripts `scripts\demarrer.ps1`, `scripts\arreter.ps1` et
`scripts\tunnel.ps1` couvrent le lancement, l'arrêt et la publication temporaire.

---

## Structure

```
backend/app/     api/ agent/ tools/ services/   (FastAPI, agent, RAG, SQLite)
backend/tests/   tests rapides, recettes RAG et agent
frontend/        React + Vite (src/pages, src/components, src/styles, src/content)
docs/            plan, recette, documentation technique, état du projet
deploy/          fichiers de déploiement (Space Hugging Face)
scripts/         démarrage, arrêt, tunnel, publication
data/            état local : uploads, artefacts, Chroma, journal.db (non versionné)
```

---

## Documentation

| Document | Contenu |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | **À lire en premier** : état du code, architecture, conventions, workflow |
| [`docs/ETAT_DU_PROJET.md`](docs/ETAT_DU_PROJET.md) | Où en est le projet, décisions prises, ce qui reste |
| [`docs/PLAN_REALISATION_MVP_v2.md`](docs/PLAN_REALISATION_MVP_v2.md) | Plan d'exécution, sprints et portes de sortie |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Stack, structure, design system, contrat d'API |
| [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) | Tunnel, Vercel, hébergeurs, cookies et CORS |
| [`docs/RECETTE_MVP.md`](docs/RECETTE_MVP.md) | Mesures réelles : tests, RAG, agent, performances |
| `docs/Nunya_Cahier_des_charges_MVP.docx` | Périmètre fonctionnel du MVP |

La documentation destinée aux utilisateurs est intégrée à l'application :
`/documentation`.

---

## Contribuer

Les règles sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md) : conventions, tests à
lancer, ce qu'on ne commite jamais.

## Licence

[MIT](LICENSE.md).
