# Plan de réalisation — Nunya MVP

Ce document complète `Nunya_Cahier_des_charges_MVP.docx` : il dit précisément quoi coder, en s'appuyant sur ce qui existe déjà dans le scaffold backend (`edu-agent/backend/`) et dans la maquette finalisée (`nunya-maquette.html`).

---

## 1. Décision d'architecture centrale du MVP

**La persistance d'un artefact ne doit jamais être décidée par l'agent lui-même.**

Dans le scaffold actuel, `SummarizeTool` et `QuizTool` appellent `ctx.save_artifact(...)` automatiquement à chaque exécution — c'est exactement ce que le MVP interdit (« les artefacts ne doivent être réalisés que sur demande »). La correction n'est pas cosmétique, c'est structurelle :

- Les outils `summarize` et `generate_quiz` doivent **renvoyer leur résultat sans l'enregistrer**.
- La sauvegarde devient une **action explicite et déterministe**, déclenchée par le clic sur « Ajouter au Carnet » dans l'interface — pas par une décision du LLM. C'est un nouvel endpoint, pas un outil de plus dans l'agent.

Cette séparation garantit par construction qu'aucun artefact n'apparaît sans geste explicite de l'apprenant, plutôt que de compter sur le bon vouloir du prompt.

---

## 2. Modifications du backend existant

### 2.1 `backend/app/tools/summarize.py` et `quiz.py`
- [ ] Retirer l'appel à `ctx.save_artifact(...)` dans `SummarizeTool.run` et `QuizTool.run`.
- [ ] Les deux outils renvoient uniquement `ToolResult(text, data=...)`, sans `artifacts=[...]`.

### 2.2 `backend/app/tools/registry.py`
- [ ] Pour cette itération, `build_registry()` n'enregistre que `RagSearchTool`, `SummarizeTool`, `QuizTool`. Retirer (ou commenter, avec une note) `ChartTool`, `TranslateTool`, `ExportDocTool`, `WebSearchTool` de la liste active — le code de ces outils reste dans le dépôt pour la suite, il n'est simplement pas exposé à l'agent pour le MVP.

### 2.3 Traduction légère (française → éwé), hors boucle de l'agent
- [ ] Ajouter `POST /translate` (le schéma `TranslateRequest` existe déjà dans `schemas.py`) : reçoit `{text, target: "ee"}`, appelle `services.translator.translate(...)` directement, renvoie le texte traduit.
- [ ] `TranslateTool` (`tools/translate.py`) reste **hors** de `build_registry()` pour cette itération — la traduction n'est jamais un choix de l'agent, seulement une action déclenchée par l'utilisateur, exactement comme la persistance d'artefact (§1).
- [ ] S'assurer que `TRANSLATION_MODE` est configuré (`local` ou `remote`, voir `.env.example`) sur le modèle déjà entraîné — aucun nouveau code de traduction à écrire, seulement le brancher.
- [ ] Le Kabiyè n'est pas couvert par le MVP ; limiter l'action à l'éwé uniquement pour cette itération.

### 2.4 Nouvel endpoint : persistance à la demande
- [ ] `POST /artifacts` — reçoit `{session_id, kind: "summary"|"quiz", title, content}` (le contenu déjà affiché côté client, pas régénéré), appelle `services.journal.add_artifact(...)` et retourne l'`ArtifactRef`. Pas besoin de fichier PDF/DOCX réel pour le MVP — un enregistrement texte/JSON suffit à remplir le Carnet (voir Cahier des charges MVP, §2.1 : le Carnet minimal n'affiche que titre/type/date).
- [ ] `GET /artifacts?session_id=...` — liste les artefacts sauvegardés (`services.journal.list_artifacts`, déjà écrit).

### 2.5 Boucle de l'agent (`backend/app/agent/orchestrator.py`, pas encore écrite)
- [ ] Écrire la boucle telle que décrite dans le squelette déjà commenté : messages → `llm.achat(tools=registry.schemas(...))` → exécution des `tool_calls` → relance jusqu'à réponse finale.
- [ ] Avec seulement 3 outils actifs (RAG, résumé, quiz), c'est le point d'entrée le plus simple possible pour valider la mécanique avant d'en ajouter d'autres.

### 2.6 Routes restantes à écrire
- [ ] `POST /chat` — appelle l'orchestrateur, renvoie `ChatResponse`.
- [ ] `POST /sources` (upload), `GET /sources`, `DELETE /sources/{id}` — branchement direct sur `RagService.ingest` déjà écrit.

---

## 3. Frontend : brancher la maquette finalisée sur l'API réelle

`nunya-maquette.html` simule tout en JavaScript (fonction `reply()`, `setTimeout` pour imiter la latence, `toast()` pour les exports). Le travail du MVP est de remplacer ces simulations par de vrais appels, sans changer la structure ni le visuel déjà validés :

- [ ] `send(t)` : remplacer le `setTimeout` + `reply(t)` par un `fetch('/chat', {...})` réel ; conserver l'affichage progressif déjà en place.
- [ ] Upload (`#up` change listener) : remplacer la simulation d'indexation par un vrai `POST /sources` (multipart), et mettre à jour `d.st` quand l'API confirme l'indexation plutôt qu'après un délai fixe.
- [ ] Bouton **« Ajouter au Carnet »** (`a=='art'`) : au lieu de `toast(...)` simulé, appeler `POST /artifacts` avec le contenu actuellement affiché dans `panel()`, puis rafraîchir `S.arts` depuis `GET /artifacts`.
- [ ] Ajouter un bouton **« Traduire »** dans le panneau résumé/fiche de l'Atelier, qui appelle `POST /translate` (§2.3) et affiche le résultat sous le texte français — action manuelle, jamais déclenchée automatiquement.
- [ ] Les outils `graphique`, `export`, et la fiche bilingue restent visibles dans le code de la maquette (pour ne pas casser l'interface) mais ne sont pas connectés à une vraie capacité backend pour cette itération — à indiquer clairement dans l'interface si l'apprenant les déclenche (ex. état désactivé ou message « bientôt disponible ») plutôt que de les laisser silencieusement non fonctionnels.
- [ ] Les boutons **« Se connecter » / « Créer un compte »** (action `authpreview`) restent un aperçu visuel côté client uniquement — aucun travail backend d'authentification n'est dans le périmètre du MVP.

---

## 4. Ce qui ne bouge pas (déjà prêt, à ne pas retoucher)

- `services/rag.py`, `services/documents.py` — pipeline RAG déjà opérationnel.
- `services/journal.py` — déjà toutes les méthodes nécessaires (`add_artifact`, `list_artifacts`).
- `services/llm.py` — client Groq déjà prêt pour le function calling.
- `services/translation.py` — déjà écrit ; ne reste qu'à le brancher sur `POST /translate` (§2.3), pas à le réécrire.
- Palette, typographie, logomark, nom — figés par l'étude de style et la maquette finalisée.

---

## 5. Plan de test du MVP

- [ ] Déposer 3 documents de test réels (PDF et DOCX) et vérifier l'indexation effective (pas seulement l'affichage « Indexé »).
- [ ] Poser 5 questions dont la réponse est vérifiable dans les documents ; vérifier qu'aucune réponse n'invente un contenu absent des sources.
- [ ] Générer un résumé et un quiz sur chacun des 3 documents ; vérifier qu'aucun artefact n'apparaît dans le Carnet tant que « Ajouter au Carnet » n'a pas été cliqué.
- [ ] Vérifier que fermer l'onglet puis rouvrir une session affiche bien les artefacts précédemment sauvegardés (persistance réelle, pas seulement en mémoire).

---

## 6. Ordre de réalisation recommandé

| Ordre | Tâche | Référence |
|---|---|---|
| 1 | Retirer la sauvegarde automatique de `summarize.py`/`quiz.py` | §2.1 |
| 2 | Réduire `registry.py` aux 3 outils du MVP | §2.2 |
| 3 | Écrire l'orchestrateur (boucle agent minimale) | §2.4 |
| 4 | Écrire `/chat`, `/sources` | §2.5 |
| 5 | Écrire `/artifacts` (POST + GET) | §2.3 |
| 6 | Brancher la maquette sur l'API réelle | §3 |
| 7 | Dérouler le plan de test | §5 |
