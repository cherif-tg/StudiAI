# Limites et dépannage

## Ce que cette version ne fait pas

| Sujet | État | Pourquoi |
|---|---|---|
| Traduction en éwé | Désactivée | Le service existe, le modèle n'est pas branché côté production |
| Kabiyè | Non couvert | Couverture typographique encore à valider |
| Fiche bilingue | Désactivée | Dépend de la traduction |
| Graphiques | Désactivés | Les gabarits ne sont pas branchés |
| Export PDF / Word | Désactivé | Prévu après stabilisation du carnet |
| Comptes utilisateurs | Présents | Inscription, connexion, session de 30 jours |
| Réinitialisation du mot de passe | Absente | Pas d'envoi d'e-mail dans cette version ; créer un nouveau compte |
| Suivi par notion, scores | Absents | Hors périmètre MVP |
| Historique de discussion | Volatile | Conservé en mémoire, perdu au redémarrage |

Ces éléments sont signalés dans l'interface quand ils sont visibles. Aucun n'est
simulé.

## Performance

- **Premier démarrage** : de 30 secondes à plusieurs minutes selon la machine,
  le temps de charger le modèle d'embedding. Sur Windows, l'antivirus qui analyse
  les bibliothèques peut multiplier ce temps.
- **Une question** : quelques secondes, dont l'appel au modèle de langage.
- **Un dépôt** : environ une seconde après le chargement du moteur.

## Dépannage

### « Serveur injoignable »

Le backend n'est pas démarré, ou il écoute sur un autre port. Vérifie
`http://127.0.0.1:8000/health` dans un navigateur.

### Le badge reste sur « Moteur en préparation »
Le modèle se charge encore. Laisse le serveur tranquille : tuer le processus
pendant le chargement fait perdre le travail et recommence au démarrage suivant.
Regarde la sortie du serveur, elle indique l'avancement.

### « GROQ_API_KEY manquant »

La clé est absente du fichier `.env` à la racine du projet. La recherche
documentaire continue de fonctionner, mais aucune réponse ne peut être rédigée.

### Mot de passe oublié

Il n'y a pas encore de réinitialisation par e-mail. Contacte l'administrateur de
l'instance, ou crée un nouveau compte : les documents d'un compte ne sont pas
accessibles depuis un autre.

### « Connecte-toi pour accéder à l'atelier »

La session a expiré (30 jours) ou le cookie a été effacé. Reconnecte-toi : tes
documents et ton carnet sont toujours là.

### Un document n'est pas indexé

- PDF scanné sans couche texte : refuse-le, il n'y a rien à extraire.
- Fichier trop volumineux : la limite est indiquée dans le message d'erreur.
- Stockage plein : retire un document avant d'en déposer un autre.

### Les réponses ne citent pas le bon document

Vérifie les cases cochées dans le volet Sources. Un document décoché est ignoré,
même s'il contient la réponse.

### Après une mise à jour, l'ancienne interface s'affiche

L'interface compilée est servie depuis `frontend/dist`. Reconstruis-la :

```powershell
cd frontend
npm run build
```

## Confidentialité

- Les documents sont stockés sur le serveur qui héberge l'instance, pas chez un
  tiers.
- Les passages nécessaires à une réponse sont envoyés au fournisseur du modèle de
  langage (Groq par défaut) au moment de la question.
- Supprimer un document retire ses passages de l'index et efface le fichier.
- Sur une instance publique de démonstration, considère que tout document déposé
  est visible par l'administrateur du serveur : ne dépose rien de confidentiel.
