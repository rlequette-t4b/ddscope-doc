# DDScope — Architecture
*v1.1 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) for entity definitions. [DDScope_UI.md](DDScope_UI.md) for rendering behaviour.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.4 | May 2026 | Initial split from monolithic spec |
| 0.5 | May 2026 | Data model updated for map model — 4 new entity groups; nodes and swim_lanes revised |
| 0.6 | May 2026 | stock_points renamed to skus; tags added on flows and skus; swim_lanes position field removed |
| 0.7 | May 2026 | Excel/SheetJS reference removed; app ID removed |
| 0.8 | May 2026 | boms and bom_components added |
| 0.9 | May 2026 | Persistence migrated to local JSON file (DDS_STORE); DataStore/Supabase references removed; project_id removed |
| 1.0 | May 2026 | Dirty state extended: Save button gated on dirty flag; DDS_STORE.markDirty() and DDS_STORE.resetDirty() exposed publicly |
| 1.1 | May 2026 | Node placement (DDS_LAYOUT) and auto-layout (DDS_MAP.runLayout) documented |

---

## 1. Platform

DDScope runs entirely within the CommWise platform as a single-page CommWise Web App. Single-user per session. No concurrent editing.

---

## 2. Stack

| Concern | Solution |
|---|---|
| Persistent storage | Local JSON file — in-memory store + File System Access API |
| Map rendering | Cytoscape.js v3.33.1 (cdnjs) |
| Swim-lane rendering | HTML overlay divs (not Cytoscape compounds) |
| Auto-layout | Dagre v0.8.5 + cytoscape-dagre adapter |

---

## 3. Data Model Structure

The project is held entirely in memory as a single JSON object (`DDS.state.project`). It contains 14 named arrays corresponding to the functional and presentation layers of the data model. Entity definitions and field descriptions are in [DDScope_DataModel.md](DDScope_DataModel.md).

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

### Presentation layer

| Key | Description |
|---|---|
| `maps` | Map definitions — name, tab order, direction |
| `map_nodes` | Node visibility and canvas position per map |
| `map_flows` | Flow visibility per map |
| `map_swim_lanes` | Swim-lane canvas geometry per map |

Every record includes system fields: `id` (integer, auto-incremented in memory), `created_at`, `updated_at` (ISO timestamps).

---

## 4. Persistence

### 4.1 In-memory store — DDS_STORE

`DDS_STORE` is the single data access layer for all DDScope modules. It exposes a synchronous CRUD API operating on `DDS.state.project`:

```javascript
DDS_STORE.query(table, filters, options)   // → array
DDS_STORE.insert(table, records)           // → array with generated ids
DDS_STORE.update(table, filters, updates)  // → array of updated records
DDS_STORE.remove(table, filters)           // → array of removed records
DDS_STORE.markDirty()                      // mark project as modified (for out-of-store mutations)
DDS_STORE.resetDirty()                     // clear dirty flag (used after project open)
```

IDs are integers auto-incremented per table, managed in `DDS_STORE._counters`. Counters are seeded from the maximum existing ID when a file is loaded.

### 4.2 File persistence

The project is persisted as a single `.json` file on the consultant's machine. No server, no database, no network dependency.

| Operation | Chrome / Edge | Other browsers |
|---|---|---|
| **Load** | `showOpenFilePicker()` — File System Access API | `<input type="file">` |
| **Save** | Write directly to the open file (`FileSystemWritableFileStream`) | Download (`<a download>`) |
| **Save As** | `showSaveFilePicker()` — new file | Download |

### 4.3 Auto-reopen (Chrome / Edge only)

The `FileSystemFileHandle` of the last open file is persisted in IndexedDB. On boot, DDScope checks whether the permission is already granted. If so, the file is reopened automatically with no user interaction. If the handle exists but permission has not been granted (e.g. after a browser restart), a prompt is triggered on the first user gesture. On other browsers, each session starts from scratch.

### 4.4 Dirty state

`DDS.state.dirty` is set to `true` on any `insert`, `update`, `remove`, or explicit `DDS_STORE.markDirty()` call (used for out-of-store mutations such as project name/description edits). A bullet indicator (`•`) is appended to the project name in the navigation bar, and the **Save** button becomes active.

`DDS.state.dirty` is reset to `false` — and the Save button disabled — on Load, Save, Save As, new project creation, and auto-reopen. `DDS_STORE.resetDirty()` is called at the end of `DDS.openProject()` to neutralise any inserts triggered internally during project open (e.g. the Map 1 safety insert).

### 4.5 File format

```json
{
  "version": 1,
  "project":        { "name": "...", "description": "...", "created_by": "..." },
  "swim_lanes":     [...],
  "node_types":     [...],
  "product_types":  [...],
  "nodes":          [...],
  "products":       [...],
  "flows":          [...],
  "skus":           [...],
  "boms":           [...],
  "bom_components": [...],
  "maps":           [...],
  "map_nodes":      [...],
  "map_flows":      [...],
  "map_swim_lanes": [...]
}
```

A file containing only a subset of keys is valid — absent arrays are initialised as empty on load.

---

## 5. Key Implementation Details

### Fit-to-canvas

`DDS_MAP.fitMap` computes the union bounding box of Cytoscape node positions (from `map_nodes` for the active map) and swim-lane geometry (from `map_swim_lanes` for the active map), then applies pan and zoom via `DDS_CY.viewport()`. A 50 ms `setTimeout` defers execution until the browser has painted the container.

### Node placement

`DDS_LAYOUT.placeNode(nodeId, mapId)` computes the initial canvas position for a new node. It is called by the Add node modal (`DDS_NODE_UI`), the Elements panel (`DDS_ELEMENTS`), and the AI assistant executor (`DDS_AI_UI`) — ensuring consistent placement across all creation paths.

The algorithm applies in order:

1. **Swim-lane assigned and visible on the map** — candidates are generated on a grid inside the swim-lane rectangle, scanning rows from bottom to top, left to right within each row. The first position whose distance to all existing nodes exceeds `MIN_DIST` is returned.
2. **No swim-lane, or swim-lane absent from the map** — the node is placed below the bounding box of all swim-lanes visible on the map, horizontally centred. If the position is occupied, the node shifts left by `FALLBACK_STEP`, repeated up to 20 times.
3. **No swim-lanes on the map** — the node is placed at the centre of the current viewport.

Tunable constants defined at the top of `DDS_LAYOUT` (SCRIPT 1250):

| Constant | Default | Description |
|---|---|---|
| `GRID_X` | 160 | Horizontal grid step inside a swim-lane |
| `GRID_Y` | 100 | Vertical grid step inside a swim-lane |
| `MARGIN` | 80 | Inner padding from swim-lane edges |
| `MIN_DIST` | 80 | Minimum distance to an existing node (occupied check) |
| `FALLBACK_Y` | 80 | Vertical offset below the swim-lane bounding box |
| `FALLBACK_STEP` | 160 | Horizontal shift step for the fallback position |

### Auto-layout

`DDS_MAP.runLayout()` runs Dagre independently on each swim-lane group, then translates and scales the resulting positions to fit inside the swim-lane rectangle. The flow direction is read from `maps[].direction` for the active map and translated to Dagre's `rankDir` parameter (`LR` for left-right, `RL` for right-left).

Algorithm:

1. Nodes are grouped by swim-lane presence on the active map. Nodes whose assigned swim-lane is not on the map are treated as free nodes.
2. For each swim-lane group, Dagre runs on the node subset (edges crossing swim-lanes are excluded from each sub-layout). The resulting positions are scaled to fit inside the swim-lane rectangle and centred within it.
3. Free nodes are laid out together as a separate Dagre run, then translated below the bounding box of all swim-lanes on the map.
4. All positions are persisted to `map_nodes` and `fitMap` is called.

Known limitation: flows that cross swim-lane boundaries are not considered when computing each swim-lane's internal layout. Inter-lane ordering remains as-is after layout.

### Flow endpoint handles

Rendered as Cytoscape overlay elements on the source and target nodes. Dragging a handle triggers a reroute that updates the `flows` array in memory and re-renders the map.

### Tab switching

Switching to Nodes, Products, or Settings reads from `DDS.state.project` synchronously. Switching between map tabs loads `map_nodes`, `map_flows`, and `map_swim_lanes` for the selected map, and refreshes the direction toggle button to reflect `maps[].direction` for the newly active map. If no project is open, a "Select a project" placeholder is shown.

### Swim-lane / Cytoscape sync

Swim-lane divs are kept in sync with the Cytoscape canvas via pan and zoom event listeners. Fit-to-canvas requires explicit bounding-box computation covering both layers because swim-lanes are outside the Cytoscape element tree. Geometry is read from `map_swim_lanes` for the active map.

### Active map state

`DDS_MAP.state.currentMapId` holds the ID of the active map. All canvas reads and writes (node positions, swim-lane geometry, flow visibility) are scoped to this ID. Switching map tabs updates `currentMapId` and triggers a full canvas reload.

### Node without swim-lane on active map

If a node has a `swim_lane_id` but the corresponding swim-lane has no `map_swim_lane` record for the active map, the node is rendered as free-floating — no swim-lane container is displayed for it on this map.

### Default swim-lane on node type

`node_types[].default_swim_lane_id` pre-selects a swim-lane in the Add node modal when a type is chosen. The pre-selection updates dynamically when the type changes in the modal. If the referenced swim-lane is deleted via Settings, all node types that referenced it have `default_swim_lane_id` set to `null` automatically.

---

*b2wise — Confidential*
