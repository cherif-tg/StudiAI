# Guide du projet — EduPath Togo

> Nom de marque provisoire, en attente d'un nom en langue Éwé (voir le Cahier
> des charges v2 dans `docs/`). On garde « EduPath Togo » partout en attendant.

Ce document est le point d'entrée pour toute personne qui rejoint le projet :
il explique ce qu'on construit, comment le dossier est organisé, où on en est
vraiment, et comment prendre la suite. Si tu ne dois lire qu'un seul fichier
avant de commencer, c'est celui-ci.

---

## 1. En une minute

Un agent éducatif qui ne se contente pas de répondre : il choisit lui-même
les bons outils (recherche dans les documents de l'apprenant, traduction en
langue locale, génération de résumés/quiz/graphiques/fichiers) pour
accompagner un apprenant togolais. Pensé pour fonctionner même avec une
connectivité limitée, et pour parler français **et** Éwé/Kabiyè.

Toutes les capacités de l'agent sont exposées par une **API**, pas enfermées
dans une seule interface : l'app web (trois volets Sources / Chat / Atelier,
inspirés de NotebookLM) en est le premier client, pas le seul possible.

Pour le détail complet des fonctionnalités et des choix de conception, voir
`docs/Cahier_des_charges_v2.docx` et `docs/Etude_technique_faisabilite.docx`.
Ce guide-ci ne répète pas ces documents : il explique comment s'orienter dans
le code et comment avancer.

---

## 2. Comment le dossier est organisé

```
edu-agent/
├── GUIDE_PROJET.md        ← toi, maintenant
├── README.md              ← installation technique (pas à pas pour lancer le projet)
├── docker-compose.yml     ← backend + Ollama local, pour le dev
├── docs/                  ← cahiers des charges, étude technique, présentation
├── data/                  ← généré automatiquement, jamais à modifier à la main
│   ├── uploads/             (documents déposés par les apprenants)
│   ├── artifacts/            (fichiers produits par l'agent : PDF, quiz, graphiques)
│   └── chroma/                (base vectorielle du RAG)
├── backend/
│   └── app/
│       ├── main.py        ← démarrage de l'API
│       ├── config.py      ← tous les réglages (clés API, modèles...) à un seul endroit
│       ├── schemas.py     ← la forme des données échangées par l'API
│       ├── api/           ← les routes HTTP (ce que l'extérieur peut appeler)
│       ├── agent/         ← le "cerveau" : décide quel outil utiliser et quand
│       ├── tools/         ← un fichier = une capacité de l'agent (résumé, quiz, traduction...)
│       └── services/      ← les briques techniques utilisées par les outils (RAG, LLM, etc.)
└── frontend/              ← l'interface web à trois volets (à construire)
```

**Comment lire ça si tu n'es pas backend** : un `tool` (dans `tools/`) est une
chose que l'agent sait faire. Un `service` (dans `services/`) est un morceau
de technologie que plusieurs outils peuvent réutiliser — par exemple, l'outil
« générer un quiz » et l'outil « générer un résumé » utilisent tous les deux le
`service` RAG pour aller chercher le bon passage dans les documents.

**Comment lire ça si tu es backend** : chaque `Tool` hérite de la classe de
base dans `tools/base.py`, déclare son schéma JSON (ce que l'agent doit lui
fournir comme arguments) et une méthode `run()`. Ajouter une capacité à
l'agent = écrire un nouveau fichier dans `tools/` et l'enregistrer dans
`tools/registry.py`. Rien d'autre à toucher.

---

## 3. Où on en est vraiment

Pour éviter toute confusion entre "le projet existe" et "le projet marche",
voici l'état réel, brique par brique :

| Brique | État |
|---|---|
| Configuration, schémas d'API, stockage (journal SQLite) | Écrit |
| Pipeline RAG (ChromaDB + embeddings) | Écrit, **validé** sur 2 DOCX + 1 PDF (5/5 requêtes pertinentes) |
| Traduction locale (branchement sur tg_nlp_toolkit) | Écrit, **à connecter** au vrai modèle |
| Outils : résumé, quiz, traduction, graphique, export PDF/Word, recherche web | Écrits ; seuls `rag_search`, `summarize`, `generate_quiz` sont exposés à l'agent (périmètre MVP) |
| Exécution encadrée des scripts de graphiques (sandbox) | Écrit, hors périmètre MVP |
| Routes `/health`, `/chat`, `/sources`, `/artifacts`, `/translate` | Écrites |
| **Boucle de l'agent** (qui décide quel outil appeler et quand) | **Écrite**, à valider avec une vraie clé Groq |
| Interface web (Sources / Chat / Atelier) | **Maquette HTML unique servie par l'API** (`Charte_visuel/nunya-maquette.html`) |
| Carnet de progression (couche ludique) | Version minimale (titre, type, date) branchée sur SQLite |
| Tests automatisés | **19 tests** (dont la boucle agent avec faux LLM) |
| Identité de marque (nom en Éwé, charte visuelle) | Charte et maquette produites ; nom « Nunya » retenu dans les documents MVP |

Autrement dit : **le code du MVP est en place, mais la chaîne n'a pas encore
été prouvée sur de vrais documents.** Le verrou n'est plus l'écriture, c'est la
validation (RAG réel + réponses ancrées + tests). Voir
`docs/PLAN_REALISATION_MVP_v2.md`.

---

## 4. Démarrer en 5 minutes

Pas à pas complet dans `README.md`. En résumé :

```powershell
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt
Copy-Item .env.example .env   # puis renseigner GROQ_API_KEY
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Vérifier que ça tourne : `http://localhost:8000/health` → `{"status": "ok"}`.

---

## 5. Comment continuer — par ordre de priorité

1. **Valider le RAG sur de vrais documents** : installer `requirements-rag.txt`,
   déposer 2 PDF + 1 DOCX, vérifier que la recherche remonte le bon passage.
   C'est le risque n°1 du projet.
2. **Valider la boucle de l'agent** avec une vraie clé Groq : 5 questions
   ancrées dans les sources, et un refus correct sur une question hors corpus.
3. **Écrire les tests** — en priorité un test de la boucle avec un faux client
   LLM, qui protège le cœur du produit sans réseau ni coût.
4. **Assainir l'interface** : retirer les données de démonstration, brancher les
   états d'erreur, marquer les outils hors périmètre comme indisponibles.
5. **Recette + déploiement** : 3 documents, critères du cahier des charges MVP,
   démo rejouable et vidéo de secours.
6. **Identité de marque** : la charte et la maquette sont faites ; il reste à
   faire valider le nom par un locuteur natif.

### Qui peut prendre quoi

- **Backend / agent** : étapes 1 à 3 ci-dessus.
- **Frontend / design** : étape 4, en s'appuyant sur les principes de design
  du Cahier des charges v2 (sobre, non générique, pas de gamification bruyante).
- **NLP / langues locales** : étape 3, plus l'amélioration continue de la
  qualité de traduction (le modèle actuel penche vers un éwé archaïque, corpus
  d'entraînement majoritairement biblique — à garder en tête pour les démos).
- **Contenu / pédagogie** : préparer un petit corpus de démonstration
  (quelques documents de cours) pour tester le RAG sans attendre que de vrais
  utilisateurs en apportent.

---

## 6. Comment on suit l'avancement ensemble

Pour que tout le monde voie où en est le projet sans avoir à demander :

- **La section 3 de ce fichier est la source de vérité** sur l'état des
  briques. Quand tu termines quelque chose, mets à jour la ligne
  correspondante ( →  en cours →  fait) dans la même pull request que ton
  code.
- **Le journal ci-dessous** sert à noter les décisions ou changements qui ne
  tiennent pas dans un tableau (un choix technique, une contrainte découverte
  en cours de route). Une ligne datée suffit, pas besoin de prose.
- Pour le suivi fin tâche par tâche (qui fait quoi cette semaine), utiliser les
  **Issues / Project GitHub** du dépôt plutôt que ce fichier, qui doit rester
  court et lisible en une fois.

### Journal

- 2026-10-03 : scaffold initial du backend (services, outils, config) +
  Dockerfile/docker-compose + README technique.
- 2026-10-20 : boucle d'agent, routes `/chat`, `/sources`, `/artifacts`,
  `/translate` et branchement de la maquette sur l'API réelle. Plan de
  réalisation révisé (`docs/PLAN_REALISATION_MVP_v2.md`) : le verrou n'est plus
  l'écriture mais la validation (RAG réel, tests, interface sans données de démo).

<!-- Ajouter une ligne datée à chaque étape importante franchie. -->

---

## 7. Documents de référence

- `docs/Cahier_des_charges_v2.docx` — fonctionnalités détaillées, périmètre MoSCoW.
- `docs/Etude_technique_faisabilite.docx` — faisabilité par brique, risques, planning.
- `docs/EduPath_Togo_Presentation.pptx` — support de présentation pour la candidature.
- `README.md` — installation et détail de la stack technique.
