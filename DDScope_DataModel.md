# DDScope — Data Model
*v1.7 — Draft — May 2026*

*See also: [DDScope_Architecture.md](DDScope_Architecture.md) for data structure and persistence.*

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
| 1.7 | May 2026 | show_notes_label added to map_flows; edge label rendering from flow notes |

---

## Design Principles

The model prioritises flexibility over formalism. Entities have a small set of structured fields and always include free-text notes. No field is mandatory. The consultant is never blocked by schema constraints.

Every entity includes the following system fields, not repeated in the field definitions below: `id` (integer, auto-incremented in memory), `created_at`, `updated_at` (ISO timestamps).

**Functional vs presentation separation.** The model distinguishes two layers:
- The **functional layer** (nodes, products, flows, SKUs, swim-lanes, BOMs, tag colors) describes the supply chain as it exists — independent of any visual representation.
- The **presentation layer** (maps and map-scoped entities) describes how elements are arranged and which elements are visible on a given map.

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
| lead_time_unit | text \| null | Unit of the lead time (e.g. `days`, `weeks`) |
| notes | text | Free-form observations |

---

## 4. SKU

A SKU is the association between a node and a product. The nature of the association is expressed through tags.

**SKU lifecycle — derived from flows.** SKUs are managed automatically:
- Created when a product is added to a flow and the corresponding node × product pair does not yet exist.
- Deleted when a product no longer appears on any flow entering or leaving the node.

**JSON array:** `skus`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` |
| product_id | integer | Reference to `products[].id` |
| tags | array | Free labels (e.g. `["buffer", "stock", "transit"]`) |
| notes | text | Free-form observations |

**Cascade triggers:**
- `add_product_to_flow(flow, product)` → create SKU for source and target nodes if absent.
- `remove_product_from_flow(flow, product)` → delete SKU for source/target if no other connected flow carries this product. Apply BOM cascade for each deleted SKU.
- `delete_flow(flow)` → apply remove logic for all products. Apply BOM cascade.
- `delete_node(node)` → delete all SKUs, BOMs, and `bom_components` for that node.
- `delete_product(product)` → delete all SKUs, then apply BOM cascade for each affected node.

---

## 5. BOM (Bill of Material)

A BOM describes the transformation performed by a node: one output product manufactured from one or more input components with quantities. A node can have multiple BOMs (one per output product). BOMs are used to constitute the DDOptim export package.

**BOM cascade — triggered by SKU deletion:**
- If the deleted SKU's product is the **output product** of a BOM on this node → the entire BOM is deleted, including all its components.
- If the deleted SKU's product is a **component** in a BOM → the component line is deleted. If this leaves the BOM with no components, the BOM itself is deleted.

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

## 6. Swim-lane

A swim-lane is a named, coloured supply chain stage. Canvas geometry is map-specific (see §12).

**JSON array:** `swim_lanes`

| Field | Type | Description |
|---|---|---|
| name | text | Display label in the lane header |
| color | text | Lane accent colour — hex string, 8-colour palette |

---

## 7. Node Types and Product Types

Each project maintains its own list of node types and product types, seeded at project creation and editable in the Settings tab.

**JSON array:** `node_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier (e.g. `SUPPLIER`, `PROD`) |
| label | text | Display name |
| shape | text | Cytoscape shape |
| is_default | boolean | Pre-selected when adding a node. Only one record may be default at a time — setting a new default clears the previous one. |
| default_swim_lane_id | integer \| null | Swim-lane pre-selected in Add node modal. Cleared if the swim-lane is deleted. |

**JSON array:** `product_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier |
| label | text | Display name |
| shape | text | Cytoscape shape |
| color | text | Hex color for display |
| is_default | boolean | Pre-selected when adding a product. Only one record may be default at a time. |

---

## 8. Tags

Free-text labels stored as arrays. Not hierarchical. Applied to nodes, products, flows, and SKUs. Tags defined in `tag_colors` are offered as autocomplete suggestions wherever a tag input is available.

---

## 9. Tag Colors

Associates a tag label with a display color. Used to color node backgrounds on the map canvas: for each node, the first tag in the `tag_colors` table (by insertion order) that matches one of the node's tags determines the node's background color. Nodes with no matching tag use the default canvas color.

**JSON array:** `tag_colors`

| Field | Type | Description |
|---|---|---|
| tag | text | Tag label — free text, may or may not already exist in the project |
| color | text | Hex color string — 8-colour palette |

**Behavior:**
- Priority: first match in `tag_colors` order wins when a node has multiple matching tags.
- Copying: included in all three project copy modes (full project, swim-lanes & types, types only).
- Autocomplete: the tag field in the Settings modal and the tag color table are populated with suggestions from all tags used in the project (nodes, flows, products, SKUs) union `tag_colors[].tag`.

---

## 10. Map

A named view of a subset of the project's supply chain elements. Each project has at least one map. The last remaining map cannot be deleted.

**JSON array:** `maps`

| Field | Type | Description |
|---|---|---|
| name | text | Display label shown in the map tab |
| position | integer | Tab order |
| direction | text | Flow display direction — `right-left` (default) or `left-right` |
| legend_visible | boolean | Whether the legend overlay is visible on this map. Defaults to `true`. Toggled via the Legend button in the map toolbar; persisted per map. |

---

## 11. Map Node

Canvas position of a node on a specific map. A node is visible on a map if and only if a `map_node` record exists.

**JSON array:** `map_nodes`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| node_id | integer | Reference to `nodes[].id` |
| x, y | numeric | Canvas position |

---

## 12. Map Flow

Records that a flow is visible on a specific map, and stores presentation-layer attributes for the edge.

**JSON array:** `map_flows`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| flow_id | integer | Reference to `flows[].id` |
| waypoint_pct | float \| null | Taxi edge bend position — fraction of the horizontal distance between source and target (0–1). `null` or absent defaults to `0.5` (midpoint). Edited via the waypoint handle on the canvas. |
| show_notes_label | boolean | When `true`, the flow's `notes` text is displayed as a label on the edge. Defaults to `false`. Toggled via the "Show notes on map" checkbox in the flow side panel. If `notes` is empty, no label is rendered regardless of this flag. |

**Visibility rules:** a flow can only be on a map if both endpoint nodes are present. Removing a node from a map removes all its flows automatically.

---

## 13. Map Swim-lane

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

## 14. Project

Project metadata, stored under the `project` key (object, not array) in the JSON file.

| Field | Type | Description |
|---|---|---|
| name | text | Project name — editable via the nav bar edit button |
| description | text | Free-text context (client, scope boundaries, purpose) |
| created_by | text | Email or identifier of the creator |
| ai_instructions | text \| null | Project-specific instructions for the AI assistant — free-text, persisted with the project. Injected into Claude's context before each request when non-empty. Typical content: naming conventions, geographic scope, preferred node types, client terminology, known constraints. Editable via a dedicated button in the AI assistant panel. |

---

## 15. Removing and Deleting Elements

DDScope distinguishes two operations when the user clicks **Remove** on a selected element:

### Remove from map only

The element is removed from the **active map** only. The functional model is unchanged — the element still exists in the project and can be re-added to any map via the Elements panel.

| Element | What is removed |
|---|---|
| Node | `map_nodes` record for this map. All `map_flows` for flows where this node is source or target, on this map only. |
| Flow | `map_flows` record for this map only. |
| Swim-lane | `map_swim_lanes` record for this map. Nodes assigned to the lane remain on the map. |

### Delete from the functional model (full delete)

The element is permanently deleted from the project across all maps, with full cascade.

| Element | What is deleted |
|---|---|
| Node | The `nodes` record. All flows where this node is source or target (all maps). All SKUs for this node. All BOMs and `bom_components` for this node. All `map_nodes` and `map_flows` records across all maps. |
| Flow | The `flows` record. Orphan SKUs on source and target nodes (SKUs whose product no longer appears on any other connected flow). BOM cascade for each orphan SKU. All `map_flows` records across all maps. |
| Swim-lane | The `swim_lanes` record. All nodes assigned to this swim-lane — with their full node cascade (flows, SKUs, BOMs). All `map_swim_lanes` records across all maps. Clears `default_swim_lane_id` on any node type that referenced this lane. |

### UI

The **Remove** button in the map toolbar is active when a node, flow, or swim-lane is selected. It opens a confirmation modal displaying the element name and a summary of the cascade consequences. A **Remove only from map** checkbox (unchecked by default) controls which operation is performed. Confirming with the checkbox unchecked performs the full delete; confirming with it checked performs the map-only removal.

---

*b2wise — Confidential*
