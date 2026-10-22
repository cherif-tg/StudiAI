# Nunya — étude graphique

> **Nunya** : « connaissance, sagesse » en éwé. Un outil d'apprentissage sobre, ancré au Togo, construit autour de **Nunyati**, l'arbre de la connaissance.

---

## 1. Principes

- **Ancré, pas importé** : chaque teinte renvoie à une référence concrète (école, sol, teinture, culture).
- **Sobre** : peu de couleurs, beaucoup d'air, un seul accent fort à la fois.
- **Fluide** : pas de lignes de séparation rigides ; les zones se distinguent par le ton, l'ombre douce et l'espace.
- **Multilingue dès le départ** : français, éwé, kabiyè. La typographie doit couvrir les caractères éwé.

---

## 2. Palette

| Nom | Hex | Usage |
|---|---|---|
| Ardoise | `#1B2A2E` | Texte, fond sombre |
| Craie | `#EFEAE1` | Fond clair |
| Terre de barre | `#A6472E` | Accent principal, boutons |
| Indigo adire | `#2B4357` | Accent secondaire, liens, citations |
| Vert mil | `#5C6B4F` | Progression, succès |
| Sable | `#C9C0AF` | Pistes de barres, séparateurs discrets |

Références : l'ardoise et la craie de l'école ; la terre de barre, sol latéritique du sud du Togo ; l'indigo des teintures adire ; le mil pour la croissance.

### Jetons d'interface

| Jeton | Clair | Sombre |
|---|---|---|
| `--bg` | `#EFEAE1` | `#121A19` |
| `--panel` | `#FBF9F4` | `#1F2C2A` |
| `--side` | `#F6F2E9` | `#1A2523` |
| `--ink` | `#1B2A2E` | `#EDE7D9` |
| `--muted` | `#6B6456` | `#A79F8C` |
| `--accent` | `#A6472E` | `#D98562` |
| `--info` | `#2B4357` | `#7C9CB4` |
| `--green` | `#5C6B4F` | `#8FA37E` |
| `--ochre` | `#8A6B2E` | `#D9B15E` |
| `--red` | `#8C3A3A` | `#D98A85` |

**Raisonnement** : en mode sombre, les accents sont éclaircis (et non simplement conservés) pour garder un contraste de lecture suffisant sur fond ardoise.

---

## 3. Typographie

- **Titres** : *Fraunces* (600, italique 500 pour les accroches) : chaleur éditoriale.
- **Texte courant et interface** : *Work Sans* (400 / 500 / 600) : lisibilité sobre à toutes les tailles.
- **Couverture éwé** : testée sur `Ɖɖ Ƒƒ Ɣɣ Ŋŋ Ɔɔ Ʋʋ Ɛɛ` ; ce test est affiché sur l'écran d'accueil de la maquette. Garder une pile de secours (`Georgia`, `system-ui`).

---

## 4. Logo — Nunyati

Une tige verte (le mil, la croissance) et deux branches : l'une verte, l'autre terre de barre. Lecture : le français et l'éwé portés par la même tige.

| Fichier | Usage |
|---|---|
| `nunya-marque.svg` | Marque seule |
| `nunya-logo-clair.svg` | Lockup horizontal, fonds clairs |
| `nunya-logo-sombre.svg` | Lockup horizontal, fonds sombres |
| `nunya-favicon.svg` | Icône d'application / favicon |

Règles :
- Zone de protection : au minimum la largeur de la tige de chaque côté de la marque.
- Taille minimale de la marque : 20 px à l'écran.
- Le mot « Nunya » est en texte vivant (Fraunces). Pour une impression ou un envoi externe, **convertir le texte en tracés** (Inkscape, Figma, Illustrator).
- En mode sombre, utiliser les variantes éclaircies (vert `#8FA37E`, terre `#D98562`).

### Nom du Carnet

« Nunyati » devient le nom donné au Carnet de progression : *Mon Nunyati*, ce que j'ai fait grandir. À valider ; il suffit de revenir à « Carnet » si le doublon avec le nom du produit gêne.

---

## 5. Formes des artefacts

Chaque type d'artefact a une forme et une couleur propres, pour être reconnu d'un coup d'œil dans l'Atelier et dans le Carnet.

| Type | Forme | Couleur | Glyphe intérieur |
|---|---|---|---|
| Fiche | Carré arrondi | Terre de barre | Lignes de texte |
| Résumé | Cercle | Indigo | Lignes de texte courtes |
| Quiz | Losange | Vert mil | Point d'interrogation |
| Graphique | Hexagone | Ocre | Trois barres |
| Export | Page à coin plié | Gris chaud | Flèche vers le bas |

**Raisonnement** : la forme porte le sens en premier et la couleur le renforce, pour que les types restent distinguables même sans voir les couleurs (daltonisme, mode sombre).

---

## 6. Interface fluide

- Trois zones (Sources, Discussion, Atelier) séparées par un espace de 14 px, sans trait.
- Sources et Atelier : cartes douces, coins de 22 px, ombre légère.
- Discussion : fond translucide, qui se fond dans la page.
- Boutons, onglets et champ de saisie : forme en pilule.
- Fond de page : deux halos de couleur très diffus (terre et indigo).
- Sous 980 px, les trois zones s'empilent.
- Mode clair/sombre : bouton dans la barre du haut ; suit le réglage du système tant que l'utilisateur n'a pas choisi.
- Les animations respectent `prefers-reduced-motion`.

---

## 7. Points à valider

- **Sceau « ƒ »** : piste exploratoire à côté du nom, non retenue dans la maquette. À valider avec un œil éwé avant adoption.
- **Traductions** : générées automatiquement dans la maquette ; toute traduction éwé ou kabiyè doit être relue par un locuteur natif.
- **Kabiyè** : la couverture typographique des caractères spécifiques n'a pas encore été testée.
