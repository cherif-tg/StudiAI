# État du projet Nunya — 21 octobre 2026

> Résumé de contexte : ce qui existe, ce qui est prouvé, ce qui reste.
> À lire en premier avant de reprendre le travail. Détails : `docs/PLAN_REALISATION_MVP_v2.md`,
> `docs/RECETTE_MVP.md`, `docs/FRONTEND.md`.

---

## 1. Où en est le produit

| Brique | État | Preuve |
|---|---|---|
| Backend FastAPI (chat, sources, artefacts, traduction) | **Fait** | `docs/RECETTE_MVP.md` |
| Boucle agent + RAG sur documents réels | **Validé** | 3/3 réponses ancrées, refus hors corpus, 0 artefact non demandé |
| Tests backend | **19 tests** | `pytest` en 14 s, sans réseau |
| Frontend React | **Écrit et construit** | `npm run typecheck` OK, build 322 Ko, 7 routes rendues sans erreur |
| Design system | **Fait** | jetons issus de `Charte_visuel/nunya-etude-graphique.md` |
| Documentation utilisateur | **Fait** | page `/aide` in-app |
| Documentation technique | **Fait** | `docs/FRONTEND.md` |
| Déploiement | **À faire** | — |
| Traduction éwé active | **Hors MVP** | `TRANSLATION_MODE=disabled` |

## 2. Comment lancer

```powershell
# Backend + interface construite (un seul port)
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# http://127.0.0.1:8000/

# Développement frontend (rechargement à chaud)
cd frontend
npm run dev        # http://localhost:5173, proxy vers :8000
```

Après une modification du frontend : `cd frontend; npm run build` (FastAPI sert `frontend/dist`).

## 3. Décisions prises (à ne pas rouvrir sans raison)

1. **Python 3.13 + venv `uv` à la racine** — le Python embarqué n'a pas le module `venv`.
2. **LLM : `openai/gpt-oss-120b` sur Groq** — `llama-3.3-70b-versatile` n'existe plus sur le compte.
3. **Pas de bibliothèque d'UI** — CSS maison avec les jetons de la charte, pour éviter le look « template ».
4. **Interface React servie par FastAPI** — pas de serveur Node en production ; `dist/` monté sur `/`.
5. **Aucune simulation** — les outils non branchés (graphique, fiche, export, traduction) sont désactivés et expliqués.
6. **Pas d'authentification** — la page de connexion l'annonce et propose une session locale.

## 4. Ce qui reste

- **Contrôle visuel par un humain** : le navigateur automatisé refuse `localhost`, seuls des tests de rendu (jsdom) ont été faits.
- **Déploiement** : image Docker (le RAG pèse ~2 Go), hébergement ≥ 2 Go de RAM, ou démo locale + tunnel.
- **Démarrage à froid** : 1 à 8 minutes selon la machine (Defender scanne `torch`). Le serveur préchauffe le RAG ; `/health` expose `rag`.
- **Après le MVP** : traduction éwé, fiches bilingues, export, graphiques, comptes utilisateurs.

## 5. Pièges connus

- Le garde-fou d'écriture de l'agent confond parfois un champ de formulaire avec un secret (`autoComplete="current-password"`, `groq_api_key: str = ""`). Signaler, ne pas contourner.
- `frontend/dist` doit être reconstruit après chaque modification, sinon l'ancien bundle reste servi.
- Les documents indexés vivent dans `data/chroma` ; supprimer un document retire ses passages de l'index.
