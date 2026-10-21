# StudiAI — agent éducatif (backend)

Nom de marque provisoire, en attente d'un nom en Éwé (voir le Cahier des charges v2).

## 1. Organisation du dossier de travail

```
edu-agent/
├── backend/
│   ├── app/
│   │   ├── main.py            # point d'entrée FastAPI (minimal pour l'instant)
│   │   ├── config.py          # réglages (.env), un seul endroit à modifier
│   │   ├── schemas.py         # modèles Pydantic partagés par l'API
│   │   ├── api/                # routes HTTP — seule /health existe pour l'instant
│   │   │   └── health.py
│   │   ├── agent/               # boucle d'orchestration de l'agent — À ÉCRIRE
│   │   │   └── orchestrator.py  # squelette documenté (function calling / ReAct)
│   │   ├── tools/               # un fichier = un outil appelable par l'agent
│   │   │   ├── rag_search.py, summarize.py, quiz.py,
│   │   │   ├── translate.py, chart.py, export_doc.py, web_search.py
│   │   │   └── registry.py      # liste des outils actifs
│   │   └── services/            # briques techniques réutilisées par les outils
│   │       ├── rag.py           # ChromaDB + sentence-transformers
│   │       ├── translation.py   # NLLB local ou service distant (tg_nlp_toolkit)
│   │       ├── llm.py           # client Groq (function calling)
│   │       ├── ollama_client.py # client Ollama local (usage ponctuel, voir §3)
│   │       ├── sandbox.py       # exécution encadrée des scripts de graphiques
│   │       ├── documents.py     # extraction PDF/DOCX + découpage en passages
│   │       ├── journal.py       # SQLite : sources, artefacts (Carnet), traçabilité
│   │       └── container.py     # assemble tous les services (injection de dépendances)
│   ├── tests/
│   ├── requirements.txt            # cœur (FastAPI, Groq, export PDF/DOCX...)
│   ├── requirements-rag.txt        # ChromaDB + sentence-transformers (lourd, séparé)
│   ├── requirements-translation.txt # torch + transformers + peft (si mode local)
│   ├── requirements-dev.txt
│   └── Dockerfile
├── frontend/                    # interface web à trois volets — pas encore commencée
│   └── src/components/
├── data/
│   ├── uploads/                 # documents déposés par les apprenants
│   ├── artifacts/                # fichiers générés (PDF, DOCX, PNG, JSON de quiz)
│   └── chroma/                   # base vectorielle persistante
├── docs/                         # cahiers des charges, étude de faisabilité
├── docker-compose.yml            # backend + Ollama local (voir §3)
├── .env.example
└── .gitignore
```

**Ce qui est écrit** : la configuration, les schémas d'API, le journal SQLite,
le pipeline RAG, les services de traduction, le bac à sable d'exécution, les 7
outils de l'agent, **la boucle d'orchestration** (`app/agent/orchestrator.py`),
**les routes** `/chat`, `/sources`, `/artifacts`, `/translate`, `/health`, et la
**maquette d'interface branchée sur l'API réelle** (servie à la racine `/`).

**Ce qui reste à faire avant de parler de MVP livré** : prouver la chaîne sur de
vrais documents (ingestion + recherche RAG, réponses ancrées avec Groq), écrire
les tests, retirer les données de démonstration de l'interface, et déployer. Le
détail jour par jour est dans `docs/PLAN_REALISATION_MVP_v2.md`.

**Périmètre MVP actif** (voir `docs/Nunya_Cahier_des_charges_MVP.docx`) : chat,
sources, résumé, quiz, persistance à la demande. Les outils `chart`, `translate`,
`export_doc` et `web_search` restent dans le dépôt mais ne sont pas exposés à
l'agent pour cette itération.

## 2. Technologies par brique

| Brique | Technologie retenue | Statut |
|---|---|---|
| API | FastAPI + Uvicorn | Squelette en place |
| Agent (function calling) | Groq (`openai/gpt-oss-120b`), via le SDK `groq` | Boucle écrite, validée avec une vraie clé |
| RAG | ChromaDB (persistant) + sentence-transformers multilingue | Service écrit |
| Traduction locale | tg_nlp_toolkit (NLLB-200 + LoRA), en local ou via un service distant (ton HF Space) | Service écrit, à brancher sur ton modèle |
| Génération de documents | `python-docx` (Word), `reportlab` (PDF) | Outil écrit |
| Génération de graphiques | `matplotlib`, exécuté en sous-processus encadré | Outil écrit |
| Génération de quiz | Sortie JSON structurée validée par Pydantic | Outil écrit |
| Recherche web | API Tavily (optionnelle) | Outil écrit |
| Stockage | SQLite (journal, artefacts) + fichiers sur disque | Écrit |
| Frontend | React 19 + TypeScript + Vite, servi par FastAPI (`frontend/dist`) | Écrit, build et rendu vérifiés — voir `docs/FRONTEND.md` |
| Conteneurisation | Docker + docker-compose | Fichiers fournis |
| LLM local (dev) | Ollama | Intégration légère, voir §3 |



- **Groq reste le moteur de l'agent** (boucle `function calling` dans
  `orchestrator.py`). Le support des appels d'outils est inégal d'un modèle
  Ollama à l'autre, et une boucle agent qui échoue à appeler un outil de façon
  fiable casse toute la démonstration. Ce n'est pas un choix de coût, c'est un
  choix de fiabilité pour le hackathon.
- **Ollama sert pour le reste** : tester un prompt hors-ligne, pré-valider un
  résumé sans consommer de quota Groq, travailler dans le RER/en coupure
  réseau. Le client `app/services/ollama_client.py` est prêt pour ces usages
  ponctuels (pas de function calling, juste un prompt → une réponse).

Pour lancer la stack avec Docker (backend + Ollama) :

```bash
docker compose up --build
```

Le `docker-compose.yml` contient en commentaire comment monter directement ton
dossier `.ollama/models` existant (`C:\Users\Ce PC\.ollama\models`) pour ne pas
retélécharger tes modèles dans le conteneur — adapte le chemin selon que tu
lances `docker compose` depuis Docker Desktop (Windows) ou un terminal WSL.
**Cette partie est resrever au machines un peu robuste reter dans la stack groq pour effectuer les taches**

## 4. Démarrage sans Docker (dev rapide, uv)

Le venv est géré avec [uv](https://docs.astral.sh/uv/) à la racine du projet :

```powershell
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt
Copy-Item .env.example .env       # puis renseigner GROQ_API_KEY
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

`GET http://localhost:8000/health` doit répondre `{"status": "ok"}`, et
`http://localhost:8000/` sert l'interface.

> Le venv racine tourne en Python 3.13 ; l'image Docker épingle 3.12. Si
> l'installation du RAG (`torch`, `chromadb`) échoue en 3.13, créer le venv avec
> `uv venv --python 3.12 .venv` pour retrouver la parité avec le conteneur.

## 5. Prochaines étapes

Le plan d'exécution à jour est `docs/PLAN_REALISATION_MVP_v2.md` (révisé le
20/10/2026) : quatre sprints, avec pour chacun une porte de sortie vérifiable.

1. **Prouver le RAG** sur de vrais PDF/DOCX (ingestion, recherche, suppression).
2. **Prouver la boucle agent** avec une vraie clé Groq, dont le refus de répondre
   hors corpus.
3. **Écrire les tests** (dont un test de la boucle avec un faux client LLM).
4. **Retirer les données de démonstration** de la maquette et brancher les états
   d'erreur.
5. **Déployer** et enregistrer une démo de secours.
