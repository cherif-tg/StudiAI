# Auto-héberger

Nunya s'installe sur une machine à toi : un ordinateur portable suffit pour une
démonstration, un serveur pour un usage continu.

## Prérequis

| Élément | Minimum | Remarque |
|---|---|---|
| Python | 3.12 | 3.13 fonctionne ; 3.12 est la version de l'image Docker |
| Node.js | 20 | Uniquement pour construire l'interface |
| RAM | 4 Go conseillés | Le modèle d'embedding occupe environ 1 Go une fois chargé |
| Disque | 3 Go | Dépendances (1 Go) + modèle (0,5 Go) + tes documents |

## Installation locale

```powershell
# 1. Dépendances Python dans un venv isolé (uv)
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r backend\requirements.txt -r backend\requirements-rag.txt -r backend\requirements-dev.txt

# 2. Configuration
Copy-Item .env.example .env      # renseigner au minimum GROQ_API_KEY

# 3. Interface
cd frontend
npm install
npm run build                     # produit frontend/dist, servi par FastAPI

# 4. Lancement
cd ..\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

L'application est disponible sur `http://127.0.0.1:8000/`. Le premier démarrage
charge le modèle d'embedding : le badge passe de « Moteur en préparation » à
« Prêt ».

## Variables utiles

| Variable | Rôle | Défaut |
|---|---|---|
| `GROQ_API_KEY` | Clé du modèle de langage | vide |
| `LLM_MODEL` | Modèle utilisé | `openai/gpt-oss-120b` |
| `MAX_UPLOAD_MB` | Taille maximale d'un fichier | 20 |
| `MAX_STORAGE_MB` | Plafond du dossier d'uploads | 500 |
| `CHAT_RATE_LIMIT` | Questions autorisées par fenêtre | 30 |
| `CHAT_RATE_WINDOW_S` | Durée de la fenêtre, en secondes | 600 |
| `TRUST_PROXY_HEADERS` | Lire l'adresse réelle derrière un proxy | `true` |
| `TRANSLATION_MODE` | Traduction éwé (`disabled`, `local`, `remote`) | `disabled` |

## Docker

L'image construit l'interface puis l'exécute aux côtés de l'API :

```powershell
docker build -t nunya -f backend/Dockerfile .
docker run --rm -p 8000:8000 --env-file .env -v nunya-data:/srv/data nunya
```

Le volume `/srv/data` contient la base vectorielle, le journal et les artefacts :
c'est lui qu'il faut sauvegarder.

## Exposer sur Internet sans serveur : le tunnel

Un tunnel `cloudflared` publie ton application locale derrière une adresse HTTPS,
sans ouvrir de port ni posséder de domaine.

```powershell
# démarre le serveur s'il ne tourne pas, puis le tunnel, et affiche l'adresse
.\scripts\tunnel.ps1
```

À savoir avant de l'utiliser pour une démonstration :

- l'adresse change à chaque lancement et n'est pas garantie dans le temps ;
- le débit dépend de ta connexion et de ta machine restée allumée ;
- **toute personne ayant l'adresse peut déposer des fichiers** : les garde-fous
  de taille, de stockage et de débit sont actifs, mais ne remplacent pas une
  authentification ;
- ne dépose pas de documents confidentiels sur une instance publique.

## Sauvegarde

Tout l'état vit dans `data/` (base vectorielle, journal SQLite, artefacts déposés).
Une copie de ce dossier suffit à sauvegarder l'instance :

```powershell
Compress-Archive -Path data -DestinationPath "nunya-data-$(Get-Date -f yyyyMMdd).zip"
```
