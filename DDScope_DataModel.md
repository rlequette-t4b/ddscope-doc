# DDScope — Data Model
*v1.2 — Draft — May 2026*

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

---

## Design Principles

The model prioritises flexibility over formalism. Entities have a small set of structured fields and always include free-text notes. No field is mandatory. The consultant is never blocked by schema constraints.

Every entity includes the following system fields, not repeated in the field definitions below: `id` (integer, auto-incremented in memory), `created_at`, `updated_at` (ISO timestamps).

**Functional vs presentation separation.** The model distinguishes two layers:
- The **functional layer** (nodes, products, flows, SKUs, swim-lanes) describes the supply chain as it exists — independent of any visual representation.
- The **presentation layer** (maps and map-scoped entities) describes how elements are arranged and which elements are visible on a given map.

The same node, flow, or swim-lane can appear on multiple maps with different canvas geometry and different subsets of elements visible.

---

## 1. Node

A node represents any meaningful actor, location, or resource in the supply chain — suppliers, production sites, transformation resources, warehouses, distribution centres, third-party operators, and customer entities. A node's swim-lane assignment is a functional property shared across all maps. Its canvas position is map-specific (see §10 — Map Node).

**JSON array:** `nodes`

| Field | Type | Description |
|---|---|---|
| name | text | Display label on the map |
| type_code | text | Configurable per project — determines icon and shape; not enforced |
| swim_lane_id | integer \| null | Reference to `swim_lanes[].id` (optional — nodes can be free-floating). Shared across all maps. |
| tags | array | Free labels for grouping and filtering (e.g. `["Europe", "Pilot scope"]`) |
| notes | text | Free-form observations, constraints, context |

> If a node's swim-lane is not present on a given map, the node is rendered as free-floating on that map — without a swim-lane container.

---

## 2. Product

A product represents a material, semi-finished good, or any item that flows between nodes. Products are never rendered on the map canvas — they appear only in the detail panels of flows and nodes (via SKUs).

**JSON array:** `products`

| Field | Type | Description |
|---|---|---|
| name | text | Display label |
| type_code | text | Configurable per project — indicative only |
| tags | array | Free labels for grouping and filtering |
| notes | text | Free-form observations |

---

## 3. Flow

A flow is a directed link between two nodes, representing the movement of one or more products. A flow with no associated products is valid. Lead time is expressed at the flow level. Flow visibility on a map is explicit (see §11 — Map Flow).

**JSON array:** `flows`

| Field | Type | Description |
|---|---|---|
| source_node_id | integer | Reference to `nodes[].id` — origin node |
| target_node_id | integer | Reference to `nodes[].id` — destination node |
| product_ids | array | Array of `products[].id` integers — products carried by this flow (zero or more) |
| tags | array | Free labels for grouping and filtering (e.g. `["road", "air", "pilot"]`) |
| lead_time_value | numeric \| null | Transit or transformation time value |
| lead_time_unit | text \| null | Unit of the lead time (e.g. `days`, `weeks`) |
| notes | text | Free-form observations |

> When serialised into the Claude context JSON, `product_ids` values are converted to strings to match the context format.

---

## 4. SKU

A SKU is the association between a node and a product. It represents the fact that this node handles this product within the scope of the project. The nature of the association (physical stock, buffer point, transit location, etc.) is expressed through tags.

**SKU lifecycle — derived from flows.** SKUs are not created or deleted manually. DDScope manages them automatically:
- A SKU is created when a product is added to a flow and the corresponding node × product pair does not yet exist as a SKU (applied to both the source and target node of the flow).
- A SKU is deleted when a product no longer appears on any flow entering or leaving the node.

Tags and notes on a SKU are editable by the consultant and are preserved as long as the SKU exists.

**JSON array:** `skus`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` |
| product_id | integer | Reference to `products[].id` |
| tags | array | Free labels describing the nature of the association (e.g. `["buffer", "stock", "transit"]`) |
| notes | text | Free-form observations |

**Cascade triggers:**
- `add_product_to_flow(flow, product)` → create SKU for source node and target node if absent.
- `remove_product_from_flow(flow, product)` → delete SKU for source node if no other flow to/from source carries this product; same for target node. For each deleted SKU, apply BOM cascade (see §5).
- `delete_flow(flow)` → apply remove logic for all products on the flow, including BOM cascade.
- `delete_node(node)` → delete all SKUs for that node, all BOMs for that node, and all `bom_components` referencing those BOMs.
- `delete_product(product)` → delete all SKUs for that product, then apply BOM cascade for each affected node.

---

## 5. BOM (Bill of Material)

A BOM describes the transformation performed by a node: one output product manufactured from one or more input components, each with a quantity. BOMs are defined at the node level. A node can have multiple BOMs (one per output product). A given output product can only have one BOM per node.

BOMs are used to constitute the DDOptim export package, alongside SKUs and flows.

**BOM cascade — triggered by SKU deletion:**
- If the deleted SKU's product is the **output product** of a BOM on this node → the entire BOM is deleted, including all its components.
- If the deleted SKU's product is a **component** in a BOM on this node → the corresponding component line is deleted. If this leaves the BOM with no components, the BOM itself is deleted.

**JSON array:** `boms`

| Field | Type | Description |
|---|---|---|
| node_id | integer | Reference to `nodes[].id` — the node performing the transformation |
| output_product_id | integer | Reference to `products[].id` — the manufactured product |

**JSON array:** `bom_components`

| Field | Type | Description |
|---|---|---|
| bom_id | integer | Reference to `boms[].id` |
| product_id | integer | Reference to `products[].id` — the input component |
| quantity | numeric | Quantity of this component required per unit of output product |

---

## 6. Swim-lane

A swim-lane is a named, coloured supply chain stage. Swim-lanes are defined at the project level and represent a functional grouping (e.g. Sourcing, Production, Distribution). Their canvas geometry (position, dimensions) is map-specific (see §12 — Map Swim-lane).

**JSON array:** `swim_lanes`

| Field | Type | Description |
|---|---|---|
| name | text | Display label in the lane header |
| color | text | Lane accent colour — hex string, 8-colour palette selectable via swatches |

---

## 7. Node Types and Product Types

Each project maintains its own list of node types and product types. Types define the visual shape of nodes on the Cytoscape map and are seeded at project creation. They can be edited in the Settings tab.

**JSON array:** `node_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier (e.g. `SUPPLIER`, `PROD`) |
| label | text | Display name |
| shape | text | Cytoscape shape (`diamond`, `rectangle`, `ellipse`, `hexagon`, etc.) |
| is_default | boolean | Whether this type is pre-selected when adding a node |
| default_swim_lane_id | integer \| null | Reference to `swim_lanes[].id` — swim-lane pre-selected when creating a node of this type. Null if no default. Automatically cleared if the referenced swim-lane is deleted. |

**JSON array:** `product_types`

| Field | Type | Description |
|---|---|---|
| code | text | Internal identifier |
| label | text | Display name |
| shape | text | Cytoscape shape |
| is_default | boolean | Whether this type is pre-selected when adding a product |

Default types are pre-populated at project creation; all types are editable and deletable.

---

## 8. Tags

Tags are free-text labels stored as arrays. They are not hierarchical. Applied to nodes, products, flows, and SKUs.

Typical uses by entity:
- **Nodes / Products** — product family, geographic region, business unit, pilot scope boundary.
- **Flows** — transport mode (e.g. `road`, `rail`, `sea`, `air`), flow type, pilot scope.
- **SKUs** — association nature (e.g. `buffer`, `stock`, `transit`).

---

## 9. Map

A map is a named view of a subset of the project's supply chain elements. Each project has at least one map. The last remaining map of a project cannot be deleted.

At project creation, a first map named "Map 1" is created automatically.

Maps are included in the full JSON file and copied with the project. In partial copy modes (swim-lanes & types, types only), only the first map is copied — without its `map_nodes` or `map_flows`, since nodes and flows are not copied in those modes.

**JSON array:** `maps`

| Field | Type | Description |
|---|---|---|
| name | text | Display label shown in the map tab |
| position | integer | Tab order — persisted, supports manual reordering |
| direction | text | Flow display direction — `right-left` (default) or `left-right`. Stored per map; intended for use by layout and rendering features. |

**Map management:**
- A **New map** button is available globally in the map view.
- Each map tab exposes **Duplicate map** and **Delete map** actions.
- The map name is editable inline.
- The last map of a project cannot be deleted.

---

## 10. Map Node

Stores the canvas position of a node on a specific map. A node is visible on a map if and only if a `map_node` record exists for that map/node pair.

**JSON array:** `map_nodes`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| node_id | integer | Reference to `nodes[].id` |
| x, y | numeric | Canvas position of the node on this map |

---

## 11. Map Flow

Records that a flow is visible on a specific map. A flow is visible on a map if and only if a `map_flow` record exists for that map/flow pair.

**JSON array:** `map_flows`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| flow_id | integer | Reference to `flows[].id` |

**Visibility rules:**
- A flow can only be added to a map if both its source and target nodes are present on that map. DDScope enforces this constraint — a flow cannot exist on a map without both endpoint nodes.
- When a node is removed from a map, all flows where that node is source or target are automatically removed from that map as well.

---

## 12. Map Swim-lane

Stores the canvas geometry of a swim-lane on a specific map. A swim-lane is visible on a map if and only if a `map_swim_lane` record exists for that map/swim-lane pair.

**JSON array:** `map_swim_lanes`

| Field | Type | Description |
|---|---|---|
| map_id | integer | Reference to `maps[].id` |
| swim_lane_id | integer | Reference to `swim_lanes[].id` |
| x, y | numeric | Canvas origin of the lane rectangle on this map |
| width, height | numeric | Dimensions of the lane rectangle, resizable by drag |
| group_order | text | Optional grouping key (X.Y format) — lanes sharing the same X are rendered inside a shared bounding box |

---

## 13. Project

Project metadata, stored under the `project` key (object, not array) in the JSON file.

| Field | Type | Description |
|---|---|---|
| name | text | Project name — editable via the nav bar edit button |
| description | text | Free-text context (client, scope boundaries, purpose) — editable via the nav bar edit button |
| created_by | text | Email or identifier of the creator |

---

## 14. Adding and Removing Elements from a Map

An element (node, flow, or swim-lane) can be added to or removed from any map without affecting the functional model.

**Adding an element:**
A side panel lists all project elements not yet present on the active map. Elements can be added individually via a button in this panel.

**Removing an element:**
A contextual action is available on the map (e.g. selection menu on a node, flow, or swim-lane header): *"Remove from this map"*. Removing an element from a map deletes the corresponding `map_node`, `map_flow`, or `map_swim_lane` record. The element itself is not deleted from the project.

> Removing a node from a map automatically removes all flows where that node is source or target. No orphan flows are left on the map.

---

*b2wise — Confidential*
