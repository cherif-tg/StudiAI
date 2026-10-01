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

**Ce qui est déjà écrit** : la configuration, les schémas d'API, le journal
SQLite, le pipeline RAG, la traduction, le bac à sable d'exécution de graphiques,
et les 7 outils de l'agent (recherche RAG, résumé, quiz, traduction, graphique,
export de document, recherche web).

**Ce qui reste à écrire** : la boucle d'orchestration elle-même
(`app/agent/orchestrator.py`, squelette déjà commenté), les routes API
`/chat`, `/sources`, `/tools/*`, et l'interface web à trois volets. C'est la
suite logique une fois que l'organisation et la stack sont validées.

## 2. Technologies par brique

| Brique | Technologie retenue | Statut |
|---|---|---|
| API | FastAPI + Uvicorn | Squelette en place |
| Agent (function calling) | Groq (Llama 3.3), via le SDK `groq` | Client écrit, boucle à écrire |
| RAG | ChromaDB (persistant) + sentence-transformers multilingue | Service écrit |
| Traduction locale | tg_nlp_toolkit (NLLB-200 + LoRA), en local ou via un service distant (ton HF Space) | Service écrit, à brancher sur ton modèle |
| Génération de documents | `python-docx` (Word), `reportlab` (PDF) | Outil écrit |
| Génération de graphiques | `matplotlib`, exécuté en sous-processus encadré | Outil écrit |
| Génération de quiz | Sortie JSON structurée validée par Pydantic | Outil écrit |
| Recherche web | API Tavily (optionnelle) | Outil écrit |
| Stockage | SQLite (journal, artefacts) + fichiers sur disque | Écrit |
| Frontend | à définir (React conseillé pour les 3 volets synchronisés) | Non commencé |
| Conteneurisation | Docker + docker-compose | Fichiers fournis |
| LLM local (dev) | Ollama | Intégration légère, voir §3 |

## 3. Où Ollama s'intègre (et où il ne s'intègre pas)

Tu as déjà des modèles en local via Ollama sous Windows/WSL — c'est utile, mais pas
au même endroit que Groq :

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

## 4. Démarrage sans Docker (dev rapide)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\activate sous Windows
pip install -r requirements.txt -r requirements-rag.txt
cp ../.env.example ../.env   # puis renseigner GROQ_API_KEY
uvicorn app.main:app --reload
```

`GET http://localhost:8000/health` doit répondre `{"status": "ok"}`.

## 5. Prochaines étapes suggérées

1. Écrire `app/agent/orchestrator.py` (squelette déjà détaillé dans le fichier).
2. Écrire les routes `app/api/chat.py` et `app/api/sources.py`.
3. Brancher `translation.py` sur le modèle réel de tg_nlp_toolkit (mode `local` ou `remote`).
4. Démarrer l'interface web (volet Sources d'abord, le plus simple).
