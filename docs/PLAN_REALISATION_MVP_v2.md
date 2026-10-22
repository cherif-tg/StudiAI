# Plan de réalisation — MVP Nunya (révision du 20/10/2026)

> Remplace `docs/archive/PLAN_REALISATION_MVP_v1.md` (périmé sur l'état du code) comme plan
> d'exécution. Les décisions d'architecture de la v1 restent valables et sont
> reprises ici, notamment la règle « aucun artefact persisté sans geste explicite
> de l'apprenant ».

---

## 0. Résumé exécutif

**Le MVP n'est plus à écrire : il est à prouver.**

Le code du périmètre MVP est déjà en place — boucle d'agent, routes `/chat`,
`/sources`, `/artifacts`, `/translate`, maquette branchée sur l'API réelle. Ce qui
manque n'est pas du développement, c'est de la **validation** : aucune des deux
briques les plus risquées (RAG réel sur documents réels, boucle agent avec Groq)
n'a jamais tourné sur cette machine, il n'existe aucun test, et l'interface
affiche encore des données de démonstration quand l'API est vide.

| | |
|---|---|
| Charge restante estimée | **12 à 16 jours-homme** (dont 3–4 sur le seul lot RAG) |
| Chemin critique | Installation/validation du RAG → chaîne agent réelle → recette |
| À plein temps (5 j/sem.) | Démontrable vers le **13 novembre**, 1 semaine de marge |
| À mi-temps (2,5 j/sem.) | Démontrable fin novembre **sans marge** → réduire le périmètre (§9) |
| Blocage immédiat | Pas de `.env`, pas de clé Groq, dépendances RAG non installées |

Trois choses à faire cette semaine, dans cet ordre : rendre l'environnement
reproductible (T0), **prouver que l'ingestion et la recherche RAG fonctionnent sur
de vrais PDF/DOCX** (T1), puis brancher la clé Groq et faire tourner la boucle
(T2). Tant que T1 n'est pas passé, tout le reste est une hypothèse.

---

## 1. État vérifié du dépôt (20/10/2026)

Ce tableau ne reprend pas les docs du projet : il vient de la lecture du code et
de tests exécutés dans un venv isolé (`backend/.venv`, deps légères uniquement).

| Brique | État réel | Preuve |
|---|---|---|
| Application FastAPI | **Démarre** | `TestClient` : `/health` → `200 {"status":"ok"}` |
| Routes MVP | **Écrites** : `/chat`, `/sources` (POST/GET/DELETE), `/artifacts` (POST/GET), `/translate`, `/health` | `backend/app/api/*.py` |
| Boucle d'agent (function calling) | **Écrite** (`orchestrator.py` : boucle + journalisation + `max_agent_steps`) | lecture du fichier |
| Outils exposés à l'agent | **3** : `rag_search`, `summarize`, `generate_quiz` — conforme au périmètre MVP | `tools/registry.py` |
| Sauvegarde automatique d'artefacts | **Retirée** des outils — l'invariant « pas d'artefact sans clic » est respecté côté code | `tools/summarize.py`, `tools/quiz.py` |
| Persistance à la demande | **Fonctionne** : POST écrit le fichier + ligne SQLite, GET liste, URL statique sert le contenu | test exécuté, `200` + fichier relu |
| Dégradation sans clé LLM | **Propre** : `/chat` → `503 GROQ_API_KEY manquant` | test exécuté |
| Dégradation sans RAG | **Propre** : `/sources` → `503 Installe requirements-rag.txt`, fichier uploadé supprimé | test exécuté |
| **RAG : ingestion + recherche** | **NON TESTÉ** — `chromadb` / `sentence-transformers` jamais installés ici | import manquant |
| **Boucle agent avec Groq** | **NON TESTÉE** — aucune clé API dans `.env` (fichier absent) | `.env` inexistant |
| Traduction éwé | **Désactivée** (`TRANSLATION_MODE=disabled`) — hors périmètre MVP, normal | `/translate` → `503` |
| Tests automatisés | **Aucun** (`backend/tests/` vide) | 0 fichier |
| Frontend | **Maquette HTML unique** (31 Ko) servie à `/` et branchée sur l'API ; `frontend/src/` vide | `main.py`, `nunya-maquette.html` |
| Authentification par clé API | **Non appliquée** — `api_keys` défini dans `config.py`, utilisé nulle part | grep |
| `.env.example` | **Ignoré par git** (`.gitignore` ligne 13) → un nouveau clone n'a pas de modèle de config | `git check-ignore` |
| Docker | Fichiers fournis, **jamais construits ni testés** | — |

---

## 2. Écarts documentation ↔ code (à corriger, ce n'est pas cosmétique)

1. **`README.md` et `GUIDE_PROJET.md` §3 sont faux** : ils annoncent
   l'orchestrateur, `/chat`, `/sources` et l'interface comme « pas encore écrits ».
   Tous existent, committés (`3c1fc53`). Un nouvel arrivant qui lit le guide
   réécrira du code déjà présent.
2. **`.env.example` non versionné** : la procédure d'installation du README
   (`cp ../.env.example ../.env`) ne peut pas fonctionner sur un clone frais.
3. **`PLAN_REALISATION_MVP.md` v1** liste comme « à faire » des points déjà faits
   (§2.1 à §2.6) et ne dit rien de ce qui reste réellement : la validation.

Corriger ces trois points fait partie du lot T0 — c'est du travail de vérité, pas
de la cosmétique : sans ça, l'équipe travaille sur une carte périmée.

---

## 3. Périmètre MVP de référence (inchangé)

Source : `docs/Nunya_Cahier_des_charges_MVP.docx`.

**Inclus** : chat réel · upload PDF/DOCX avec indexation réelle · outil Résumé ·
outil Quiz jouable · persistance à la demande (« Ajouter au Carnet ») · Carnet
minimal (titre, type, date).

**Exclu de cette itération** : traduction éwé/kabiyè · graphiques · recherche web ·
scores et progression par notion · WhatsApp · synthèse vocale · tableau de bord
enseignant · authentification multi-utilisateurs.

**Ne pas toucher** (déjà validé, un changement ici coûte plus qu'il ne rapporte) :
palette/typo/logomark de la charte, structure visuelle de la maquette, noms de
champs de l'API.

---

## 4. Risques classés

| # | Risque | Impact | Prob. | Parade | Lot |
|---|---|---|---|---|---|
| R1 | Le RAG ne s'installe pas ou ne tourne pas correctement sous Windows/Python 3.13 (`torch`, `chromadb`, `sentence-transformers`) | **Bloquant** : plus de produit | Moyenne | Venv **Python 3.12** (parité Dockerfile), installation en premier, repli Docker si échec | T1 |
| R2 | Première requête très lente (chargement du modèle d'embedding, ~120 Mo) → démo qui semble figée | Élevé | **Élevée** | Préchargement au démarrage + message d'état dans l'UI | T1.5 |
| R3 | Le LLM répond sans s'appuyer sur les sources (invention) | Élevé (crédibilité) | Moyenne | Prompt + test « question hors corpus » → refus attendu ; garde-fou dans le prompt | T2.4 |
| R4 | L'UI affiche des documents/artefacts de démo quand l'API est vide → la démo ment | Élevé | **Certaine** aujourd'hui | Remplacer le repli démo par un vrai état vide | T4.1 |
| R5 | Aucun test : chaque modification casse silencieusement la boucle agent | Moyen | Élevée | Tests sans réseau avec un faux client LLM (T5.2) | T5 |
| R6 | Boucle agent qui rappelle le même outil en boucle / coût Groq | Moyen | Faible | `max_agent_steps=5` déjà en place ; à vérifier en conditions réelles | T2.3 |
| R7 | Déploiement impossible sur un palier gratuit (RAM insuffisante pour torch) | Moyen | Élevée | Démo locale + tunnel, ou VM ≥ 2 Go ; vidéo de secours | T6 |

---

## 5. Chemin critique — 4 sprints

Dates proposées en supposant un démarrage immédiat. Chaque sprint a une **porte** :
on ne passe pas au suivant sans la franchir.

### Sprint 1 — « Ça tourne pour de vrai » (20 → 24 octobre, 4–5 j-h)

Objectif : un document réel déposé, indexé, et retrouvé par la recherche.

- T0.1 Corriger `.gitignore` + versionner `.env.example`
- T0.2 Environnement reproductible : venv Python 3.12, `requirements*.txt`, `.env` réel
- T0.3 Mettre à jour `README.md` et `GUIDE_PROJET.md` §3 (état réel)
- T1.1 Installer `requirements-rag.txt` + mesurer le temps de première requête
- T1.2 Indexer 3 documents réels (2 PDF + 1 DOCX) et vérifier les chunks
- T1.3 Vérifier la recherche : 5 requêtes dont la réponse est dans les documents
- T1.4 Vérifier le filtrage par `source_ids` et la suppression d'une source
- T1.5 Précharger le modèle d'embedding au démarrage (ou état « chargement » côté UI)

**Porte 1** : `POST /sources` renvoie `chunks > 0` sur les 3 documents, et
`rag.search` remonte le bon passage pour 5 requêtes sur 5. Sans ça, on arrête et
on traite R1 (repli Docker) avant tout le reste.

### Sprint 2 — « L'agent répond sur les sources » (27 → 31 octobre, 3–4 j-h)

- T2.1 Clé Groq dans `.env`, 5 questions ancrées, vérifier les `tool_calls` et la
  trace `steps` renvoyée à l'UI
- T2.2 Vérifier la journalisation `events` (un enregistrement par appel d'outil)
- T2.3 Vérifier `max_agent_steps` et l'absence de boucle sur 10 questions variées
- T2.4 Test « question hors corpus » → l'agent doit refuser, pas inventer
- T2.5 Résumé et quiz réels sur les 3 documents : qualité pédagogique relue à la main
- T3.1 Vérifier l'invariant : après un résumé + un quiz, `artifacts` en base = **0**
- T3.2 Carnet : ajout, liste, ordre chronologique, réouverture de session

**Porte 2** : 5 réponses correctes et ancrées, 1 refus correct hors corpus, 0
artefact créé sans clic. C'est déjà l'essentiel des critères de succès du cahier
des charges.

### Sprint 3 — « L'interface ne ment plus » (3 → 7 novembre, 3–4 j-h)

- T4.1 Supprimer le repli sur données de démonstration → vrai état vide
- T4.2 États d'erreur explicites (503 LLM/RAG, réseau coupé) au lieu d'un toast muet
- T4.3 Désactiver clairement Graphique / Export / Traduction (« bientôt disponible »)
- T4.4 Décision clé API (voir §9) + application si retenue
- T4.5 Vérification mobile/étroit + défilement de l'Atelier
- T4.6 Parcours quiz complet : répondre, voir le score, ajouter au Carnet

**Porte 3** : un utilisateur qui n'a jamais vu le projet déroule le parcours du
cahier des charges §3 sans qu'on lui explique quoi cliquer.

### Sprint 4 — « Démontrable et défendable » (10 → 14 novembre, 2–3 j-h)

- T5.1 Tests automatisés : `/artifacts`, `/sources` en mode dégradé, boucle agent
  avec faux LLM (voir §7)
- T5.2 Recette complète sur 3 documents, résultats consignés
- T6.1 Construction de l'image Docker (ou décision « démo locale + tunnel »)
- T6.2 Script de démonstration écrit + vidéo de secours enregistrée
- T6.3 Mise à jour `GUIDE_PROJET.md` (journal + tableau d'état)

**Porte 4** : la démo passe deux fois de suite sans intervention manuelle, et une
vidéo de secours existe.

---

## 6. Backlog détaillé

Effort en jours-homme ; fourchettes assumées (estimation, pas engagement).

### T0 — Socle reproductible (1,5 j)

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T0.1 | Retirer `.env.example` du `.gitignore`, l'ajouter au dépôt | `.gitignore`, `.env.example` | `git ls-files .env.example` renvoie le fichier |
| T0.2 | Documenter/provisionner un venv **Python 3.12** (le Python embarqué ici n'a pas le module `venv` ; 3.13 est un risque pour `torch`) | `README.md` | `uvicorn app.main:app` démarre, `/health` → 200 |
| T0.3 | Mettre à jour l'état réel dans le README et le guide | `README.md`, `GUIDE_PROJET.md` | Plus aucune phrase « à écrire » fausse |
| T0.4 | Installer `requirements-dev.txt` (pytest y est déjà déclaré) | `requirements-dev.txt` | `pytest --version` OK dans le venv |

### T1 — RAG réellement validé (3–4 j) — **risque n°1**

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T1.1 | Installer `requirements-rag.txt`, noter le temps et la taille | — | `import chromadb, sentence_transformers` OK |
| T1.2 | Indexer 2 PDF + 1 DOCX réels via `POST /sources` | — | `chunks > 0` pour les 3, aucun 500 |
| T1.3 | 5 requêtes dont la réponse est dans les documents | — | 5/5 passages pertinents dans le top 5 |
| T1.4 | Filtrage `source_ids` + `DELETE /sources/{id}` | `services/rag.py` | La recherche ne remonte plus les chunks supprimés |
| T1.5 | Préchargement du modèle au démarrage (ou état « chargement ») | `main.py` / `services/rag.py` | 1re requête < 3 s après démarrage à chaud |
| T1.6 | PDF scanné → message clair (déjà codé, à prouver) | `api/sources.py` | `400` lisible, fichier nettoyé |

### T2 — Chaîne agent en conditions réelles (2–3 j)

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T2.1 | Clé Groq + 5 questions ancrées | `.env` | Réponses justes, `steps` non vide |
| T2.2 | Vérifier la trace en base | `services/journal.py` | 1 ligne `events` par outil appelé |
| T2.3 | Robustesse de la boucle (10 questions, pas de répétition infinie) | `agent/orchestrator.py` | Aucun dépassement de `max_agent_steps` |
| T2.4 | Question hors corpus → refus explicite | `agent/orchestrator.py` (prompt) | Aucune invention sur 3 essais |
| T2.5 | Qualité résumé + quiz sur 3 documents | `tools/summarize.py`, `tools/quiz.py` | Relu à la main : fidèle, questions non triviales |
| T2.6 | Outil en échec → réponse dégradée, pas de 500 | `agent/orchestrator.py` | Erreur RAG simulée → message clair |

### T3 — Persistance à la demande (1 j)

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T3.1 | Prouver l'invariant « 0 artefact sans clic » | — | Table `artifacts` vide après résumé + quiz |
| T3.2 | Carnet : ajout, liste, ordre chronologique | `api/artifacts.py` | Le plus récent en tête, `created_at` affiché |
| T3.3 | Réouverture de session | `api/artifacts.py`, maquette | Les artefacts réapparaissent après rechargement |

*Note : `/artifacts` POST/GET et le service statique ont déjà été testés avec
succès le 20/10 — il reste l'ordre, l'affichage et la réouverture.*

### T4 — Interface honnête (2–3 j)

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T4.1 | Supprimer `demoDocs()`/`demoMsgs()`/`demoArts()` du chemin normal | `Charte_visuel/nunya-maquette.html` | API vide → état vide assumé, pas de faux documents |
| T4.2 | Erreurs API visibles (503, réseau) | maquette | Message explicite, pas de toast générique |
| T4.3 | Graphique / Export / Traduction marqués indisponibles | maquette | Bouton désactivé + libellé clair |
| T4.4 | Décision clé API (§9) et application | `api/deps.py` (à créer) | Comportement documenté et testé |
| T4.5 | Mobile / largeur étroite | maquette | Parcours complet utilisable à 380 px |
| T4.6 | Parcours quiz | maquette | Répondre → score → Carnet |

### T5 — Tests et recette (1,5–2 j)

| ID | Tâche | Fichiers | Critère de fin |
|---|---|---|---|
| T5.1 | Tests API (artefacts, sources dégradé, health) | `backend/tests/test_api.py` | `pytest -q` vert |
| T5.2 | Test de la boucle agent avec faux client LLM (sans réseau) | `backend/tests/test_orchestrator.py` | Boucle + `steps` + journal vérifiés hors ligne |
| T5.3 | Recette manuelle documentée (3 documents) | `docs/RECETTE_MVP.md` | Cases cochées, captures si possible |

### T6 — Déploiement et démo (1–2 j)

| ID | Tâche | Critère de fin |
|---|---|---|
| T6.1 | `docker build` + `docker compose up` | `/health` répond depuis le conteneur |
| T6.2 | Scénario de démo écrit, minuté (5 min) | Rejouable par quelqu'un d'autre |
| T6.3 | Vidéo de secours | Enregistrée, testée hors ligne |

---

## 7. Plan de recette

### Critères du cahier des charges (à cocher explicitement)

1. Un document réel (PDF ou DOCX) déposé puis interrogé → réponses ancrées dans
   son contenu.
2. Résumé et quiz générés **sans erreur sur 3 documents différents**.
3. Aucun artefact enregistré sans action explicite — vérifié par test manuel **et**
   par comptage en base.
4. Le Carnet affiche fidèlement les artefacts sauvegardés, en ordre chronologique.

### Tests automatisés à écrire (priorité, du plus rentable au moins rentable)

1. **Boucle agent avec faux LLM** : un client factice qui renvoie un `tool_call`
   `rag_search`, puis une réponse finale. Vérifie la boucle, les `steps`, la
   journalisation — sans clé, sans réseau, sans coût. C'est le test qui protège
   le cœur du produit.
2. `/artifacts` : création → fichier présent → listing → URL statique sert le
   contenu, avec un `DATA_DIR` temporaire.
3. `/sources` sans RAG : `503` et fichier uploadé supprimé (déjà observé
   manuellement, à figer).
4. `/chat` sans clé : `503` avec message exploitable.

Commande cible : `cd backend && .venv\Scripts\python.exe -m pytest -q`.

### À ne pas faire

Ne pas écrire de test qui mocke le RAG pour « valider » les réponses : un test
vert sur un RAG factice ne prouve rien sur le produit. Le RAG se prouve sur de
vrais documents (T1).

---

## 8. Calendrier réaliste

| Semaine | Contenu | Jalon |
|---|---|---|
| 20–24 oct | T0 + T1 | **Porte 1** : RAG prouvé sur 3 documents |
| 27–31 oct | T2 + T3 | **Porte 2** : réponses ancrées, 0 artefact non demandé |
| 3–7 nov | T4 + T5.1/T5.2 | **Porte 3** : parcours complet sans explication |
| 10–14 nov | T5.3 + T6 | **Porte 4** : démo rejouable + vidéo |
| 17–28 nov | Marge : aléas RAG, qualité des sorties, traduction en démonstration séparée | Fenêtre de sécurité |

À mi-temps (≈2,5 j/semaine), cette charge occupe 5 à 6 semaines : la marge
disparaît. Dans ce cas, appliquer la coupe du §9.

---

## 9. Décisions à prendre (bloquantes ou coûteuses si tardives)

**D1 — Clé API : appliquée ou non ?**
Le cahier des charges demande « authentification simple par clé API ». Mais
l'interface est servie par la même origine : si on exige `X-API-Key`, il faut
l'injecter côté client, donc la clé devient publique — une sécurité de théâtre.
*Recommandation* : implémenter la dépendance derrière un drapeau
`REQUIRE_API_KEY` (défaut `false`), la documenter comme « usage interne / appels
tiers », et l'activer pour les clients non-navigateur. Coût : 1 h.

**D2 — Python 3.12 pour le RAG, ou 3.13 ?**
Le Python embarqué de l'environnement de dev n'a pas le module `venv` (build allégé) ; le Python 3.13 système, lui, fonctionne (le venv de test a été créé avec). Mais `torch`/`chromadb` sont moins éprouvés sur 3.13, et le Dockerfile épingle déjà 3.12.
*Recommandation* : 3.12 partout, pour que le local et le conteneur se comportent
pareil.

**D3 — Déploiement public, ou démo locale + tunnel ?**
Le RAG embarque `torch` : comptez 1,5 à 2,5 Go d'image et ≥ 2 Go de RAM. Les
paliers gratuits usuels ne suffisent pas.
*Recommandation* : démo locale avec tunnel, vidéo de secours, et déploiement
seulement si une VM ≥ 2 Go est disponible. Ne pas découvrir ça la veille.

**D4 — Si le temps manque, que coupe-t-on ?**
Ordre de coupe proposé : T4.5 (mobile) → T6.1 (Docker) → T2.5 (qualité sur 3
documents, ramené à 1). **Ne jamais couper** T1, T2.4 (anti-invention), T3.1
(invariant artefact) : ce sont les trois choses que la démo doit prouver.

---

## 10. Ce que je n'ai pas pu vérifier

À lire avant de considérer ce plan comme une garantie :

- **Le RAG n'a jamais tourné ici** : ni installation, ni ingestion, ni recherche.
  Les 3–4 jours du lot T1 sont une estimation, pas une mesure. C'est le risque R1.
- **La boucle agent n'a jamais été exécutée avec un vrai LLM** (pas de clé Groq).
  Le code est lisible et cohérent, mais non éprouvé.
- **Docker n'a pas été construit.** Le temps de build de l'image RAG est inconnu.
- **La traduction éwé est hors MVP** et son mode `local`/`remote` n'a pas été
  testé : ne pas la promettre dans la démo du MVP.
- Les estimations de charge sont un jugement, pas un historique de vélocité : le
  projet n'a pas encore de données de rythme.

*Note d'exécution* : un venv de test (`backend/.venv`, deps légères) et un
`data/journal.db` vide (schéma seul, 0 ligne) ont été créés lors de cette
vérification. Tous deux sont ignorés par git.

---

## 11. Documents à mettre à jour dans la même PR que le code

- `README.md` — état réel des briques, prérequis Python 3.12, `.env.example`.
- `GUIDE_PROJET.md` §3 et journal — tableau d'avancement à jour.
- `docs/archive/PLAN_REALISATION_MVP_v1.md` — archivé, remplacé par ce document.
- `docs/RECETTE_MVP.md` — à créer au lot T5.3.

---

## 12. Journal d'exécution — 21/10/2026

Fait, et vérifié (détail des mesures dans `docs/RECETTE_MVP.md`) :

- **T0** — `.env.example` versionné (il était exclu par `.gitignore`), README et
  `GUIDE_PROJET.md` remis à l'état réel, `.zwork/` ignoré.
- **T1** — RAG installé (chromadb 1.5.9, sentence-transformers 6.1.0, torch 2.14.1)
  et **validé sur documents réels** : 5/5 requêtes pertinentes, filtrage par
  source, suppression. 2 DOCX + 1 PDF indexés.
- **T2** — boucle agent validée avec Groq : 3/3 réponses ancrées, refus hors
  corpus, 0 artefact, journalisation OK.
- **T3** — invariant « aucun artefact sans action » vérifié en base ; Carnet
  (création, liste, ordre, contenu servi) validé.
- **T4** — données de démonstration supprimées de l'interface (documents, résumé,
  quiz, carnet, sessions) ; états vides et erreurs explicites ; outils hors
  périmètre signalés.
- **T5** — 19 tests automatisés, dont un test de la boucle avec faux LLM ;
  scripts de recette RAG et agent.

Écarts trouvés en chemin et corrigés :

1. le modèle LLM par défaut (`llama-3.3-70b-versatile`) **n'existe plus** chez
   Groq → `openai/gpt-oss-120b`, function calling vérifié sur 3 modèles ;
2. l'extraction DOCX **ignorait les tableaux** (les exigences du cahier des
   charges MVP étaient donc invisibles du RAG) ;
3. `rag.ingest` chargeait le modèle d'embedding **avant** de valider le fichier ;
4. le prompt laissait l'agent rédiger les résumés sans appeler `summarize`,
   laissant l'Atelier vide → règle explicite ajoutée ;
5. aucun préchauffage : la première requête payait le chargement du modèle.

Reste à faire :

- **T4.5/T4.6** — vérification visuelle dans un navigateur (le navigateur
  automatisé refuse `localhost`) et parcours quiz complet à l'écran ;
- **T6** — build Docker, déploiement, scénario de démo et vidéo de secours ;
- **Décision D4** — si le temps manque, couper dans l'ordre T4.5 → T6.1.

Point d'environnement à traiter avant la démo : **6 à 8 minutes de démarrage à
froid** (Defender scanne `torch` à chaque nouveau processus). Parades : démarrer
le serveur en avance, exclure le venv de Defender (admin), ou démontrer depuis
Docker.

