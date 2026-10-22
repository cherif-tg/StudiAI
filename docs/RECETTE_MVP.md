# Recette du MVP — résultats d'exécution

> Exécutée les 20 et 21 octobre 2026 sur la machine de développement (Windows,
> Python 3.13.2, venv `uv`). Ce document consigne ce qui a réellement été
> exécuté, avec les chiffres observés. Ce qui n'a pas été testé est listé en §5 :
> ne pas lire cette page comme une validation de l'ensemble du produit.

Environnement :

| Élément | Version / valeur |
|---|---|
| Python | 3.13.2 (venv `.venv` créé avec `uv`) |
| LLM | Groq `openai/gpt-oss-120b` (function calling vérifié) |
| Embeddings | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| Base vectorielle | chromadb 1.5.9 |
| Torch | 2.14.1 (CPU) |

---

## 1. Tests automatisés (`pytest`)

Commande :

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q tests\test_documents.py tests\test_orchestrator.py tests\test_api.py
```

Résultat : **19 tests passés, 0 échec** (13,9 s).

| Fichier | Ce qui est verrouillé |
|---|---|
| `test_documents.py` | Extraction DOCX **avec les tableaux**, découpage, refus des formats inconnus |
| `test_orchestrator.py` | Boucle agent avec faux LLM : appel d'outil, réinjection du résultat, outil en échec, outil inconnu, borne `max_agent_steps`, journalisation, **aucun artefact créé** |
| `test_api.py` | `/health`, création/liste/service des artefacts, ordre chronologique, isolation par session, `503` sans clé LLM, `503` traduction désactivée, rejet et nettoyage d'un format non supporté, upload DOCX (ingestion simulée) |

Ces tests ne chargent ni torch ni le modèle : ils tournent en quelques secondes.

## 2. Recette RAG sur documents réels

Commande :

```powershell
cd backend
..\.venv\Scripts\python.exe -u tests\recette_rag.py
```

Documents : `Nunya_Cahier_des_charges_MVP.docx` (7 chunks),
`Etude_technique_faisabilite.docx` (17 chunks), un PDF de cours généré (1 chunk).

| Vérification | Résultat |
|---|---|
| 5 questions dont la réponse est dans les documents | **5/5** retrouvées dans les 5 meilleurs passages |
| Filtrage par `source_ids` | 1 seul hit, provenant du document demandé |
| Suppression d'une source | 0 chunk restant après `delete` |
| Ingestion du 1er document | 49,7 s (chargement du modèle inclus) |
| Ingestion suivante | 1,0 s |

## 3. Recette de la boucle agent (vrai LLM)

Commande :

```powershell
cd backend
..\.venv\Scripts\python.exe -u tests\recette_agent.py
```

Résultat : **0 échec**.

| Vérification | Résultat |
|---|---|
| 3 questions ancrées dans les sources | 3/3 correctes, outil `rag_search` appelé à chaque fois |
| Question hors corpus (« capitale de l'Australie ») | refus explicite : « les documents […] ne contiennent aucune information concernant… » |
| Artefacts créés sans action de l'apprenant | **0** |
| Événements journalisés en base | 3 (un par question) |

## 4. Parcours de bout en bout par HTTP (serveur réel)

Serveur : `uvicorn app.main:app`, puis appels HTTP réels.

| Étape | Résultat |
|---|---|
| `GET /health` | `{"status":"ok","rag":true,"llm":true}` |
| `POST /sources` ×2 | 7 et 17 chunks indexés |
| `GET /sources` | les 2 documents listés |
| `POST /chat` « résume les exigences de sécurité » | outil `summarize` appelé, résumé Markdown de 988 caractères |
| `POST /chat` « quiz de 3 questions » | outil `generate_quiz` appelé, 3 questions générées |
| `artifacts` renvoyés par `/chat` | **[]** dans les deux cas (invariant respecté) |
| `POST /artifacts` puis `GET /artifacts` | artefact créé, fichier servi à son URL, listé dans le Carnet |
| `GET /` (interface) | 29 642 caractères servis, états vides présents, **aucune donnée de démonstration** |

---

## 5. Ce qui n'a pas été vérifié

- **L'interface n'a pas été testée dans un navigateur.** Le navigateur intégré
  refuse `localhost` ; le parcours a été validé au niveau HTTP et en lisant le
  HTML servi, pas à l'œil. À faire : ouverture manuelle, clic sur « Nouvelle
  session », dépôt d'un fichier, question, quiz, « Ajouter au Carnet ».
- **Docker** : l'image n'a pas été construite.
- **Traduction éwé** : hors périmètre MVP, `TRANSLATION_MODE=disabled`, non testée.
- **Qualité pédagogique du quiz** : la validité du format est vérifiée, la
  pertinence des questions reste à relire par un humain.
- **Historique de conversation** : conservé en mémoire seulement ; un
  redémarrage du serveur le perd (les artefacts et sources, eux, persistent).

## 6. Point de performance à connaître avant la démo

Sur cette machine, **le premier chargement du RAG coûte de 50 s à 8 minutes**
(import de torch + modèle d'embedding), avec une forte variance. Les mesures
observées : 49,7 s, 80 s, 369 s, 455 s. La protection temps réel de Windows
Defender est active et scanne vraisemblablement les centaines de DLL à chaque
nouveau processus.

Conséquences pratiques :

- le serveur **préchauffe** le RAG au démarrage (`/health` renvoie `rag:false`
  tant que ce n'est pas fini) : démarrez-le plusieurs minutes avant la démo ;
- une fois chaud, une question coûte ~5 s et une ingestion ~1 s ;
- recommandation (droits administrateur requis) : ajouter le dossier du venv aux
  exclusions Defender, ou démontrer depuis le conteneur Docker (Linux, sans ce
  scan). Piste mesurée mais non appliquée ici.

## 7. Protocole de recette à rejouer avant une démonstration

```powershell
# 1. tests rapides
cd backend
..\.venv\Scripts\python.exe -m pytest -q tests\test_documents.py tests\test_orchestrator.py tests\test_api.py

# 2. RAG sur documents réels
..\.venv\Scripts\python.exe -u tests\recette_rag.py

# 3. agent avec le vrai LLM
..\.venv\Scripts\python.exe -u tests\recette_agent.py

# 4. interface
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# puis ouvrir http://127.0.0.1:8000/ et suivre le parcours du cahier des charges §3
```
