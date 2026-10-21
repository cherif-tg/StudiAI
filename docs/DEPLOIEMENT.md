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

## 5. Sauvegarde et restauration

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

## 6. Checklist avant une démonstration

- [ ] `frontend/dist` reconstruit après la dernière modification (`npm run build`)
- [ ] `.env` présent avec `GROQ_API_KEY`
- [ ] serveur démarré, badge « Prêt »
- [ ] 2 ou 3 documents indexés et cochés
- [ ] une question testée, un résumé et un quiz générés
- [ ] tunnel ouvert, adresse notée
- [ ] sauvegarde de `data/` faite
