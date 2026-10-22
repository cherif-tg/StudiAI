---
title: Nunya API
sdk: docker
app_port: 8000
colorFrom: green
colorTo: gray
pinned: false
short_description: API de l'atelier d'apprentissage Nunya
---

# Nunya — API

Backend de l'atelier d'apprentissage documentaire Nunya : recherche dans les
documents déposés, réponses sourcées, résumés et quiz.

L'interface est hébergée séparément (Vercel). Ce Space n'expose que l'API :

- `GET /health` — état du service (`rag` indique que le moteur est chargé)
- `GET /docs` — documentation interactive
- `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`
- `GET|POST /sources`, `POST /chat`, `GET|POST /artifacts`, `GET /agent/modes`

## Secrets à définir dans les réglages du Space

| Nom | Valeur |
|---|---|
| `GROQ_API_KEY` | la clé du fournisseur de modèle |
| `CORS_ORIGINS` | l'URL exacte de l'interface, ex. `https://nunya.vercel.app` |
| `COOKIE_SAMESITE` | `none` (domaines différents, HTTPS) ou `lax` avec un domaine commun |
| `TRUST_PROXY_HEADERS` | `true` |

## Ce qu'il faut savoir

- Le disque d'un Space gratuit est **éphémère** : comptes, documents et carnets
  repartent de zéro à chaque redémarrage ou mise en veille.
- Le Space **s'endort** après une période d'inactivité ; le premier appel réveille
  le conteneur et recharge le modèle (compte une à deux minutes).
- Le code de ce Space est généré depuis le dépôt principal ; ne le modifie pas
  ici, les changements seraient écrasés à la prochaine synchronisation.
