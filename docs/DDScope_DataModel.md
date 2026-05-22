# DDScope — Data Model
*v2.8 — Draft — May 2026*

*See also: [DDScope_Architecture.md](DDScope_Architecture.md) for data structure and persistence. [DDScope_Modules.md](DDScope_Modules.md) for the `DDS_MODEL` module which is the authoritative runtime implementation of cascade rules.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.4 | May 2026 | Initial split from monolithic spec |
| 0.5 | May 2026 | Separation of functional model and presentation model; introduction of Map and map-scoped entities |
| 0.6 | May 2026 | Stock points renamed to SKUs; tags added on flows and SKUs; swim-lane position field removed |
| 0.7 | May 2026 | SKU lifecycle derived from flows; with-products map mode removed; products not rendered on canvas |
| 0.8 | May 2026 | BOM concept added |
| 0.9 | May 2026 | BOM cascade rules added; SKU cascade triggers updated for BOM consistency |
| 1.0 | May 2026 | Flow visibility enforced: flows require both endpoint nodes on map; node removal cascades to flows |
| 1.1 | May 2026 | project_id removed (single-project JSON file); DataStore references removed |
| 1.2 | May 2026 | direction field added to maps; default_swim_lane_id added to node_types |
| 1.3 | May 2026 | ai_instructions field added to project metadata |
| 1.4 | May 2026 | waypoint_pct added to map_flows for taxi edge bend control |
| 1.5 | May 2026 | tag_colors table added; legend_visible field added to maps |
| 1.6 | May 2026 | Section 15 rewritten: distinction between remove from map and delete from model |
| 1.7 | May 2026 | note_visible, note_dx, note_dy added to map_nodes for node note overlay |
| 1.8 | May 2026 | is_product_node_default added to node_types for "Add product on map" feature |
| 1.9 | May 2026 | skip_in_layout added to map_flows; excluded from BFS rank computation in auto-layout |
| 2.0 | May 2026 | demands and map_demands added; demand_x, demand_y, demand_length added to map_nodes |
| 2.1 | May 2026 | §17 rewritten: integrity rules simplified — no automatic SKU sync on flow or product operations; reroute_flow added; DDS_MODEL introduced as authoritative runtime; validateSkus deferred to future scope |
| 2.2 | May 2026 | §17.0 added: layered write architecture — UI/AI write only via DDS_ACTIONS; DDS_ACTIONS uses DDS_STORE for simple ops and DDS_MODEL for cascades; reads unrestricted |
| 2.3 | May 2026 | §17.0 updated: helper layer added between UI and DDS_ACTIONS; DDS_ACTIONS.execute() synchronous |
| 2.4 | May 2026 | §8 updated: icon_key, label_position, transparent_bg added to node_types; Cytoscape rendering rules documented |
| 2.5 | May 2026 | bidirectional field added to flows (§3) |
| 2.6 | May 2026 | layout_direction_inverted added to map_flows (§13); bfs_rank_min, bfs_rank_max added to map_nodes (§12, debug only) |
| 2.7 | May 2026 | skip_in_layout deprecated in map_flows; replaced by layout_offset (integer, default 1), where 0 excludes from BFS and N sets the minimum column distance |
| 2.8 | May 2026 | label_position added to map_nodes for per-map label position override |

---

## Design Principles

The model prioritises flexibility over formalism. Entities have a small set of structured fields and always include free-text notes. No field is mandatory. The consultant is never blocked by schema constraints.

Every entity includes the following system fields, not repeated in the field definitions below: `id` (integer, auto-incremented in memory), `created_at`, `updated_at` (ISO timestamps).

**Functional vs presentation separation.** The model distinguishes two layers:
- The **functional layer** (nodes, products, flows, SKUs, swim-lanes, BOMs, tag colors, demands) describes the supply chain as it exists — independent of any visual representation.
- The **presentation layer** (maps and map-scoped entities) describes how elements are arranged and which elements are visible on a given map.

**SKU lifecycle.** SKUs are not automatically synchronised with flows. Adding or removing a product from a flow does not create or delete SKUs. SKU coherence with the flow structure is the responsibility of the consultant, assisted by the future `validateSkus` function (see §17.4). The only automatic SKU operations are deletions triggered by `delete_node`, `delete_product`, and `remove_sku` (see §17.1).

---

## 1. Node

A node represents any meaningful actor, location, or resource in the supply chain — suppliers, production sites, transformation resources, warehouses, distribution centres, third-party operators, and customer entities.

**JSON array:** `nodes`

| Field | Type | Description |
|---|---|---|
| name | text | Display label on the map |
| type_code | text | Configurable per project — determines icon and shape; not enforced |
| swim_lane_id | integer \| null | Reference to `swim_lanes[].id` (optional). Shared across all maps. |
| tags | array | Free labels for grouping, filtering, and tag-based coloring |
| notes | text | Free-form observations, constraints, context |

---

## 2. Product

A product represents a material, semi-finished good, or any item that flows between nodes. Products are never rendered on the map canvas.

**JSON array:** `products`

| Field | Type | Description |
|---|---|---|
| name | text | Display label |
| type_code | text | Configurable per project — indicative only |
| tags | array | Free labels for grouping and filtering |
| notes | text | Free-form observations |

---

## 3. Flow

A flow is a directed link between two nodes, representing the movement of one or more products. A flow with no associated products is valid.

**JSON array:** `flows`

| Field | Type | Description |
|---|---|---|
| source_node_id | integer | Reference to `nodes[].id` — origin node |
| target_node_id | integer | Reference to `nodes[].id` — destination node |
| product_ids | array | Array of `products[].id` integers (zero or more) |
| tags | array | Free labels (e.g. `["road", "air", "pilot"]`) |
| lead_time_value | numeric \| null | Transit or transformation time value |
| lead_time_unit | text \| null | Unit of the lead time — one of `hours`, `days`, `weeks`, `months`, `years` |
| bidirectional | boolean | When `true`, the flow is rendered with arrowheads at both ends. Products and lead time apply equally in both directions. Defaults to `false`. |
| notes | text | Free-form observations |

**Bidirectional flows.** A bidirectional flow is stored as a single record. It represents a symmetric exchange between two nodes — same products, same lead time in both directions. Typical use cases: inter-site transfers, overflow warehouse replenishment. A bidirectional flow does not imply two distinct flow records.

**No automatic SKU synchronisation.** Adding or removing a product from a flow does not create or delete any SKU. Rerouting a flow does not modify any SKU. SKU coherence is managed separately — see §17.4.

---

## 4. SKU

A SKU is the association between a node and a product. The nature of the association is expressed through tags.

**JSON array:** `skus`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` |
| product_id | integer | Reference to `products[].id` |
| tags | array | Free labels (e.g. `["buffer", "stock", "transit"]`) |
| notes | text | Free-form observations |

**SKU lifecycle.** SKUs are created explicitly — via the "Add product on map" shortcut, via `add_sku` in the action vocabulary, or manually in the UI. They are deleted only by the cascade rules in §17.1.

---

## 5. Demand

A demand record captures the customer-facing requirements associated with a SKU: the Customer Tolerance Time (CTT) and the average demand per period. A SKU has at most one demand record.

**JSON array:** `demands`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` |
| product_id | integer | Reference to `products[].id` |
| ctt_value | numeric \| null | Customer Tolerance Time — value |
| ctt_unit | text \| null | CTT unit — one of `hours`, `days`, `weeks`, `months`, `years` |
| demand_value | numeric \| null | Average demand — value |
| demand_period | text \| null | Demand period — one of `hours`, `days`, `weeks`, `months`, `years` |
| notes | text | Free-form observations |

---

## 6. BOM (Bill of Material)

A BOM describes the transformation performed by a node: one output product manufactured from one or more input components with quantities. A node can have multiple BOMs (one per output product). BOMs are used to constitute the DDOptim export package.

**JSON array:** `boms`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` |
| output_product_id | integer | Reference to `products[].id` |
| notes | text | Free-form observations |

**JSON array:** `bom_components`

| Field | Type | Description |
|---|---|---|
| bom_id | integer | Reference to `boms[].id` |
| product_id | integer | Reference to `products[].id` — input component |
| quantity | numeric | Quantity per unit of output product |
| notes | text | Free-form observations |

---

## 7. Swim-lane

A swim-lane is a named, coloured supply chain stage. Canvas geometry is map-specific (see §14).

**JSON array:** `swim_lanes`

| Field | Type | Description |
|---|---|---|
| name | text | Display label in the lane header |
| color | text | Lane accent colour — hex string, 8-colour palette |

---

## 8. Node Types and Product Types

Each project maintains its own list of node types and product types, seeded at project creation and editable in the Settings tab.

**JSON array:** `node_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier (e.g. `SUPPLIER`, `PROD`) |
| label | text | Display name |
| shape | text | Cytoscape shape — used as fallback when no `icon_key` is defined, and always defines the hit area |
| is_default | boolean | Pre-selected when adding a node. Only one record may be default at a time. |
| is_product_node_default | boolean | Used by the "Add product on map" shortcut and the AI assistant product-node pattern. Only one record may have this flag at a time. Falls back to `is_default` then first type if absent. |
| default_swim_lane_id | integer \| null | Swim-lane pre-selected in Add node and Add product on map modals. Cleared if the swim-lane is deleted. |
| icon_key | text \| null | Key into `DDS_ICONS.LIBRARY`. When defined, the corresponding SVG is rendered as `background-image` on the Cytoscape node. When absent or unresolved, the node renders with `shape` and `background-color` only. |
| label_position | text | Controls label placement relative to the node shape. Values: `center` (default), `below`, `above`. Maps to Cytoscape `text-valign` + `text-margin-y`. |
| transparent_bg | boolean | When `true`, the node background is transparent (`background-opacity: 0`) and the tag color is injected into the SVG icon via `DDS_ICONS.toDataUrl(key, color)`. When `false` (default), the icon uses `fill="white"` and the tag color fills the node background. |

**Cytoscape rendering rules for nodes with `icon_key`:**

- `background-image`: SVG data URL from `DDS_ICONS.toDataUrl(icon_key, color?)` — the SVG must carry explicit `width` and `height` attributes for Cytoscape to size it correctly.
- `background-fit: contain` — icon scales to fit the node.
- `background-clip: none`
- `transparent_bg: false` — `background-color` = resolved tag color; SVG uses `fill="white"`.
- `transparent_bg: true` — `background-opacity: 0`; SVG uses `fill="{{color}}"` replaced with resolved tag color at render time.
- `shape` is always set (defines the hit area and acts as visual fallback).

| `label_position` | `text-valign` | `text-margin-y` | Label color |
|---|---|---|---|
| `center` (default) | `center` | `0` | `white` |
| `below` | `bottom` | `8` | `#222222` |
| `above` | `top` | `-8` | `#222222` |

**JSON array:** `product_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier |
| label | text | Display name |
| shape | text | Cytoscape shape |
| color | text | Hex color for display |
| is_default | boolean | Pre-selected when adding a product. Only one record may be default at a time. |

---

## 9. Tags

Free-text labels stored as arrays. Not hierarchical. Applied to nodes, products, flows, and SKUs. Tags defined in `tag_colors` are offered as autocomplete suggestions wherever a tag input is available.

---

## 10. Tag Colors

Associates a tag label with a display color. Used to color node backgrounds on the map canvas.

**JSON array:** `tag_colors`

| Field | Type | Description |
|---|---|---|
| tag | text | Tag label — free text |
| color | text | Hex color string — 8-colour palette |

Priority: first match in `tag_colors` insertion order wins when a node has multiple matching tags.

---

## 11. Map

A named view of a subset of the project's supply chain elements. Each project has at least one map. The last remaining map cannot be deleted.

**JSON array:** `maps`

| Field | Type | Description |
|---|---|---|
| name | text | Display label shown in the map tab |
| position | integer | Tab order |
| direction | text | Flow display direction — `right-left` (default) or `left-right` |
| legend_visible | boolean | Whether the legend overlay is visible on this map. Defaults to `true`. |

---

## 12. Map Node

Canvas position of a node on a specific map, optional note overlay configuration, and CTT line geometry.

A node is visible on a map if and only if a `map_node` record exists.

**JSON array:** `map_nodes`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| node_id | integer | Reference to `nodes[].id` |
| x, y | numeric | Canvas position |
| note_visible | boolean | Whether `nodes.notes` is displayed as an overlay on this map. Defaults to `false`. |
| note_dx | numeric | Horizontal offset of the note overlay relative to node centre. Defaults to `0`. |
| note_dy | numeric | Vertical offset of the note overlay relative to node centre. Defaults to `30`. |
| demand_x | numeric \| null | Horizontal offset of CTT line centre relative to node centre. Defaults to `0`. |
| demand_y | numeric \| null | Vertical offset of CTT line centre relative to node centre. Defaults to `60`. |
| demand_length | numeric \| null | Length of the CTT line in canvas units. Defaults to node width when first placed. |
| bfs_rank_min | integer \| null | Debug only. Minimum BFS rank assigned to this node on the last layout run. Null if layout has not been run. Not exported in JSON. |
| bfs_rank_max | integer \| null | Debug only. Maximum BFS rank assigned to this node on the last layout run. Null if layout has not been run. Not exported in JSON. |
| label_position | text \| null | Per-map override of the node type's `label_position`. Values: `center`, `above`, `below`. When `null` (default), the node type's value is used. |

---

## 13. Map Flow

Records that a flow is visible on a specific map, and stores per-map presentation attributes.

**JSON array:** `map_flows`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| flow_id | integer | Reference to `flows[].id` |
| waypoint_pct | float \| null | Taxi edge bend position (0–1). Defaults to `0.5`. |
| layout_offset | integer | BFS column distance constraint. `0` = excluded from rank computation (nodes may share a column). `N > 0` = target must be at least N columns after source (default `1`). |
| layout_direction_inverted | boolean | For bidirectional flows only. When `true`, source and target are swapped in the BFS graph, controlling which direction drives rank propagation. Defaults to `false`. |
| show_notes_label | boolean | When `true`, `flows.notes` is displayed as an edge label on the canvas. Defaults to `false`. |
| curve_style | text | Edge curve style: `taxi` (default) or `straight`. |

**Visibility rules:** a flow can only be on a map if both endpoint nodes are present. Removing a node from a map removes all its flows automatically.

---

## 14. Map Swim-lane

Canvas geometry of a swim-lane on a specific map.

**JSON array:** `map_swim_lanes`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| swim_lane_id | integer | Reference to `swim_lanes[].id` |
| x, y | numeric | Canvas origin |
| width, height | numeric | Dimensions, resizable by drag |
| group_order | text | Optional grouping key (X.Y format) |

---

## 15. Map Demand

Records that the CTT line for a given node is visible on a specific map. Presence = line shown; absence = hidden.

The rendered line represents the **maximum CTT** among all `map_demands` for a given node on a given map, computed via `DDS_DURATION.compare`.

**JSON array:** `map_demands`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| demand_id | integer | Reference to `demands[].id` |

**Cascade:** deleted when the referenced `demand` is deleted.

---

## 16. Project

Project metadata, stored under the `project` key (object, not array) in the JSON file.

| Field | Type | Description |
|---|---|---|
| name | text | Project name — editable via the nav bar edit button |
| description | text | Free-text context (client, scope boundaries, purpose) |
| created_by | text | Email or identifier of the creator |
| ai_instructions | text \| null | Project-specific instructions for the AI assistant. Injected into Claude's context before each request when non-empty. |

---

## 17. Integrity Rules

### 17.0 Layered write architecture

DDScope enforces a layered write architecture for all mutations to the functional model:

```
UI modules
    ↓  (all writes)
Helper layer                    ← DDS_NODES, DDS_PRODUCTS, DDS_FLOWS,
(domain helpers)                    DDS_SKUS, DDS_BOMS, DDS_DEMANDS
    ↓  translates to actions
DDS_ACTIONS  (synchronous)
    ↓ simple ops          ↓ cascade ops
DDS_STORE              DDS_MODEL
    ↓                      ↓
          DDS_STORE (raw CRUD)

AI modules
    ↓  (write directly — no helper)
DDS_ACTIONS
    ↓  ...
```

**Rule 1 — UI writes only via helpers.**
No UI module (`DDS_BOMS_UI`, `DDS_PANEL`, `DDS_DEMANDS_UI`, `DDS_NODES_UI`, `DDS_PRODUCTS_UI`, `DDS_FLOWS_UI`, `DDS_SETTINGS_UI`, etc.) may call `DDS_ACTIONS.execute()`, `DDS_STORE.insert/update/remove`, or `DDS_MODEL.*` directly. All writes from UI go through a domain helper.

**Rule 2 — AI writes via `DDS_ACTIONS` directly.**
AI modules (`DDS_AI`, `DDS_AI_UI`) call `DDS_ACTIONS.execute()` directly — bypassing helpers.

**Rule 3 — Helpers translate to actions.**
Each helper method builds an action list and calls `DDS_ACTIONS.execute()` synchronously. Helpers also expose named read methods as `DDS_STORE.query` wrappers for UI convenience.

**Rule 4 — `DDS_ACTIONS.execute()` is synchronous.**
Returns `{ applied: action[], failed: action|null }` directly. No Promise.

**Rule 5 — `DDS_ACTIONS` uses `DDS_STORE` for simple ops, `DDS_MODEL` for cascades.**
- Simple mutations (add, update): `DDS_ACTIONS` calls `DDS_STORE.insert/update/remove` directly.
- Operations with cascade (delete_node, delete_flow, delete_product, delete_bom, remove_sku, delete_demand): `DDS_ACTIONS` delegates to `DDS_MODEL`.

**Rule 6 — reads are unrestricted.**
Any module may call `DDS_STORE.query` on any table at any time. UI modules should prefer helper read methods over direct `DDS_STORE.query` calls for consistency.

**Exceptions — presentation layer:**
Presentation layer modules (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_ELEMENTS`, `DDS_PANEL` for canvas state, etc.) manage `map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands` directly via `DDS_STORE`. These tables are outside `DDS_ACTIONS`' and helpers' scope.

### 17.1 Delete operations and cascades

The table below defines what is deleted when each destructive operation is performed. All cascade deletions are applied by `DDS_MODEL` in a single synchronous operation.

| Operation | What is deleted |
|---|---|
| `deleteNode(nodeId)` | All `flows` where this node is source or target. All `map_flows` for those flows across all maps. All `skus` where `node_id` matches. All `boms` for this node and their `bom_components`. All `demands` for this node and their `map_demands`. All `map_nodes` for this node across all maps. The `nodes` record. |
| `deleteFlow(flowId)` | All `map_flows` for this flow across all maps. The `flows` record. **No SKU deletion.** |
| `deleteProduct(productId)` | Removes `productId` from `flows[].product_ids` on all flows. All `skus` where `product_id` matches. All `boms` where `output_product_id` matches and their `bom_components`. All `bom_components` where `product_id` matches (and their parent `boms` if left with no components). All `demands` where `product_id` matches and their `map_demands`. The `products` record. |
| `deleteSwimLane(swimLaneId)` | All nodes assigned to this swim-lane — each with its full `deleteNode` cascade. All `map_swim_lanes` for this lane across all maps. Clears `default_swim_lane_id` on any `node_types` record that referenced this lane. The `swim_lanes` record. |
| `removeSku(nodeId, productId)` | The `demands` record for this node × product pair if it exists, and its `map_demands`. The `skus` record. |
| `deleteDemand(nodeId, productId)` | All `map_demands` where `demand_id` matches. The `demands` record. |
| `deleteBom(bomId)` | All `bom_components` where `bom_id` matches. The `boms` record. |
| `rerouteFlow(flowId, newSourceId?, newTargetId?)` | Updates `source_node_id` and/or `target_node_id`. **No SKU modification.** |
| `addProductToFlow(flowId, productId)` | Appends `productId` to `flows[flowId].product_ids`. **No SKU creation.** |
| `removeProductFromFlow(flowId, productId)` | Removes `productId` from `flows[flowId].product_ids`. **No SKU deletion.** |

### 17.2 SKU lifecycle

SKUs are **not automatically synchronised** with flow product lists.

SKUs are created:
- Explicitly via `add_sku` action (routed through helpers → `DDS_ACTIONS`)
- Via the "Add product on map" shortcut (routed through helpers → `DDS_ACTIONS`)

SKUs are deleted only by:
- `deleteNode` — removes all SKUs for that node
- `deleteProduct` — removes all SKUs for that product
- `removeSku` — removes one specific SKU

### 17.3 UI

The **Remove** button in the map toolbar opens a confirmation modal. A **Remove only from map** checkbox (unchecked by default) controls which operation is performed.

| Checkbox state | Behaviour |
|---|---|
| **Unchecked** (default) | Full delete via helper → `DDS_ACTIONS` → `DDS_MODEL` cascade |
| **Checked** | Remove from active map only — presentation layer only, functional model unchanged |

Map-only removal is handled by `DDS_ELEMENTS`, not via helpers or `DDS_ACTIONS`.

### 17.4 Future — SKU validation

A future `DDS_MODEL.validateSkus()` function will detect SKU inconsistencies and propose corrections:

- **Missing SKU** — a product appears on a flow but no SKU exists on one or both endpoint nodes
- **Orphan SKU** — a SKU exists on a node for a product that does not appear on any connected flow and the node is not of type `is_product_node_default`

This function will be non-destructive: it reports inconsistencies and proposes additions or deletions for consultant confirmation before any write.

---

*b2wise — Confidential*
