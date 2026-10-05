# Plan d'implémentation — EduPath Togo

Ce document complète `GUIDE_PROJET.md` : là où le guide donne l'état global et l'ordre de priorité à haut niveau, celui-ci détaille **ce qu'il faut implémenter dans chaque partie**, **avec quelle stack**, et **sous forme de tâches prêtes à être prises** par quelqu'un de l'équipe.

Priorité : **P0** = bloquant pour toute démo, **P1** = nécessaire pour une démo complète, **P2** = différenciant mais sacrifiable si le temps manque.

---

## 1. Agent & Orchestration — *le cœur, rien ne marche sans ça*

**Objectif** : une boucle qui reçoit un message, décide quel(s) outil(s) appeler, les exécute, et renvoie une réponse + la trace de ce qui a été fait.

**Stack** : Python, SDK `groq` (function calling), Pydantic pour la validation des arguments d'outils.

**Tâches**
- [ ] P0 — Écrire `backend/app/agent/orchestrator.py` : boucle messages → `llm.achat(tools=...)` → exécution des `tool_calls` → relance jusqu'à réponse finale ou `max_agent_steps` atteint.
- [ ] P0 — Gérer l'historique de conversation par `session_id` (en mémoire au début, SQLite ensuite si besoin de persistance entre redémarrages).
- [ ] P0 — Journaliser chaque appel d'outil via `services.journal.log_event` (nécessaire pour la traçabilité affichée à l'utilisateur).
- [ ] P1 — Gérer proprement les erreurs d'un outil (un outil qui échoue ne doit pas faire planter toute la réponse — renvoyer un message d'erreur exploitable par le LLM).
- [ ] P1 — Limiter et tester les boucles infinies potentielles (l'agent qui rappelle le même outil en boucle).

**Dépend de** : rien (les outils et services existent déjà).
**Profil** : backend / Python, à l'aise avec les API de LLM.

---

## 2. API applicative

**Objectif** : exposer l'agent et ses capacités à n'importe quel client (web, futurs canaux tiers).

**Stack** : FastAPI, Pydantic (schémas déjà écrits dans `schemas.py`).

**Tâches**
- [ ] P0 — `POST /chat` : reçoit un `ChatRequest`, appelle l'orchestrateur, renvoie un `ChatResponse`.
- [ ] P0 — `POST /sources` (upload de fichier) + `GET /sources` (liste) + `DELETE /sources/{id}`.
- [ ] P1 — `GET /artifacts/{id}` (déjà partiellement couvert par le montage statique dans `main.py` — vérifier que le téléchargement fonctionne pour chaque type de fichier).
- [ ] P1 — `POST /tools/{name}` : appel direct d'un outil hors conversation (utile pour un client qui veut juste "génère-moi un quiz" sans dialoguer).
- [ ] P1 — Authentification simple par clé API (`X-API-Key`, déjà prévue dans `config.py` via `API_KEYS`) — vérifier sur chaque route.
- [ ] P2 — Documentation d'API soignée (FastAPI la génère automatiquement via `/docs`, mais enrichir les descriptions de endpoints pour qu'un tiers comprenne sans contexte).

**Dépend de** : section 1 (orchestrateur) pour `/chat`.
**Profil** : backend.

---

## 3. RAG (déjà construit — tâches d'intégration restantes)

**Objectif** : que l'agent retrouve les bons passages dans les documents de l'apprenant.

**Stack** : ChromaDB (persistant), `sentence-transformers` (embeddings multilingues).

**Tâches**
- [ ] P1 — Brancher le pipeline OpenMind (re-ranking cross-encoder) à la place du `search` basique actuel dans `services/rag.py` — l'interface (`ingest/search/context_for/delete`) ne change pas, seul le corps de `search` évolue.
- [ ] P1 — Gérer les PDF scannés (sans texte extractible) : au minimum, un message d'erreur clair plutôt qu'un échec silencieux.
- [ ] P2 — OCR pour les PDF scannés si le temps le permet.

**Dépend de** : rien, déjà fonctionnel en l'état basique.
**Profil** : NLP / ML.

---

## 4. Traduction & langues locales

**Objectif** : sorties en Éwé/Kabiyè via tg_nlp_toolkit.

**Stack** : NLLB-200 + adaptateur LoRA (déjà entraîné), `transformers`, `peft`, ou appel HTTP vers le HF Space existant.

**Tâches**
- [ ] P0 — Choisir le mode (`local` dans le même processus, ou `remote` vers le HF Space déjà déployé) et renseigner les variables `.env` correspondantes.
- [ ] P0 — Tester `translate.py` avec le vrai modèle sur 5-10 phrases types des scénarios de démo.
- [ ] P1 — Documenter/afficher la limite connue (registre archaïque, corpus biblique) quelque part dans l'interface, pas seulement dans le code.
- [ ] P2 — Intégrer le futur modèle d'embeddings Éwé si disponible à temps (améliore potentiellement la recherche RAG en Éwé).

**Dépend de** : rien de technique, juste une décision (local vs remote) à prendre tôt.
**Profil** : NLP / langues locales.

---

## 5. Outils de génération (documents, graphiques, quiz)

**Objectif** : déjà écrits individuellement — ce qui reste est la robustesse et les tests réels.

**Stack** : `python-docx`, `reportlab`, `matplotlib`, exécution en sous-processus encadré.

**Tâches**
- [ ] P1 — Tester `export_doc.py` sur un vrai résumé long (vérifier la conversion Markdown → PDF/DOCX sur du contenu réel, pas seulement des exemples courts).
- [ ] P1 — Tester `chart.py` sur 10-15 descriptions de graphiques variées pour évaluer le taux d'échec réel du bac à sable et ajuster le prompt si besoin.
- [ ] P1 — Tester `quiz.py` sur du contenu réel pour vérifier la qualité pédagogique des questions générées, pas seulement la validité du JSON.
- [ ] P2 — Renforcer l'isolation du bac à sable (`sandbox.py`) avec un vrai conteneur sans réseau si le temps le permet (actuellement : liste blanche + limites de ressources, pas une isolation forte).

**Dépend de** : rien, testable dès maintenant indépendamment de l'agent.
**Profil** : backend, idéalement en binôme avec quelqu'un qui connaît le contenu pédagogique pour juger la qualité des sorties.

---

## 6. Interface web (Sources / Chat / Atelier)

**Objectif** : le poste de travail à trois volets.

**Stack** : à trancher — React conseillé pour la synchronisation entre les trois volets (état partagé : sources sélectionnées, historique de chat, artefacts produits). Alternative plus rapide : un framework de chat tout-en-un si la contrainte de temps l'emporte sur le contrôle visuel.

**Tâches**
- [ ] P0 — Volet Sources : upload, liste des documents, suppression.
- [ ] P0 — Volet Chat : envoi de message, affichage de la réponse, historique de session.
- [ ] P1 — Volet Atelier : boutons d'action par outil (résumé, quiz, graphique, export, traduction) avec affichage du résultat.
- [ ] P1 — Affichage de la trace de décision de l'agent (quels outils ont été appelés) — argument clé pour la démo.
- [ ] P2 — Mode dégradé visuel (bannière si l'API ne répond pas, pas de blocage total de l'interface).

**Dépend de** : section 2 (API) doit exposer `/chat` et `/sources` avant de pouvoir brancher l'interface dessus.
**Profil** : frontend / design.

---

## 7. Carnet de progression (couche ludique)

**Objectif** : capitaliser les artefacts produits sous une forme de progression visible — séparé de l'Atelier (voir Cahier des charges v2, §2).

**Stack** : même frontend que la section 6 ; backend : `GET /journal` déjà prévu dans les endpoints indicatifs.

**Tâches**
- [ ] P1 — Vue listant les artefacts générés par session (`services/journal.list_artifacts`, déjà écrit côté backend).
- [ ] P2 — Jalons visuels simples (ex. "3 fiches générées cette semaine") — rester sobre, pas de points/niveaux/classements (voir principes de design du Cahier des charges v2).

**Dépend de** : section 6 (même base frontend) et section 5 (artefacts à afficher).
**Profil** : frontend / design.

---

## 8. Identité de marque & design

**Objectif** : nom en Éwé + charte visuelle non générique.

**Tâches**
- [ ] P1 — Shortlister 3-4 noms en Éwé à partir des thèmes savoir/chemin/lumière (validés par un locuteur natif ou via tg_nlp_toolkit).
- [ ] P1 — Palette et typographie définies avant de construire l'interface (section 6), pour ne pas refaire le visuel après coup.
- [ ] P2 — Logo simple dérivé du nom choisi.

**Dépend de** : rien de technique — peut avancer en parallèle de tout dès maintenant.
**Profil** : n'importe qui à l'aise avec la langue Éwé + quelqu'un pour le visuel.

---

## 9. Infrastructure & déploiement

**Objectif** : que la démo tienne le jour J, y compris en connectivité dégradée.

**Stack** : Docker/`docker-compose` (déjà fournis), hébergement à choisir (palier gratuit : Render, Railway, ou conteneur sur une VM déjà disponible).

**Tâches**
- [ ] P1 — Déployer le backend sur un hébergement accessible publiquement (pas seulement en local) avant la dernière semaine.
- [ ] P1 — Mode dégradé : cache local / réponses pré-calculées pour le scénario de démo si la connexion coupe.
- [ ] P2 — Scénario de démonstration scripté + vidéo de secours enregistrée à l'avance (voir Étude technique, §8 et §10).

**Dépend de** : sections 1 et 2 fonctionnelles de bout en bout.
**Profil** : backend / devops.

---

## 10. Synthèse — par où commencer concrètement

| Ordre | Tâche | Section |
|---|---|---|
| 1 | Boucle de l'agent | §1 |
| 2 | Routes `/chat` et `/sources` | §2 |
| 3 | Décision + branchement traduction réelle | §4 |
| 4 | Volets Sources + Chat | §6 |
| 5 | Volet Atelier + tests qualité des outils | §5, §6 |
| 6 | Carnet + identité de marque (en parallèle) | §7, §8 |
| 7 | Déploiement + scénario de démo | §9 |
