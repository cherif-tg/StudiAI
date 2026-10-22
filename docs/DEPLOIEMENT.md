# Déploiement — état et procédure

> Décision du 21/10/2026 : démonstration **locale + tunnel gratuit**, sans domaine.
> La documentation est **intégrée à l'application** (`/documentation`).
> L'accès est **ouvert**, protégé par des garde-fous de taille, de stockage et de débit.

---

## 1. Mettre l'application en ligne

```powershell
.\scripts\tunnel.ps1
```

Le script :

1. vérifie qu'un serveur répond sur `http://127.0.0.1:8000` ; sinon il en démarre un
   avec le venv du projet ;
2. ouvre un tunnel Cloudflare éphémère vers ce port ;
3. affiche l'adresse publique, la page de documentation et l'URL de santé ;
4. arrête le serveur qu'il a démarré quand on quitte (Ctrl+C).

Prérequis : `tools/cloudflared.exe` (téléchargé depuis les releases Cloudflare, non
versionné). Le venv, l'interface compilée (`frontend/dist`) et le `.env` doivent
être à jour.

## 2. Ce qui protège l'instance

L'application n'a pas d'authentification : toute personne qui possède l'adresse
peut déposer un document et poser une question. Trois garde-fous limitent les
dégâts, côté serveur :

| Garde-fou | Variable | Défaut | Comportement |
|---|---|---|---|
| Taille d'un fichier | `MAX_UPLOAD_MB` | 20 | `413` avant lecture du corps si la taille annoncée dépasse |
| Volume total | `MAX_STORAGE_MB` | 500 | `507` quand le dossier d'uploads est plein |
| Débit des questions | `CHAT_RATE_LIMIT` / `CHAT_RATE_WINDOW_S` | 30 / 600 s | `429` avec en-tête `Retry-After`, par adresse cliente |

Le limiteur lit l'adresse réelle derrière le tunnel (`CF-Connecting-IP`) quand
`TRUST_PROXY_HEADERS=true`. La fenêtre est en mémoire : elle repart à zéro au
redémarrage et n'est pas partagée entre instances.

**Ce que ces garde-fous ne font pas** : ils ne protègent pas la confidentialité
des documents déposés, ni le contenu des réponses. Pour une instance publique
durable, il faut une authentification.

## 3. Limites du tunnel rapide

- L'adresse `*.trycloudflare.com` **change à chaque lancement** et n'offre aucune
  garantie de disponibilité.
- Le service dépend de la machine et de la connexion : si le poste s'endort, la
  page tombe.
- Cloudflare peut restreindre un tunnel anonyme en cas d'usage abusif.
- Débit et latence dépendent de la connexion montante.

Pour une démonstration devant un jury : lancer le script **10 à 15 minutes avant**,
le temps que le moteur charge, et garder la fenêtre ouverte. Une vidéo de secours
reste la meilleure assurance.

## 4. Passer à un serveur (plus tard)

L'image est prête : `backend/Dockerfile` construit l'interface, installe les
dépendances et pré-télécharge le modèle d'embedding.

```bash
docker build -t nunya -f backend/Dockerfile .
docker run -d --name nunya -p 8000:8000 \
  --env-file .env -v nunya-data:/srv/data --restart unless-stopped nunya
```

Dimensionnement constaté : image ~1,2–1,5 Go, ~1 Go de RAM une fois le modèle
chargé, démarrage à froid de quelques dizaines de secondes sur Linux (sans
antivirus pour scanner `torch`).

Sur un VPS (2 vCPU / 4 Go, ordre de 4–5 €/mois chez Hetzner ou équivalent) :

1. installer Docker, ouvrir 80/443 ;
2. placer Caddy devant l'application — TLS automatique, un seul bloc de configuration ;
3. pointer `app.<domaine>` vers le serveur, puis `docs.<domaine>` si la
   documentation devient un site séparé ;
4. sauvegarder le volume `/srv/data` (base vectorielle + journal + artefacts).

`docs/ETAT_DU_PROJET.md` rappelle que le déploiement permanent n'est pas encore
fait : c'est la prochaine étape après la validation visuelle.

## 4. Déploiement séparé : interface sur Vercel, API ailleurs

C'est l'architecture recommandée pour une mise en ligne durable. Elle suppose de
régler **trois choses** correctement, sinon la connexion échoue silencieusement.

### Pourquoi séparer

Vercel héberge très bien une interface statique, mais pas ce backend : le RAG
demande ~1 Go de RAM, un disque persistant pour Chroma et un processus qui reste
allumé. Les fonctions serverless de Vercel n'offrent ni l'un ni l'autre.

### 1. Dire à l'interface où est l'API

Sur Vercel, le projet a pour racine `frontend/` et deux réglages :

| Réglage | Valeur |
|---|---|
| Framework | Vite |
| Variable d'environnement | `VITE_API_BASE_URL=https://api.exemple.tg` (sans slash final) |

Le client préfixe toutes ses requêtes avec cette base, et les liens de
téléchargement des artefacts aussi. Vide, l'interface appelle la même origine
(cas « tout-en-un » servi par FastAPI).

`frontend/vercel.json` fournit déjà la configuration de build, la réécriture SPA
et le cache des assets.

### 2. Autoriser l'origine dans l'API

```
CORS_ORIGINS=https://app.exemple.tg,https://nunya.vercel.app
```

Pas de `*` : avec `allow_credentials`, le navigateur refuse une origine générique.

### 3. Le cookie de session — le point qui casse tout

Le cookie est `HttpOnly` et porte le jeton de session. Deux cas :

| Situation | Réglage | Conséquence |
|---|---|---|
| `app.exemple.tg` + `api.exemple.tg` | `COOKIE_SAMESITE=lax` | Même site : le cookie est envoyé normalement. **Recommandé.** |
| `nunya.vercel.app` + `api.onrender.com` | `COOKIE_SAMESITE=none` | Domaines différents : cookie **tiers**, souvent bloqué (Safari, Chrome) → connexion qui « ne tient pas » |

En mode `none`, le `Secure` est forcé : le cookie ne circulera qu'en HTTPS.
C'est pour cette raison qu'un **nom de domaine** (10–20 €/an) est vivement
conseillé : deux sous-domaines du même domaine évitent tout le problème.

### Déroulé

1. **Backend** : image Docker (`backend/Dockerfile`) sur un hôte avec volume
   persistant (`/srv/data`), ≥ 2 Go de RAM. Renseigner `GROQ_API_KEY`,
   `CORS_ORIGINS`, et `COOKIE_SAMESITE` selon le tableau ci-dessus.
2. **Frontend** : importer le dépôt sur Vercel, racine `frontend/`, ajouter
   `VITE_API_BASE_URL`, déployer.
3. **Vérifier** : créer un compte depuis l'URL publique, recharger la page (la
   session doit tenir), déposer un document, poser une question, ouvrir le carnet.

Si la session ne survit pas à un rechargement, regarder dans l'ordre : l'origine
exacte dans `CORS_ORIGINS`, l'attribut `SameSite` du cookie, puis le domaine.

## 5. Héberger l'API sur Hugging Face Spaces (gratuit)

C'est l'option gratuite qui tient le RAG : un Space Docker dispose de 2 vCPU et
**16 Go de RAM**, largement assez pour torch et le modèle.

### Mise en place, une fois

1. Sur huggingface.co → **New Space** → SDK **Docker** → template **Blank**.
2. Noter l'URL du Space : `https://huggingface.co/spaces/<compte>/<nom>`.
3. Depuis le dépôt :

```powershell
.\scripts\publier-space.ps1 -Space https://huggingface.co/spaces/<compte>/<nom>
```

Le script clone le Space, y copie `backend/app`, les `requirements`, le
`Dockerfile` et le README de `deploy/huggingface/`, puis pousse. Le Space
reconstruit son image (compter 10 à 20 minutes la première fois).

4. Dans les réglages du Space → **Variables and secrets** :

| Nom | Valeur |
|---|---|
| `GROQ_API_KEY` | la clé du fournisseur |
| `CORS_ORIGINS` | l'URL exacte de l'interface Vercel |
| `COOKIE_SAMESITE` | `none` (HTTPS, domaines différents) |
| `TRUST_PROXY_HEADERS` | `true` |

5. L'URL publique de l'API se trouve dans l'onglet **Embed this Space**. La
   vérifier : `https://<url>/health` doit renvoyer `rag: true` une fois le
   moteur chargé.

### Ce qu'il faut accepter

- **Disque éphémère** : comptes, documents et carnets disparaissent à chaque
  redémarrage ou mise en veille. Pour une démonstration, on redépose un document.
- **Veille** : le Space s'endort sans visite. Le premier appel réveille le
  conteneur et recharge le modèle — ouvrir le lien quelques minutes avant.
- **Code public** : un Space gratuit est public, y compris ses fichiers.

Pour des données persistantes, il faut Oracle Always Free (disque de 200 Go,
mais ARM et carte bancaire) ou un VPS à ~5 €/mois.

## 6. Sauvegarde et restauration

Tout l'état tient dans `data/` :

```
data/
├── chroma/      # index vectoriel
├── uploads/     # documents déposés
├── artifacts/   # résumés et quiz enregistrés (Markdown, JSON)
└── journal.db   # sources, artefacts, traces d'outils
```

```powershell
Compress-Archive -Path data -DestinationPath "sauvegarde-nunya-$(Get-Date -f yyyyMMdd).zip"
```

Restauration : décompresser au même endroit, redémarrer le serveur. Aucune
migration n'est nécessaire.

## 7. Checklist avant une démonstration

- [ ] `frontend/dist` reconstruit après la dernière modification (`npm run build`)
- [ ] `.env` présent avec `GROQ_API_KEY`
- [ ] serveur démarré, badge « Prêt »
- [ ] 2 ou 3 documents indexés et cochés
- [ ] une question testée, un résumé et un quiz générés
- [ ] tunnel ouvert, adresse notée
- [ ] sauvegarde de `data/` faite
