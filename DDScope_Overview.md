# DDScope — Overview
*v1.5 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.4 | May 2026 | Initial split from monolithic spec |
| 0.5 | May 2026 | Multi-map support; separation of functional and presentation model |
| 0.6 | May 2026 | stock_points renamed to skus |
| 0.7 | May 2026 | Excel references removed; scope sections rewritten for new build |
| 0.8 | May 2026 | BOM concept added |
| 0.9 | May 2026 | Flow visibility rule resolved: flows require both endpoint nodes on map |
| 1.0 | May 2026 | Persistence migrated to local JSON file; constraints updated accordingly |
| 1.1 | May 2026 | Flow table view added to v1 feature list |
| 1.2 | May 2026 | Tag colors + legend added to v1 feature list |
| 1.3 | May 2026 | Node note overlay added to v1 feature list |
| 1.4 | May 2026 | Add product on map shortcut added to v1 feature list |
| 1.5 | May 2026 | Demand feature added to v1 feature list |

---

## 1. Purpose

DDScope is a CommWise application designed to support the scoping phase of DDMRP implementation projects. Its primary objective is to facilitate a structured, shared understanding between the b2wise consultant and the client of the current supply chain — its nodes, flows, products, and SKUs — before any buffer positioning or detailed design begins.

The tool is not intended for collaborative multi-user editing. It serves as a communication artifact: a living document that the consultant builds during discovery workshops and uses to align all stakeholders on a common picture of the supply chain.

---

## 2. Context and Motivation

DDMRP implementation projects begin with a scoping phase whose quality conditions the entire downstream design. Currently, consultants rely on PowerPoint templates (the b2wise Supply Chain Mapping & VSM deck) and ad hoc diagrams to capture supply chain structure. This approach introduces inconsistency and makes it difficult to reuse structured data gathered during scoping in later phases such as DDOpt.

DDScope digitizes this practice within the CommWise platform, providing a guided, structured, and exportable representation of the supply chain scope — consistent with the visual language and methodology already established in b2wise deliverables.

---

## 3. Scope

### 3.1 Version 1 — Target

- Multi-project management — each project is a standalone JSON file; New, Load, Save, and Save As operations.
- Project duplication — full deep copy of all entities with ID remapping, with selectable copy modes (full project, swim-lanes & types, types only).
- Definition and management of supply chain nodes — name, type, swim-lane assignment, tags, notes.
- Definition and management of products — name, type, tags, notes.
- Definition of flows between nodes — associated products, lead times, tags.
- Product association on flows — add and remove via side panel.
- SKU management — node × product associations with tags expressing the nature of the association (stock, buffer, transit, etc.).
- BOM management — bill of material per node: one output product, one or more input components with quantities. Accessible from the node side panel and the BOMs tab.
- Free tagging of nodes, products, flows, and SKUs for grouping and filtering.
- Tag colors — association of tags with display colors for node background coloring on the map. Configurable in the Settings tab. Priority: first match in insertion order. Copied in all three project copy modes.
- Legend — SVG inline overlay on the map canvas (bottom-left), showing (node type × tag) combinations present on the active map, grouped by type. Toggle persisted per map. Compatible with html2canvas for future PDF export.
- Node note overlay — display of node notes as italic text directly on the map canvas. Toggled per node per map via a "Show note on map" checkbox in the node side panel. The overlay is draggable independently of the node, with relative offset persisted per map. Excluded from fit-to-canvas and auto-layout. When the AI assistant sets a note via `update_node`, the overlay is enabled automatically on the active map.
- **Add product on map** — toolbar shortcut that creates a node-product pair in a single action. The user selects or creates a product, optionally picks a swim-lane, and DDScope creates the node (name = product name, type resolved via `is_product_node_default`), the `map_node`, and the SKU automatically. Intended for the common pattern where a node represents a product stock point. The `is_product_node_default` flag on `node_types` (single-default, same rule as `is_default`) identifies the type to use; `default_swim_lane_id` on that type pre-selects the swim-lane in the modal.
- **Demand management** — association of a demand record with a SKU (node × product pair), capturing Customer Tolerance Time (CTT) and average demand per period. At most one demand per SKU. Demand records are managed from the node side panel (SKU section) and reviewed in the Demand tab. CTT is displayed on the map as a red horizontal line below the node, visible opt-in per map via `map_demands`. The line is draggable and resizable per map. When multiple SKUs on the same node have a CTT visible on the active map, the longest CTT is displayed. Duration comparison and formatting handled by the `DDS_DURATION` utility module.
- Swim-lane definition — name, colour, canvas geometry, optional grouping.
- Configurable node types and product types per project — editable in the Settings tab. Single-default enforcement: setting a new default clears the previous one.
- Multi-map support — each project supports multiple named maps. The functional model is shared across maps; each map defines independently which elements are visible and their canvas geometry.
- Map management — create, rename, duplicate, and delete maps.
- Interactive Cytoscape.js map — node drag, flow creation, flow rerouting, pan, zoom.
- Map view: nodes and flows only. Products are visible in the detail panels of flows and nodes.
- Fit-to-canvas and auto-layout (BFS ranking per swim-lane; nodes without a swim-lane are not repositioned).
- Table views: node list, flow list, product list, and demand list.
- Side panel for editing node, flow, swim-lane, and SKU properties. Tag changes on nodes immediately refresh node color and legend.
- JSON file operations — New, Load, Save, Save As. Each project is a standalone `.json` file on the consultant's machine.
- Project copy modes — three levels of copy when creating a project from an existing source:

  | Mode | Functional entities copied | Maps copied |
  |---|---|---|
  | **Full project** | All — swim-lanes, node types, product types, nodes, products, flows, SKUs, BOMs, demands, tag colors | All maps, with full `map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands` |
  | **Swim-lanes & types** | Swim-lane definitions + node types + product types + tag colors | First map only — swim-lane geometry copied; no nodes or flows |
  | **Types only** | Node types and product types + tag colors | First map only — empty |

  All IDs are remapped in memory — the new project is fully independent of the source.

- AI assistant — natural language modification of the functional model with human confirmation before any write. The assistant understands the product-node pattern: when asked to place a product on the map it creates the node + SKU; when asked to associate a product with a flow between existing nodes it uses `add_product_to_flow` without creating a node.

### 3.2 Future scope

- Challenges and pain points (Excess WIP, Shortages, delays…).
- Constraints (capacity, demand variability, supplier reliability…).
- Project KPIs and objectives.
- Information flows and planning processes.
- Buffer candidate identification.
- Structured data export for DDOpt handoff.
- PDF export of the map and tables.
- Table view filtering by tag.
- Tag autocompletion in all tag input fields (node panel, flow panel, table views).
- Cumulative lead time display on the map using `DDS_DURATION.add`.
- SKU visibility per map.
- Product visibility model (currently derived from flow visibility).

### 3.3 Permanently out of scope

- Buffer sizing — this remains the domain of DDOpt.
- Future-state supply chain design.
- Multi-user concurrent editing.
- Node or product hierarchy — the model is intentionally flat.

---

## 4. Constraints and Assumptions

- The application runs entirely within the CommWise platform.
- Data entry is manual.
- Each project is a single local JSON file on the consultant's machine. No server, no database, no network dependency.
- File operations use the File System Access API when available (Chrome / Edge). Other browsers fall back to download / upload.
- Single-user per project scope. Sharing between consultants is done by exchanging JSON files.
- The data model is flat — no node or product hierarchy.
- Visual output follows b2wise Supply Chain Mapping conventions.
- No buffer sizing logic is included.
- A project always has at least one map. The last map of a project cannot be deleted.
- A node's swim-lane assignment is shared across all maps. Canvas position, note overlay state, and CTT line geometry are map-specific.

---

## 5. Open Questions

| # | Question |
|---|---|
| 1 | PDF export: minimum viable visual fidelity vs the b2wise PowerPoint template? Two approaches to evaluate: html2canvas (bitmap) and SVG reconstruction (vector). |
| 2 | DDOpt handoff: expected input format? This will define structured export requirements. |
| 3 | Tag filtering in table views: approach to be defined. |
| 4 | Cumulative lead time display on the map: approach to be confirmed. |
| 5 | Node badges: use cases and trigger conditions to be defined before implementation. |
| 6 | SKU visibility per map: to be addressed in a dedicated session. |
| 7 | Product visibility model: derived from flow visibility. To be revisited in a dedicated session. |
| 8 | CTT line rendering: html2canvas compatibility of the HTML overlay approach for future PDF export — to be validated. |

---

*b2wise — Confidential*
