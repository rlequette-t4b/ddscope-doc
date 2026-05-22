- [DDScope — Backlog d'idées](#ddscope--backlog-didées)
  - [UX / Interface](#ux--interface)
  - [Map / Visualisation](#map--visualisation)
  - [Données / Modèle](#données--modèle)
  - [Assistant IA](#assistant-ia)
  - [Export / Import](#export--import)
  - [Gestion de projet](#gestion-de-projet)
  - [Divers](#divers)
# DDScope — Backlog d'idées

> Fichier de collecte d'idées, améliorations et fonctions manquantes.
> Pas encore des to-do de développement — étape amont.

---

## UX / Interface

_Idées relatives à l'expérience utilisateur, navigation, ergonomie._

---

## Map / Visualisation

_Idées relatives au canvas Cytoscape, swim-lanes, rendu visuel._

- [ ] Afficher customer tolerance

- [ ] Afficher lead time swimlanes

- [x] Améliorer le layout ✓ _(implémenté mai 2026 — BFS ranking local par swim-lane, centrage horizontal, plage rang min/max, répartition verticale bornée par YMin/YMax; nœuds hors swimlanes non déplacés)_

- [x] Utiliser les tags pour la visualisation ✓ _(implémenté mai 2026 — tag_colors : association tag → couleur, coloriage background des nœuds par premier tag matché, mise à jour immédiate lors de l'édition des tags dans le side panel)_

- [x] Légende ✓ _(implémenté mai 2026 — overlay SVG inline bas-gauche, entrées (type × tag) présentes sur la map active, groupées par type de nœud, toggle persisté dans maps.legend_visible, compatible html2canvas)_

- [x] Contrôle du coude des arêtes taxi ✓ _(implémenté mai 2026 — waypoint handle draggable, waypoint_pct persisté dans map_flows, double-clic reset)_

- [x] Snap d'alignement vertical au drag ✓ _(implémenté mai 2026 — règle 1 : voisins directs ; règle 2 : médian de deux voisins alignés en colonne sans nœud intermédiaire)_

- [x] Layout offset sur map_flows ✓ _(spécifié mai 2026 — map_flows.skip_in_layout : change le poids d'une arête dans le BFS du layout, permet de changer les nœuds de colonne)_

- [x] Selection multiple

- [x] CTT visuel sur la map ✓ _(implémenté mai 2026 — overlay HTML rouge par nœud, label "CTT: X days", drag repositionnement, drag handles resize symétrique, sync pan/zoom et node drag, renderCTTOverlays appelé sur show/hide/update/delete)_

- [ ] **Badges sur les nœuds Cytoscape**

  Afficher des indicateurs visuels directement sur les nœuds de la map.

  Deux catégories :

  - **Icônes liées aux tags** — un badge apparaît quand un tag spécifique est présent sur le nœud. Tags cibles : `warning` (⚠️), `info` (ℹ️), `buffer` (icône dédiée). Liste configurable (lien potentiel avec tag_colors ou table dédiée).

  - **État "demande définie"** — badge affiché quand au moins un SKU du nœud possède un enregistrement `demands`.

  Comportement attendu :
  - Plusieurs badges peuvent coexister sur un même nœud (ex. warning + demande définie).
  - Disposition en rangée, coin supérieur droit du nœud.
  - Approche technique retenue : nœuds Cytoscape fantômes (même pattern que les note ghosts) — synchronisation pan/zoom automatique, compatible html2canvas.
  - Visibilité à définir : toutes maps ou toggle par map.

- [ ] Tag-style special selection, en cas de conflit avec les autres tag styles

- [ ] Ajouter un paramétrage de l'offset du bord de swim-lane dans le layout

---

## Données / Modèle

_Idées relatives au modèle de données, champs, entités._

- [x] Ajouter les BOM ✓ _(implémenté)_

- [x] Ajouter customer tolerance et demande ✓ _(implémenté mai 2026 — demands, map_demands, DDS_DURATION, CTT visuel)_

---

## Assistant IA

_Idées relatives à l'assistant IA intégré (DDScope AI Assistant)._

- [x] Panneau plus large et police plus grande pour la lisibilité ✓ _(implémenté mai 2026)_

---

## Export / Import

_Idées relatives aux exports PDF, Excel, handoff DDOpt._

---

## Gestion de projet

_Idées relatives à la liste de projets, duplication, templates._

- [x] Création de projet, sans ou avec template : autre projet ou JSON, copie types et swimlanes en option

---

## Divers

_Idées sans catégorie claire._

- [ ] Ajouter les painpoints/objectifs
  
  - Faire un doc séparé
  
  - Catégories : 7 raisons buffers DDMRP (ajout customs ?)
  
  - Liens avec les nœuds et badge sur les nœuds
  
  - Panneau dédié 

- [ ] Ajouter le flux information : rôles, entités

- [ ] Autocomplétion des tags dans tous les champs de saisie de tags (nœud, flow, produit, SKU, table tag colors) — v2

---

_Dernière mise à jour : mai 2026_
