# DDScope — Elements Lifecycle

> **Working document** — captures design decisions and open questions for each entity's lifecycle (create, place, edit, remove from map, delete). To be merged into `DDScope_UI.md` once stabilised.

---

## Version History

| Version | Date     | Notes                                      |
|---------|----------|--------------------------------------------|
| 0.1     | May 2026 | Initial draft — decisions from design session |

---

## Overview

Each entity in DDScope has two distinct lifecycles:

- **Functional lifecycle** — existence in the project data model (create, edit, delete).
- **Presentation lifecycle** — visibility on a specific map (place, remove from map).

The two lifecycles are independent: an entity can exist in the project without appearing on any map, and can appear on multiple maps simultaneously (with the exception of Annotations — see §7).

### General principles

- **Table views** for Nodes, Flows, and Annotations are **read-only + delete**. No inline editing. The canonical editing surface for these entities is the side panel on the map. The table serves as a project-wide review surface.
- **Products, BOMs, and Demand** retain inline editing in their respective table views, as the map offers no equivalent editing surface for them.
- All table views for Nodes, Flows, and Annotations include a **Maps column** (read-only) listing the names of maps on which the entity is currently placed, comma-separated.
- **Remove modal warning** — when "Remove only from map" is selected and the entity appears on only one map, a warning is displayed: *"This element only appears on this map. Removing it will make it invisible across the entire project."* The action remains available — the warning is informational, not blocking.

---

## 1. Node

### Create

Via the **+ Node** button in the map toolbar. A modal opens with name, type, and swim-lane fields. On confirm, the node is created in the functional model and placed on the active map at a computed position.

**Planned — search/create field (replaces Elements panel for nodes):**
A search input in the toolbar allows typing a node name. Behaviour:
- Name matches an existing node already on the active map → selects it on the canvas.
- Name matches an existing node not yet on the active map → places it on the active map.
- Name does not match any existing node → offers `+ Create "[name]"` → creates and places.

This replaces the Elements panel for node placement.

### Place on map

Via the search/create field described above. A node can appear on multiple maps.

### Edit

Via the **side panel** (click node on canvas). Fields: name, type, swim-lane, tags, notes, note overlay toggle, label position.

The **Nodes table** is read-only. No inline editing.

### Remove from map

Via the **Remove** button in the toolbar with the node selected. The Remove modal offers:
- **Remove only from map** (checkbox) — removes the node from the active map only; the functional model is unchanged.
- **Delete** (default, unchecked) — full delete with cascade (see Delete below).

If the node appears on only one map and "Remove only from map" is checked, a warning is displayed (see Overview).

Removing a node from a map automatically removes all flows where that node is source or target on that map.

### Delete

Full delete via the Remove modal (unchecked). Cascade:
- All flows where this node is source or target (and their map records).
- All SKUs for this node (and their demand records and map_demands).
- All BOMs for this node and their components.
- All map_nodes records across all maps.

---

## 2. Flow

### Create

By **drag and drop** on the canvas between two nodes. No modal for creation — the flow is created immediately with empty products and no lead time.

**Planned — existing flow detection:**
When a D&D creates a flow between two nodes that already have one or more flows between them on other maps (but not the active map), a dialogue opens listing those existing flows and offering:
- **Select an existing flow** → places it on the active map (with its products, lead time, tags, notes).
- **Create a new flow** → creates a distinct flow between the same nodes (e.g. different transport mode).

If no flow exists between those nodes on any other map, no dialogue — the new flow is created directly.

### Place on map

Via the existing flow selection dialogue described above (D&D trigger). A flow can appear on multiple maps, independently of whether both endpoint nodes are visible on each map.

> **Open question:** should placing a flow on a map require both endpoint nodes to be present on that map? Currently the Elements panel enforces this. The new D&D dialogue context makes this constraint natural (nodes are already on the canvas for the D&D to occur), but the constraint should be documented explicitly.

### Edit

Via the **side panel** (click flow on canvas). Fields: lead time, tags, notes, products, layout controls, bidirectional toggle, note overlay.

The **Flows table** is read-only. No inline editing.

### Remove from map

Via the **Remove** button in the toolbar with the flow selected. Same Remove modal as nodes.

If the flow appears on only one map and "Remove only from map" is checked, a warning is displayed (see Overview).

### Delete

Full delete via the Remove modal. Cascade:
- All map_flows records across all maps.
- No automatic SKU deletion (SKU lifecycle is independent of flows).

---

## 3. Product

### Create

Two entry points:
- **+ Product button** in the map toolbar — modal that creates a product node (node + product + SKU) in a single operation. The product name field uses a search/create pattern: existing products are listed; if the typed name does not match, `+ Create "[name]"` is offered.
- **Products table** — add row at the bottom of the table (inline or modal, TBD).

> **Note:** Products are never rendered directly on the map canvas. They appear in the side panels of nodes and flows, and via product nodes (nodes typed as `is_product_node_default`).

### Place on map

Not applicable — products have no direct canvas presence. Placement is via product nodes (see Node — Create, + Product button).

### Edit

Via the **Products table** — inline editing of name, type, tags, notes.

No side panel on the map for products directly.

### Delete

Via the **Products table** — delete button per row. Cascade:
- Removes the product from all flows' `product_ids`.
- Deletes all SKUs for this product (and their demand records and map_demands).
- Deletes all BOMs where this product is the output, and all BOM components referencing it.
- Deletes the product record.

---

## 4. SKU

A SKU is the association between a node and a product. It is not an independent entity from the user's perspective — it is created and managed through node and flow operations.

### Create

Implicitly via:
- **+ Product on map** modal → creates node + SKU in a single operation.
- **Adding a product to a flow** (side panel) → creates SKUs on source and target nodes if they do not already exist.
- Explicitly via the SKU sub-section in the node side panel (+ SKU button, product selector).

### Edit

Via the **SKU sub-section** in the node side panel. Fields: tags, notes.

### Delete (Remove SKU)

Via the × button in the SKU sub-section of the node side panel. Cascade:
- Deletes the demand record for this node × product pair if it exists, and its map_demands.

> **Open question:** should removing a product from a flow trigger SKU cleanup when the SKU is no longer reachable by any flow? Currently no — SKU lifecycle is fully manual. To be revisited.

---

## 5. BOM

### Create

Via the **BOMs table** or the **BOMs section** in the node side panel. Fields: node, output product, components with quantities.

The output product must exist as a SKU on the node before the BOM can be created.

### Edit

Via the **BOMs table** — inline editing. Primary editing surface for BOMs, as they have no map canvas presence.

### Delete

Via the **BOMs table** — delete button per row. Cascade:
- Deletes all bom_components for this BOM.

---

## 6. Demand

### Create

Via the **+ Demand** button in the SKU sub-section of the node side panel. Creates an empty demand record for the SKU and expands the sub-section immediately.

The SKU must exist before a demand can be created.

### Edit

Via the **Demand table** — inline editing of CTT (value + unit), demand (value + period), notes. This is the primary editing surface for demand records across the project.

Also editable via the demand sub-section in the node side panel.

### Delete

Via the **Demand table** — delete button per row, or via the **Delete demand** button in the node side panel. Cascade:
- Deletes all map_demands records for this demand.
- Resets `demand_x`, `demand_y`, `demand_length` on all map_nodes for the node.

---

## 7. Annotation

Annotations are **mono-map**: an annotation belongs to exactly one map and cannot be shared across maps. This distinguishes them from nodes and flows.

### Create

Via the **+ Annotation** button in the map toolbar. The annotation is created and placed on the active map in a single operation. No modal — content is edited directly in the side panel after placement.

### Place on map

Not applicable — annotations are mono-map. They are always placed on the map at creation time.

### Edit

Via the **side panel** (click annotation on canvas). Fields: notes, swim-lane, tags, font size.

The **Annotations table** is read-only. No inline editing.

### Remove from map / Delete

Since annotations are mono-map, removing from the map is equivalent to deleting. The Remove modal does not offer the "Remove only from map" option for annotations.

The **Annotations table** displays all project annotations across all maps (for project-wide review). The delete button in the table deletes the annotation from the project entirely.

### Annotations table

Columns (read-only): notes (truncated to one line), map name, swim-lane (name or empty), tags.

Note: the **Maps column** shows a single map name (since annotations are mono-map), unlike Nodes and Flows which may list multiple maps.

---

## 8. Elements Panel — Deprecation

The current **Elements panel** (listing all project elements not yet on the active map, with "Add to map" buttons) is replaced by the mechanisms described above:

| Current Elements panel function | Replacement |
|---|---|
| Add existing node to active map | Search/create field in toolbar (type name → select existing) |
| Add existing flow to active map | D&D between nodes → existing flow detection dialogue |
| Add existing annotation to active map | N/A — annotations are mono-map |

The Elements panel (SCRIPT 2100, `DDS_ELEMENTS_UI`) is removed. Its undo/redo call sites (`TX.MAP_ADD_NODE`, `TX.MAP_ADD_FLOW`, `TX.MAP_ADD_ANNOTATION`) are handled by the replacement mechanisms.

