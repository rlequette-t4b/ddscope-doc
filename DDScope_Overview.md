# DDScope — Overview
*v1.1 — Draft — May 2026*

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
- Swim-lane definition — name, colour, canvas geometry, optional grouping.
- Configurable node types and product types per project — editable in the Settings tab.
- Multi-map support — each project supports multiple named maps. The functional model is shared across maps; each map defines independently which elements are visible and their canvas geometry.
- Map management — create, rename, duplicate, and delete maps.
- Interactive Cytoscape.js map — node drag, flow creation, flow rerouting, pan, zoom.
- Map view: nodes and flows only. Products are visible in the detail panels of flows and nodes.
- Fit-to-canvas and auto-layout (Dagre).
- Table views: node list, flow list, and product list.
- Side panel for editing node, flow, swim-lane, and SKU properties.
- JSON file operations — New, Load, Save, Save As. Each project is a standalone `.json` file on the consultant's machine.
- Project copy modes — three levels of copy when creating a project from an existing source:

  | Mode | Functional entities copied | Maps copied |
  |---|---|---|
  | **Full project** | All — swim-lanes, node types, product types, nodes, products, flows, SKUs, BOMs | All maps, with full `map_nodes`, `map_flows`, `map_swim_lanes` |
  | **Swim-lanes & types** | Swim-lane definitions + node types + product types | First map only — swim-lane geometry copied; no nodes or flows |
  | **Types only** | Node types and product types only | First map only — empty |

  All IDs are remapped in memory — the new project is fully independent of the source. A file containing only a subset of keys (e.g. a type template) is valid — absent sections are initialised as empty.

- AI assistant — natural language modification of the functional model with human confirmation before any write.

### 3.2 Future scope

- Challenges and pain points (Excess WIP, Shortages, delays…).
- Constraints (capacity, demand variability, supplier reliability…).
- Project KPIs and objectives.
- Information flows and planning processes.
- Buffer candidate identification.
- Structured data export for DDOpt handoff.
- PDF export of the map and tables.
- Table view filtering by tag.
- Cumulative lead time display on the map.
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
- A node's swim-lane assignment is shared across all maps. Canvas position is map-specific.

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

---

*b2wise — Confidential*
