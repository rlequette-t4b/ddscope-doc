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

- [x] Flag skip_in_layout sur map_flows ✓ _(spécifié mai 2026 — map_flows.skip_in_layout : exclut le flow du calcul de rang BFS dans runLayout ; checkbox dans le flow panel, indépendant par map ; permet d'aligner verticalement des nœuds reliés par des flows non-séquentiels)_

---

## Données / Modèle

_Idées relatives au modèle de données, champs, entités._

- [x] Ajouter les BOM ✓ _(implémenté)_

- [ ] Ajouter customer tolerance et demande

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
