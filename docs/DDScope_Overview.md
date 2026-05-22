- [DDScope — Overview](#ddscope--overview)
  - [Version History](#version-history)
  - [1. Purpose](#1-purpose)
  - [2. Context and Motivation](#2-context-and-motivation)
  - [3. Implementation](#3-implementation)
  - [4. Scope](#4-scope)
    - [4.1 Version 1 — Target](#41-version-1--target)
    - [4.2 Future scope](#42-future-scope)
    - [4.3 Permanently out of scope](#43-permanently-out-of-scope)
  - [5. Pre-backlog](#5-pre-backlog)
    - [5.1 Candidates](#51-candidates)
    - [5.2 Ideas](#52-ideas)
  - [6. Constraints and Assumptions](#6-constraints-and-assumptions)
  - [7. Open Questions](#7-open-questions)

# DDScope — Overview
*v1.9 — Draft — May 2026*

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
| 1.6 | May 2026 | JavaScript module registry introduced; reference to DDScope_Modules.md added |
| 1.7 | May 2026 | Pre-backlog (§5) added; DDScope_Backlog.md superseded |
| 1.8 | May 2026 | DDS_PRESENTATION candidate added to §5.1 |
| 1.9 | May 2026 | Annotations entity added to §5.1; Unicode symbols in text fields added to §5.1 |

---

## 1. Purpose

DDScope is a CommWise application designed to support the scoping phase of DDMRP implementation projects. Its primary objective is to facilitate a structured, shared understanding between the b2wise consultant and the client of the current supply chain — its nodes, flows, products, and SKUs — before any buffer positioning or detailed design begins.

The tool is not intended for collaborative multi-user editing. It serves as a communication artifact: a living document that the consultant builds during discovery workshops and uses to align all stakeholders on a common picture of the supply chain.

---

## 2. Context and Motivation

DDMRP implementation projects begin with a scoping phase whose quality conditions the entire downstream design. Currently, consultants rely on PowerPoint templates (the b2wise Supply Chain Mapping & VSM deck) and ad hoc diagrams to capture supply chain structure. This approach introduces inconsistency and makes it difficult to reuse structured data gathered during scoping in later phases such as DDOpt.

DDScope digitizes this practice within the CommWise platform, providing a guided, structured, and exportable representation of the supply chain scope — consistent with the visual language and methodology already established in b2wise deliverables.

---

## 3. Implementation

DDScope is implemented as a set of JavaScript modules, each living in a dedicated CommWise SCRIPT block and exposed as a global under the `DDS_` prefix. The module registry in **[DDScope_Modules.md](DDScope_Modules.md)** is the authoritative reference for module identities, APIs, dependencies, and testability. The architecture is described in **[DDScope_Architecture.md](DDScope_Architecture.md)**.

---

## 4. Scope

### 4.1 Version 1 — Target

- Multi-project management — each project is a standalone JSON file; New, Load, Save, and Save As operations.
- Project duplication — full deep copy of all entities with ID remapping, with selectable copy modes (full project, swim-lanes & types, types only).
- Definition and management of supply chain nodes — name, type, swim-lane assignment, tags, notes.
- Definition and management of products — name, type, tags, notes.
- Definition of flows between nodes — associated products, lead times, tags.
- Product association on flows — add and remove via side panel.
- SKU management — node x product associations with tags expressing the nature of the association (stock, buffer, transit, etc.).
- BOM management — bill of material per node: one output product, one or more input components with quantities. Accessible from the node side panel and the BOMs tab.
- Free tagging of nodes, products, flows, and SKUs for grouping and filtering.
- Tag colors — association of tags with display colors for node background coloring on the map. Configurable in the Settings tab. Priority: first match in insertion order. Copied in all three project copy modes.
- Legend — SVG inline overlay on the map canvas (bottom-left), showing (node type x tag) combinations present on the active map, grouped by type. Toggle persisted per map. Compatible with html2canvas for future PDF export.
- Node note overlay — display of node notes as italic text directly on the map canvas. Toggled per node per map via a "Show note on map" checkbox in the node side panel. The overlay is draggable independently of the node, with relative offset persisted per map. Excluded from fit-to-canvas and auto-layout. When the AI assistant sets a note via `update_node`, the overlay is enabled automatically on the active map.
- Map view: nodes and flows only. Products are visible in the detail panels of flows and nodes.
- Fit-to-canvas and auto-layout (BFS ranking per swim-lane; nodes without a swim-lane are not repositioned).
- Table views: node list, flow list, product list, and demand list.
- Side panel for editing node, flow, swim-lane, and SKU properties. Tag changes on nodes immediately refresh node color and legend.
- JSON file operations — New, Load, Save, Save As. Each project is a standalone `.json` file on the consultant's machine.
- Project copy modes — three levels of copy when creating a project from an existing source:

  | Mode | Functional entities copied | Maps copied |
  |---|---|---|
  | **Full project** | All entities | All maps with full geometry |
  | **Swim-lanes & types** | Swim-lane definitions + node types + product types + tag colors | First map only — swim-lane geometry copied; no nodes or flows |
  | **Types only** | Node types and product types + tag colors | First map only — empty |

  All IDs are remapped in memory — the new project is fully independent of the source.

- AI assistant — natural language modification of the functional model with human confirmation before any write. The assistant understands the product-node pattern: when asked to place a product on the map it creates the node + SKU; when asked to associate a product with a flow between existing nodes it uses `add_product_to_flow` without creating a node.

### 4.2 Future scope

- Challenges and pain points (Excess WIP, Shortages, delays...).
- Constraints (capacity, demand variability, supplier reliability...).
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
- SKU validation — `DDS_MODEL.validateSkus()`: non-destructive detection of missing and orphan SKUs, with proposed corrections for consultant confirmation (see `DDScope_DataModel.md` §17.4).

### 4.3 Permanently out of scope

- Buffer sizing — this remains the domain of DDOpt.
- Future-state supply chain design.
- Multi-user concurrent editing.
- Node or product hierarchy — the model is intentionally flat.

---

## 5. Pre-backlog

Items below are collected but not yet committed to any version. They are not to-do items — they are inputs for future planning sessions.

**§5.1** contains items with sufficient definition to be discussed for prioritisation. **§5.2** contains fragments and early ideas that need further thinking before they can be scoped.

### 5.1 Candidates

**Node badges on the map canvas**
Display visual indicators directly on Cytoscape nodes. Two categories:
- *Tag-triggered badges* — a badge appears when a specific tag is present on the node. Target tags: `warning` (⚠️), `info` (ℹ️), `buffer` (dedicated icon). Configurable list, potential link with `tag_colors`.
- *Demand badge* — displayed when at least one SKU on the node has a `demands` record.
Multiple badges may coexist on the same node (e.g. warning + demand). Layout: horizontal row, top-right corner. Proposed rendering: Cytoscape ghost nodes (same pattern as note ghosts) for automatic pan/zoom sync and html2canvas compatibility. Visibility scope (all maps vs per-map toggle) to be defined.

**Free-form annotations on the map canvas**
Standalone text elements placed freely on the canvas, independent of nodes and flows. An annotation may optionally belong to a swim-lane (same assignment pattern as nodes). If assigned to a lane, it translates with it when the lane is repositioned; if unassigned, layout operations have no effect on it.

Data model:
- Functional entity: `annotations` — fields: `label` (free text), `swim_lane_id` (nullable), `tags`, `notes`.
- Presentation entity: `map_annotations` — fields: `map_id`, `annotation_id`, `x`, `y`.

Rendering: Cytoscape ghost node (same pattern as note ghosts and BFS rank badges). Size adjusts to text content including line breaks. Added via a "+ Annotation" button in the toolbar. Visible in a dedicated "Annotations" tab in the table view, listing all annotations in the project (not filtered by active map).

**Unicode symbols in text fields displayed on the canvas**
Node notes (displayed as ghost overlays) and annotation labels accept free Unicode text, including symbols and emoji (⚠ ▲ ℹ ✓ ✗ 🔴 🟡 🟢 …). Cytoscape renders these natively via its Canvas 2D label engine. Cross-platform rendering is best-effort — no guarantee of visual consistency across OS and browser combinations.

UX complement (future): a small symbol picker in the relevant text fields offering a curated shortlist of supply-chain-relevant Unicode characters. To be specified at implementation time.

**Tag color conflict resolution**
Define a visual behaviour for nodes matching multiple `tag_colors` entries simultaneously — currently the first match wins. Candidate: display a special pattern or overlay to signal the conflict rather than silently picking the first match.

**Pain points and objectives**
Capture supply chain pain points and project objectives as structured entities. Proposed categories aligned with the 7 DDMRP buffer reasons (with custom additions). Linked to nodes with badge display on the map. Dedicated side panel. Requires a separate spec document before implementation.

**Information flows**
Model information flows and planning processes as a separate layer alongside material flows. Roles, entities, and planning cycles. Requires a separate spec document.

**Swim-lane layout offset**
Configurable margin between swim-lane boundary and the first/last node column in auto-layout. Currently hardcoded.

**Lead time display on swim-lanes**
Display cumulative or per-lane lead time as a label or overlay on swim-lane headers. Rendering approach to be defined.

**`DDS_PRESENTATION` — presentation rules module**
A module symmetric to `DDS_MODEL` for the presentation layer: the single authoritative layer for rules governing map state, independent of the web UI and Cytoscape. Would encapsulate: default node placement when added to a map, auto-layout rules (BFS ranking, column assignment, vertical placement), fit-to-canvas bounding box computation, map duplication logic (copy of `map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands`), and any other rule that determines *how* elements are arranged on a map without depending on the DOM or the Cytoscape instance. Current logic is spread across `DDS_MAP`, `DDS_LAYOUT`, and `DDS_MAP_UI`.

### 5.2 Ideas

**Tag-specific selection style**
A distinct visual style for selected nodes when tag-based coloring is active — to avoid confusion between selection highlight and tag color. Approach undefined.

**`DDS_MODEL` — deprecate legacy cascade modules**
Once `DDS_MODEL` is implemented, progressively migrate callers of `DDS_PRODUCTS`, `DDS_BOMS`, `DDS_DEMANDS` to `DDS_MODEL` / `DDS_STORE` direct calls, then remove the deprecated modules. Tracked in `DDScope_Modules.md` backlog.

---

## 6. Constraints and Assumptions

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

## 7. Open Questions

| # | Question |
|---|---|
| 1 | PDF export: minimum viable visual fidelity vs the b2wise PowerPoint template? |
| 2 | DDOpt handoff: expected input format? This will define structured export requirements. |
| 3 | Tag filtering in table views: approach to be defined. |
| 4 | Cumulative lead time display on the map: approach to be confirmed. |
| 5 | Node badges: visibility scope — all maps or per-map toggle? |
| 6 | SKU visibility per map: to be addressed in a dedicated session. |
| 7 | Product visibility model: derived from flow visibility. To be revisited in a dedicated session. |
| 8 | CTT line rendering: html2canvas compatibility of the HTML overlay approach for future PDF export — to be validated. |

---

*b2wise — Confidential*
