# DDScope — Architecture
*v3.0 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) · [DDScope_Presentation.md](DDScope_Presentation.md) · [DDScope_Rendering.md](../dev-local/DDScope_Rendering.md) · [DDScope_UI.md](../dev-local/DDScope_UI.md) · [DDScope_Modules.md](DDScope_Modules.md)*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.4 | May 2026 | Initial split from monolithic spec |
| 0.5–2.3 | May 2026 | Incremental updates (see prior history in git) |
| 3.0 | May 2026 | Major restructure: implementation details extracted to dedicated documents; Architecture now describes layers and dependencies only |
| 3.1 | May 2026 | §6 Key Implementation Details dispatched to Presentation, Rendering, and UI docs |

---

## 1. Platform

DDScope runs entirely within the CommWise platform as a single-page CommWise Web App. Single-user per session. No concurrent editing.

**Stack:**

| Concern | Solution |
|---|---|
| Persistent storage | Local JSON file — in-memory store + File System Access API |
| Map rendering | Cytoscape.js v3.33.1 |
| Swim-lane rendering | HTML overlay divs (not Cytoscape compounds) |
| Auto-layout | Custom BFS ranking per swim-lane |

---

## 2. Layered Architecture

DDScope is organised into five layers. Each layer has a single responsibility and a constrained dependency direction — no layer may depend on a layer above it.

```
┌───────────────────────────────┐  User-facing interactions, views, panels
│           UI layer           │
├───────────────────────────────┤  Cytoscape canvas + HTML overlays
│        Rendering layer        │
├───────────────────────────────┤  map_* entity logic, layout algorithms
│      Presentation layer       │
├─────────────┬───────────────┬─┤  Domain helpers / AI action execution
│  Helper layer│   AI layer    │
├───────────────────────────────┤  DDS_STORE, DDS_ACTIONS, DDS_MODEL
│       Functional layer        │
└───────────────────────────────┘
```

### Functional layer

The foundation. Manages in-memory state (`DDS_STORE`), action execution (`DDS_ACTIONS`), cascade rules (`DDS_MODEL`), undo/redo (`DDS_TRANSACTIONS`), and file persistence. No knowledge of rendering or UI.
Block addresses (`SCRIPT NNN`) are shown here only for modules absent from the registry (AI layer and Presentation layer).


### Functional layer modules

| Module | Responsibility |
|---|---|
| `DDS_TOOLS` | Transversal utilities — `DDS_TOOLS.log` levelled logger (debug/info/warn/error/off), localStorage-persisted level |
| `DDS_COLORS` | 8-color palette constant |
| `DDS_ICONS` | SVG icon library — keyed dictionary, `toDataUrl()` with color injection |
| `DDS_STORE` | In-memory CRUD + file persistence |
| `DDS_DURATION` | Duration arithmetic and formatting |
| `DDS_MODEL` | Cascade delete rules — authoritative runtime |
| `DDS_ACTIONS` | Action execution engine — synchronous; apply action lists on DDS_STORE/DDS_MODEL, resolve new_* references, action vocabulary |
| `DDS_TRANSACTIONS` | Snapshot-based undo/redo transaction manager — wraps DDS_STORE state capture and restore |
| `TX` | Transaction label catalogue — centralised constants for `DDS_TRANSACTIONS.begin()` |
| `DDS_TX_HELPER` | UI transaction wrapper — `DDS_TX_HELPER.run(label, fn, onSuccess?)` encapsulates begin/commit/rollback; temporary, pending presentation layer refactor |
| `DDS_JSON` | Project import with copy modes + ID remapping |



### Helper layer modules

UI modules call helpers for all functional writes and reads. Helpers translate semantic calls into `DDS_ACTIONS` action lists. They never call `DDS_STORE.insert/update/remove` directly except for presentation-layer operations explicitly noted.

| Module | Responsibility |
|---|---|
| `DDS_NODES` | Node CRUD helper — wraps add_node, update_node, delete_node, assign_node_to_lane |
| `DDS_PRODUCTS` | Product CRUD helper — wraps add_product, update_product, delete_product |
| `DDS_FLOWS` | Flow CRUD helper — wraps add_flow, update_flow, delete_flow, reroute_flow, add/remove_product_to/from_flow |
| `DDS_SKUS` | SKU CRUD helper — wraps add_sku, update_sku, remove_sku |
| `DDS_BOMS` | BOM CRUD helper — wraps add_bom, delete_bom, add/update/remove_bom_component; updateComponents performs internal diff |
| `DDS_DEMANDS` | Demand CRUD helper — wraps add_demand, update_demand, delete_demand; showOnMap/hideFromMap operate on presentation layer directly |
| `DDS_ANNOTATIONS` | Annotation CRUD helper — wraps add_annotation, update_annotation, delete_annotation |



### AI layer modules

| Module | Block | Responsibility |
|---|---|---|
| `DDS_AI_CONTEXT` | SCRIPT 2200 | Serialises project to Claude context JSON |
| `DDS_AI` | SCRIPT 2400 | System prompt assembly via `DDS_ACTIONS.getVocabularyText()`, Claude API call, response validation |
| `DDS_AI_UI` | SCRIPT 2500 | AI panel, message bubbles, plan display via `DDS_ACTIONS.describe()`, confirm/cancel, error reporting |


### Presentation layer modules (render-dependent)

| Module | Block | Responsibility |
|---|---|---|
| `DDS_MAP` (state) | SCRIPT 900 | DDS_MAP state + Cytoscape style definition |
| `DDS_MAP` (load) | SCRIPT 1000 | loadMap, fitMap, runLayout |
| `DDS_MAP` (style) | SCRIPT 1050 | Tag colors, legend overlay, node icon rendering (`applyAllNodeStyles`) |
| `DDS_MAP` (CTT) | SCRIPT 1055 | CTT line HTML overlay |
| `DDS_SWIMLANES` | SCRIPT 1100 | Swim-lane overlay + pan/zoom sync |
| `DDS_SWIMLANE_GROUP` | SCRIPT 1150 | Swim-lane grouping logic |
| `DDS_LAYOUT` | SCRIPT 1250 | Node placement algorithm |
| `DDS_MAP_UI` | SCRIPT 1200 | Map tabs, map management, toolbar |
| `DDS_NODE_UI` | SCRIPT 1300 | Node creation modal |
| `DDS_FLOW_UI` | SCRIPT 1400 | Flow creation handle + rerouting |
| `DDS_PANEL` | SCRIPT 1500 | Side panel controller |
| `DDS_PANEL` (demand) | SCRIPT 1505 | SKU demand sub-section in node panel |
| `DDS_ELEMENTS` | SCRIPT 2000 | Add/remove elements from map |
| `DDS_ELEMENTS_UI` | SCRIPT 2100 | Elements panel UI + events |
| `DDS_REMOVE` | SCRIPT 2050 | Remove modal (map-only or full delete) |
| `DDS_NODES_UI` | SCRIPT 1750 | Node table view |
| `DDS_FLOWS_UI` | SCRIPT 1760 | Flow table view |
| `DDS_PRODUCTS_UI` | SCRIPT 1700 | Product table view |
| `DDS_BOMS_UI` | SCRIPT 1900 | BOMs table view |
| `DDS_DEMANDS_UI` | SCRIPT 1770 | Demand table view |
| `DDS_ANNOTATIONS_UI` | SCRIPT 1780 | Annotations table view |
| `DDS_SETTINGS_UI` | SCRIPT 2600 | Settings tab |

---

## 4. Data Model Structure

The project is held entirely in memory as a single JSON object (`DDS.state.project`). It contains 19 named arrays corresponding to the functional and presentation layers of the data model. Entity definitions and field descriptions are in [DDScope_DataModel.md](DDScope_DataModel.md).

### Functional layer

| Key | Description |
|---|---|
| `swim_lanes` | Swim-lane definitions — no canvas geometry |
| `node_types` | Per-project node type definitions |
| `product_types` | Per-project product type definitions |
| `nodes` | Node definitions — no canvas position |
| `products` | Product definitions |
| `flows` | Flow definitions |
| `skus` | Node × product associations — derived from flows |
| `boms` | BOM headers — one output product per node |
| `bom_components` | BOM lines — input components with quantities |
| `tag_colors` | Tag → color associations for node background coloring |
| `demands` | SKU-level demand records — CTT and demand per period |
| `annotations` | Free-form map annotations — functional content and lane assignment |

### Presentation layer

| Key | Description |
|---|---|
| `maps` | Map definitions — name, tab order, direction, legend_visible |
| `map_nodes` | Node visibility, canvas position, note overlay state, and CTT line geometry per map |
| `map_flows` | Flow visibility per map + taxi bend position (`waypoint_pct`) + layout controls (`layout_offset`, `layout_direction_inverted`) + rendering flags (`show_notes_label`, `curve_style`) |
| `map_swim_lanes` | Swim-lane canvas geometry per map |
| `map_demands` | Demand visibility per map — presence = CTT line shown |
| `map_annotations` | Annotation visibility and canvas position per map |

Every record includes system fields: `id` (integer, auto-incremented in memory), `created_at`, `updated_at` (ISO timestamps).

---

## 5. Persistence


### 5.1 In-memory store — DDS_STORE

`DDS_STORE` is the raw data access layer. It exposes a synchronous CRUD API operating on `DDS.state.project`.

**Write access rules:**
- UI modules write exclusively through **helper modules** (`DDS_NODES`, `DDS_PRODUCTS`, `DDS_FLOWS`, `DDS_SKUS`, `DDS_BOMS`, `DDS_DEMANDS`, `DDS_ANNOTATIONS`).
- Helper modules call `DDS_ACTIONS.execute()` for all functional writes.
- `DDS_ACTIONS` calls `DDS_STORE.insert/update/remove` (simple ops) or `DDS_MODEL.*` (cascade ops).
- AI modules (`DDS_AI`, `DDS_AI_UI`) call `DDS_ACTIONS.execute()` directly.
- Presentation layer modules manage `map_*` tables directly via `DDS_STORE` — this is the only exception.
- `DDS_STORE.query` is unrestricted — any module may read any table.

---
**Note:** Transaction ownership, begin/commit/rollback/undo/redo/clear, and related API details are now documented in [DDScope_Modules.md](DDScope_Modules.md). This section only summarizes the architectural pattern.


### 5.2 File persistence

The project is persisted as a single `.json` file on the consultant's machine. No server, no database, no network dependency.

| Operation | Chrome / Edge | Other browsers |
|---|---|---|
| **Load** | `showOpenFilePicker()` — File System Access API | `<input type="file">` |
| **Save** | Write directly to the open file (`FileSystemWritableFileStream`) | Download (`<a download>`) |
| **Save As** | `showSaveFilePicker()` — new file | Download |

### 5.3 Auto-reopen (Chrome / Edge only)

The `FileSystemFileHandle` of the last open file is persisted in IndexedDB. On boot, DDScope checks whether the permission is already granted. If so, the file is reopened automatically with no user interaction. If the handle exists but permission has not been granted (e.g. after a browser restart), a prompt is triggered on the first user gesture. On other browsers, each session starts from scratch.

### 5.4 Dirty state

`DDS.state.dirty` is set to `true` on any `insert`, `update`, `remove`, or explicit `DDS_STORE.markDirty()` call. A bullet indicator (`•`) is appended to the project name in the navigation bar, and the **Save** button becomes active.

`DDS.state.dirty` is reset to `false` on Load, Save, Save As, new project creation, and auto-reopen.

### 5.5 File format

```json
{
  "version": 1,
  "project":        { "name": "...", "description": "...", "created_by": "...", "ai_instructions": "..." },
  "swim_lanes":     [...],
  "node_types":     [...],
  "product_types":  [...],
  "nodes":          [...],
  "products":       [...],
  "flows":          [...],
  "skus":           [...],
  "boms":           [...],
  "bom_components": [...],
  "tag_colors":     [...],
  "demands":        [...],
   "annotations":    [...],
  "maps":           [...],
  "map_nodes":      [...],
  "map_flows":      [...],
  "map_swim_lanes": [...],
   "map_demands":    [...],
   "map_annotations": [...]
}
```

A file containing only a subset of keys is valid — absent arrays are initialised as empty on load. Fields absent from `map_nodes` records (`note_visible`, `note_dx`, `note_dy`) default to `false`, `0`, and `30` respectively at runtime. Fields absent from `map_nodes` records (`demand_x`, `demand_y`, `demand_length`) default to `0`, `60`, and `null` respectively at runtime. Fields absent from `map_nodes` records (`bfs_rank_min`, `bfs_rank_max`) default to `null` at runtime. `label_position` defaults to `null` (uses node type value) at runtime. Fields absent from `map_flows` records (`waypoint_pct`, `layout_offset`, `layout_direction_inverted`, `show_notes_label`, `notes_as_annotation`, `notes_annotation_dx`, `notes_annotation_dy`, `curve_style`) default to `0.5`, `1`, `false`, `false`, `false`, `0`, `-30`, and `"taxi"` respectively at runtime. Fields absent from `node_types` records (`icon_key`, `label_position`, `transparent_bg`) default to `null`, `"center"`, and `false` respectively at runtime.

---


