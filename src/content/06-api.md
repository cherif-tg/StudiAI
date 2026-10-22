# Référence de l'API

Toutes les routes sont servies par le même serveur que l'interface. Les corps sont
en JSON, sauf le dépôt de fichier qui utilise `multipart/form-data`.

## Authentification

Les routes de l'atelier exigent un compte. La session est un cookie
`nunya_session` (`httpOnly`, `SameSite=Lax`, 30 jours), posé par :

| Méthode | Chemin | Corps | Effet |
|---|---|---|---|
| `POST` | `/auth/register` | `{name, email, mot_de_passe}` | Crée le compte, ouvre la session (`201`) |
| `POST` | `/auth/login` | `{email, mot_de_passe}` | Ouvre la session |
| `POST` | `/auth/logout` | Aucun | Ferme la session (`204`) |
| `GET` | `/auth/me` | Aucun | Profil courant, `401` si non connecté |

Le cookie contient un jeton opaque ; seul son empreinte SHA-256 est stockée côté
serveur. Les mots de passe sont hachés avec `scrypt` et un sel par compte.

Les routes publiques restent : `/health`, `/`, la documentation et les fichiers
statiques de l'interface.

## Routes

| Méthode | Chemin | Rôle |
|---|---|---|
| `GET` | `/health` | État du service : `status`, `rag` (moteur prêt), `llm` (clé présente) |
| `GET` | `/sources` | Liste des documents indexés |
| `POST` | `/sources` | Dépose et indexe un document (`multipart`, champ `file`) |
| `DELETE` | `/sources/{id}` | Retire un document et son index |
| `POST` | `/chat` | Question à l'agent |
| `GET` | `/artifacts` | Artefacts du compte connecté |
| `POST` | `/artifacts` | Enregistre un artefact (`kind`, `title`, `content`) |
| `GET` | `/artifacts/{fichier}` | Sert un artefact après contrôle du propriétaire |
| `POST` | `/translate` | Traduction éwé (désactivée dans le MVP) |
| `GET` | `/docs` | Documentation interactive générée par FastAPI |

## Exemples

```powershell
# État du service
Invoke-RestMethod http://127.0.0.1:8000/health

# Déposer un document
Invoke-RestMethod -Uri http://127.0.0.1:8000/sources -Method Post `
  -Form @{ file = Get-Item .\cours.docx }

# Poser une question
Invoke-RestMethod -Uri http://127.0.0.1:8000/chat -Method Post `
  -ContentType 'application/json' `
  -Body '{"session_id":"demo","message":"Résume le chapitre 2"}'
```

Réponse de `/chat` :

```json
{
  "answer": "…",
  "translation": null,
  "steps": [
    { "tool": "rag_search", "args": { "query": "…" }, "result_preview": "…", "data": {} }
  ],
  "artifacts": []
}
```

`artifacts` est toujours vide : un artefact ne peut être créé que par un appel
explicite à `POST /artifacts`. Les `steps` sont la trace des outils réellement
appelés : utile pour vérifier qu'une réponse s'appuie sur les documents.

## Codes d'erreur

| Code | Sens | Message typique |
|---|---|---|
| `400` | Document illisible ou format non supporté | « Aucun texte exploitable dans ce document (PDF scanné ?) » |
| `401` | Pas de session valide | « Connecte-toi pour accéder à l'atelier. » |
| `403` | Source appartenant à un autre compte | « Une source demandée n'appartient pas à ton compte. » |
| `409` | Adresse déjà utilisée | « Un compte existe déjà avec cette adresse. » |
| `413` | Fichier trop volumineux | « maximum 20 Mo » |
| `422` | Adresse ou mot de passe invalide | « Adresse e-mail invalide. » |
| `429` | Trop de questions dans la fenêtre | en-tête `Retry-After` fourni |
| `503` | Clé LLM absente, traduction désactivée, RAG indisponible | « GROQ_API_KEY manquant » |
| `507` | Stockage plein | « Retire un document avant d'en déposer un nouveau » |

## Limites de débit

`POST /chat` applique une fenêtre glissante par adresse : 30 questions par
10 minutes par défaut. L'adresse retenue est celle transmise par le proxy
(`CF-Connecting-IP` derrière un tunnel, `X-Forwarded-For` derrière Caddy) si
`TRUST_PROXY_HEADERS=true`.

La fenêtre est stockée en mémoire : elle se réinitialise au redémarrage et n'est
pas partagée entre plusieurs instances.
