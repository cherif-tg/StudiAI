# Politique de confidentialité

Cette politique explique quelles données personnelles Nunya collecte, pourquoi, où
elles sont stockées, comment elles sont protégées et quels sont tes droits. Elle
s'applique à l'instance de Nunya que tu utilises, exploitée par {{EDITEUR}}.

## En bref {#en-bref}

- Nunya collecte uniquement ce qui sert à faire fonctionner ton atelier : ton compte, les documents que tu déposes et ce que tu choisis de garder dans ton carnet.
- Tes documents sont stockés sur le serveur qui héberge l'instance, pas chez un tiers.
- Pour rédiger une réponse, ta question et les passages utiles de tes documents sont envoyés au fournisseur du modèle de langage, au moment de la question.
- Aucune publicité, aucune revente de données, aucun cookie de mesure d'audience.
- Tu peux retirer un document à tout moment ; son index est supprimé avec lui.

## Responsable du traitement {#responsable}

Le responsable du traitement est {{EDITEUR}}, qui exploite cette instance de Nunya.
Pour toute question sur tes données ou pour exercer tes droits, écris à
{{CONTACT}}.

Nunya est un logiciel qui peut être auto-hébergé : si une école, une association
ou un enseignant installe sa propre instance, c'est cette structure qui est
responsable des données traitées sur son serveur.

## Données collectées {#donnees}

| Catégorie | Données | Origine | Utilisation |
|---|---|---|---|
| **Compte** | Prénom ou nom, adresse e-mail, mot de passe | Formulaire d'inscription | Créer ton espace et t'identifier |
| **Documents** | Fichiers déposés (PDF, Word, texte), texte extrait, passages et leurs vecteurs | Tes dépôts | Répondre à tes questions à partir de tes cours |
| **Conversation** | Questions posées, réponses, outils utilisés | Utilisation de l'atelier | Afficher la discussion en cours |
| **Carnet** | Résumés et quiz que tu as choisi d'enregistrer | Clic sur « Ajouter au Carnet » | Les retrouver plus tard, depuis n'importe quel appareil |
| **Avis sur les réponses** | Utile ou inutile, motif éventuel, la question et la réponse concernées | Clic sur les pouces sous une réponse | Améliorer la qualité des réponses |
| **Données techniques** | Adresse IP, date et heure des requêtes, erreurs | Ton navigateur | Sécurité, limitation des abus, diagnostic |
| **Contact** | Adresse e-mail et message | Formulaire de contact | Répondre à ta demande |
| **Préférences** | Thème, mode de réponse, identifiant de conversation, choix sur les cookies | Ton navigateur | Garder tes réglages sur cet appareil |

Le mot de passe n'est **jamais stocké en clair** : seule une empreinte calculée
avec l'algorithme `scrypt` et un sel propre à chaque compte est conservée.

Nunya ne te demande aucune donnée sensible (santé, opinions, origine, données
biométriques). Évite d'en déposer dans tes documents : elles ne sont pas
nécessaires au service.

## Pourquoi nous les utilisons {#finalites}

| Finalité | Fondement |
|---|---|
| Créer et gérer ton compte, ouvrir ta session | Exécution du service que tu as demandé |
| Indexer tes documents et répondre à tes questions | Exécution du service que tu as demandé |
| Conserver les résumés et quiz que tu enregistres | Ton action explicite (« Ajouter au Carnet ») |
| Protéger le service (limites de taille, de stockage et de débit) | Intérêt légitime : sécurité et disponibilité |
| Répondre à tes messages | Ton consentement, donné en envoyant le formulaire |
| Recueillir ton avis sur une réponse | Ton action explicite (clic sur un pouce) |

Tes données ne servent **jamais** à de la publicité, à du profilage commercial ni
à entraîner un modèle d'intelligence artificielle.

## Qui y a accès {#destinataires}

- **Toi seul**, pour tes documents et ton carnet : chaque compte est isolé, et un artefact n'est servi qu'après contrôle de son propriétaire.
- **L'administrateur de l'instance**, techniquement, puisqu'il gère le serveur. Sur une instance publique de démonstration, ne dépose rien de confidentiel.
- **Le fournisseur du modèle de langage** (Groq par défaut, ou celui configuré par l'administrateur) reçoit ta question et les passages nécessaires à la réponse, au moment où tu la poses. Il ne reçoit ni ton mot de passe ni tes documents complets.
- **{{HEBERGEUR}}**, qui fournit la machine sur laquelle tourne l'instance.

Aucune donnée n'est vendue ni cédée à des fins commerciales.

## Transferts hors du Togo {#transferts}

Le fournisseur du modèle de langage peut traiter les données en dehors du Togo.
Conformément à la loi n° 2019-014 du 29 octobre 2019 relative à la protection des
données à caractère personnel, un tel transfert n'est effectué que vers un
prestataire offrant un niveau de protection adéquat, et seules les données
strictement nécessaires à la réponse sont transmises.

## Durée de conservation {#conservation}

| Données | Durée |
|---|---|
| Compte | Tant que le compte existe ; supprimé sur simple demande |
| Documents et leur index | Jusqu'à ce que tu les retires depuis l'atelier |
| Historique de discussion | Côté serveur : en mémoire, effacé au redémarrage. Dans ton navigateur : les 30 dernières conversations, jusqu'à ce que tu les effaces |
| Carnet | Tant que le compte existe |
| Session de connexion | 30 jours, ou jusqu'à ce que tu cliques sur « Quitter » |
| Données techniques | Durée limitée, nécessaire à la sécurité et au diagnostic |
| Messages de contact | Le temps de traiter ta demande, puis 12 mois au plus |

## Sécurité {#securite}

- Mots de passe hachés avec `scrypt` et un sel par compte.
- Session portée par un cookie `httpOnly` et `SameSite=Lax`, inaccessible aux scripts de la page ; le serveur n'en garde que l'empreinte SHA-256.
- Isolation des comptes : documents, index et carnet sont rattachés à ton compte.
- Contrôle du propriétaire avant de servir un artefact.
- Limites de taille de fichier, de stockage et de nombre de questions pour prévenir les abus.
- Connexion chiffrée (HTTPS) recommandée pour toute instance accessible sur Internet.

Aucun système n'est invulnérable. En cas de violation de données susceptible de
te concerner, tu en seras informé dans les meilleurs délais.

## Cookies et stockage local {#cookies}

Nunya n'utilise **aucun cookie publicitaire ni de mesure d'audience**. Les seuls
éléments déposés sur ton appareil sont nécessaires au fonctionnement du service
ou à la mémorisation de tes préférences.

| Nom | Type | Rôle | Durée |
|---|---|---|---|
| `nunya_session` | Cookie strictement nécessaire | Garder ta session ouverte | 30 jours |
| `nunya.theme` | Stockage local | Thème clair ou sombre | Jusqu'à effacement |
| `nunya.mode` | Stockage local | Mode de réponse choisi | Jusqu'à effacement |
| `nunya.session` | Stockage local | Identifiant de la conversation en cours | Jusqu'à effacement |
| `nunya.cookies` | Stockage local | Mémoriser ton choix sur ce bandeau | 12 mois |
| `nunya.conversations.*`, `nunya.conv.*` | Stockage local | Historique de tes conversations, pour les reprendre | Jusqu'à effacement |
| `nunya.revision.*` | Stockage local | Questions à revoir et réussite par notion | Jusqu'à effacement |
| `nunya.avis.*` | Stockage local | Tes avis sur les réponses (pour afficher ton choix) | Jusqu'à effacement |
| `nunya.installation` | Stockage local | Ne pas reproposer l'installation pendant 7 jours après « Plus tard » | 7 jours |
| Cache de l'application | Cache du navigateur | Ouvrir l'application et lire ton carnet hors ligne | Vidé à la déconnexion |

Tu peux effacer ces éléments à tout moment depuis les réglages de ton navigateur.
Sans le cookie de session, tu devras simplement te reconnecter.

## Tes droits {#droits}

Conformément à la loi togolaise n° 2019-014, tu disposes des droits suivants sur
tes données :

- **Information** : savoir quelles données sont traitées et pourquoi (cette page).
- **Accès** : obtenir une copie des données qui te concernent.
- **Rectification** : corriger une donnée inexacte.
- **Opposition** : t'opposer à un traitement, pour un motif légitime.
- **Effacement** : demander la suppression de ton compte et de tes données.

Plusieurs actions sont directes, sans rien demander à personne :

- retirer un document depuis l'atelier efface le fichier et son index ;
- **Réglages, Mes données, Télécharger** fournit une copie de tes données ;
- **Réglages, Mes données, Supprimer mon compte** efface ton compte et tout son contenu (si l'instance propose cette fonction) ;
- **Réglages, Mes données, Effacer** supprime l'historique et les révisions gardés sur l'appareil.

Pour les autres demandes, écris à {{CONTACT}} ; une réponse
te sera apportée dans un délai d'un mois.

Si tu estimes que tes droits ne sont pas respectés, tu peux saisir l'Instance de
Protection des Données à Caractère Personnel (IPDCP), autorité de contrôle au Togo.

## Mineurs {#mineurs}

Nunya s'adresse aussi aux élèves. Si tu as moins de 18 ans, demande l'accord d'un
parent ou d'un responsable légal avant de créer un compte.

## Modifications {#modifications}

Cette politique peut évoluer avec le service. En cas de changement important, un
message te l'indiquera dans l'application. La date de dernière mise à jour figure
en haut de cette page.
