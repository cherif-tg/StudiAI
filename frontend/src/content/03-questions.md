# Questions et réponses

## Comment l'agent travaille

Nunya n'est pas un chatbot qui « sait des choses » : c'est un agent qui décide
d'aller chercher dans tes documents avant de répondre.

1. Il reçoit ta question et l'historique récent de la conversation.
2. Il choisit d'appeler un outil — le plus souvent la **recherche documentaire**.
3. La recherche renvoie les passages les plus proches de ta question.
4. Il rédige la réponse à partir de ces passages, puis l'affiche.

Sous chaque réponse, de petits badges indiquent les outils réellement utilisés :

| Badge | Sens |
|---|---|
| `recherche` | Des passages de tes documents ont été consultés. |
| `résumé` | L'outil de résumé a été appelé (le résultat va dans l'Atelier). |
| `quiz` | L'outil de quiz a été appelé (le quiz va dans l'Atelier). |

C'est une trace, pas une décoration : si aucun badge n'apparaît, la réponse n'a
pas consulté tes sources.

## Quand l'information n'est pas dans tes documents

L'agent doit refuser plutôt qu'inventer. Il répond alors quelque chose comme :

> Les documents que vous avez fournis ne contiennent aucune information
> concernant…

C'est le comportement attendu. Si tu penses qu'il se trompe, vérifie que le
document est bien indexé et **coché**, puis reformule avec les mots du cours.

## Écrire une bonne question

- **Nomme le sujet** : « le cycle de Calvin » plutôt que « ça ».
- **Une question à la fois** : deux questions dans un message donnent souvent une
  réponse à une seule.
- **Utilise le vocabulaire du cours** : la recherche compare des sens, pas des
  mots-clés exacts, mais le vocabulaire du document reste le plus proche.
- Pour un support, demande explicitement : « fais-moi un résumé », « génère un
  quiz de 5 questions ».

## Les modes de réponse

Le bouton au bout de la zone de saisie change la **manière** dont l'agent répond. Il ne
change pas ses règles : dans tous les modes, il répond uniquement à partir de tes
documents, et n'enregistre rien sans ton clic.

| Mode | Ce qu'il fait | Quand l'utiliser |
|---|---|---|
| **Standard** | Réponse directe, trois à six phrases | Question simple |
| **Tuteur socratique** | Une question à la fois, exemples et analogies : c'est toi qui trouves la réponse | Comprendre une notion difficile |
| **Réflexion** | Reformule, découpe en sous-questions, montre le plan et les limites | Problème complexe, plusieurs documents |
| **Précis** | Une à trois phrases, termes et chiffres exacts, sans introduction | Vérifier une définition, une date |

Le mode choisi est mémorisé sur ton appareil. Tu peux en changer au milieu d'une
conversation : le changement s'applique au message suivant.

## Conversation et mémoire

L'agent garde les derniers échanges en mémoire pour comprendre les reprises
(« et le second point ? »). Cette mémoire est **locale au serveur et volatile** :
un redémarrage l'efface. Tes documents et tes artefacts, eux, persistent.

## Temps de réponse

Une question coûte typiquement quelques secondes : recherche vectorielle locale,
puis appel au modèle de langage. Le premier chargement du moteur, lui, peut
prendre plusieurs minutes après un démarrage — c'est pour cela que le badge
« Moteur en préparation » existe.
