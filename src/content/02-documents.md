# Documents

## Formats acceptés

| Format | Extraction | Remarque |
|---|---|---|
| **PDF** | Texte couche par couche (`pypdf`) | Un scan photographique ne contient pas de texte : il est refusé avec un message explicite. |
| **Word (.docx)** | Paragraphes **et tableaux**, dans l'ordre du document | Un cours présenté en tableau reste interrogeable. |
| **.txt / .md** | Lecture directe en UTF-8 | Utile pour tester rapidement. |

## Ce qui se passe au dépôt

1. Le fichier est enregistré dans l'espace de travail du serveur.
2. Le texte est extrait, nettoyé, puis découpé en passages d'environ
   **1 000 caractères**, avec un recouvrement de 150 caractères pour ne pas
   couper une idée en deux.
3. Chaque passage est transformé en vecteur par un modèle multilingue, puis
   stocké dans une base vectorielle locale.
4. Le nombre de passages s'affiche sous le nom du fichier.

L'indexation est réelle : le nombre de passages affiché est celui qui a été
calculé, pas une valeur forfaitaire.

## Sélectionner les sources d'une question

Chaque document possède une case à cocher.

- **Coché** : ses passages peuvent être utilisés pour répondre.
- **Décoché** : il est ignoré pour cette question.
- Le compteur du volet Discussion (`2/3 sources`) indique combien de documents
  sont réellement interrogés.

Le bouton **Toutes / Aucune** sélectionne ou désélectionne l'ensemble. Sans aucune
source cochée, l'envoi est bloqué : l'agent n'a rien à lire.

## Retirer un document

L'icône corbeille, au survol d'une ligne, supprime le document **et son index**.
Après suppression, ses passages ne peuvent plus apparaître dans une réponse. Le
fichier déposé est également effacé du disque.

## Limites de taille

Le service refuse un fichier au-delà de **20 Mo** (réglable côté serveur) et
bloque les dépôts lorsque le dossier d'uploads atteint son plafond (500 Mo par
défaut). Ces limites protègent le disque du serveur, pas ta confidentialité.
