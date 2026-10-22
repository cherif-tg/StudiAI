# Atelier et carnet

## L'Atelier : ce qui s'affiche

L'Atelier est le volet de droite. Il reçoit les résultats produits par l'agent :

- **Résumé** — un texte structuré en Markdown, généré depuis tes passages.
- **Quiz** — un QCM avec quatre choix par question, une bonne réponse et une
  explication.

Les autres outils (graphique, fiche bilingue, export) sont visibles mais
désactivés : ils ne sont pas branchés sur le moteur du MVP, et rien ne simule
leur fonctionnement.

## La règle centrale : rien n'est enregistré sans toi

Un résumé ou un quiz affiché **n'existe que dans l'Atelier**. Il ne rejoint le
carnet que si tu cliques sur **Ajouter au Carnet**.

Cette règle est structurelle, pas un réglage : les outils de génération ne
peuvent pas écrire dans le carnet. Seul ton clic déclenche l'enregistrement.

## Jouer un quiz

1. Lis la question et clique sur une réponse.
2. La bonne réponse se colore en vert, ton erreur en rouge, avec l'explication.
3. **Question suivante** jusqu'à la fin, puis le score.
4. **Rejouer** remet le quiz à zéro ; **Ajouter au Carnet** l'enregistre.

Le quiz enregistré conserve les questions, les choix et les explications au
format JSON : il reste lisible même sans l'application.

## Le carnet — « Mon Nunyati »

Le carnet liste ce que tu as explicitement gardé, du plus récent au plus ancien.

| Élément | Détail |
|---|---|
| Filtres | Tout, Résumés, Quiz — avec le nombre pour chaque catégorie |
| Métadonnées | Type, date et heure d'enregistrement |
| Actions | **Ouvrir** (dans un onglet) et **Télécharger** |

Les artefacts sont rattachés à la session : une nouvelle session repart avec un
carnet vide, sans supprimer tes documents.

## Ce que le carnet ne fait pas encore

Le suivi par notion et l'historique des scores de quiz ne sont pas implémentés.
Aucune progression chiffrée n'est affichée : mieux vaut pas de mesure qu'une
mesure inventée.
