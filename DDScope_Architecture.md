# DDScope — Architecture
*v1.3 — Draft — May 2026*

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
| 1.2 | May 2026 | Auto-layout upgraded to custom BFS ranking per swim-lane; waypoint handle on taxi edges; vertical snap on drag |
| 1.3 | May 2026 | tag_colors table added; legend_visible on maps; DDS_MAP tag color + legend functions documented |

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
| Auto-layout | Custom BFS ranking per swim-lane (DDS_MAP.runLayout) + Dagre v0.8.5 for free nodes |

---

## 3. Data Model Structure

The project is held entirely in memory as a single JSON object (`DDS.state.project`). It contains 15 named arrays corresponding to the functional and presentation layers of the data model. Entity definitions and field descriptions are in [DDScope_DataModel.md](DDScope_DataModel.md).

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

### Presentation layer

| Key | Description |
|---|---|
| `maps` | Map definitions — name, tab order, direction, legend_visible |
| `map_nodes` | Node visibility and canvas position per map |
| `map_flows` | Flow visibility per map + taxi bend position (`waypoint_pct`) |
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

`DDS.state.dirty` is set to `true` on any `insert`, `update`, `remove`, or explicit `DDS_STORE.markDirty()` call. A bullet indicator (`•`) is appended to the project name in the navigation bar, and the **Save** button becomes active.

`DDS.state.dirty` is reset to `false` on Load, Save, Save As, new project creation, and auto-reopen.

### 4.5 File format

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

### Auto-layout

`DDS_MAP.runLayout()` uses a custom BFS-based ranking algorithm per swim-lane. Nodes without a swim-lane on the active map are not repositioned — their positions are preserved as-is.

#### BFS ranking — `_computeRanksForLane(laneNodeIds)`

Ranks are computed **locally per swim-lane**, considering only flows where both endpoints belong to the lane. Flows entering from other swim-lanes are ignored — nodes with no internal predecessor are treated as sources (rank 0).

**rankMin** — longest-path from sources (Kahn topological sort, cycle-safe). Ensures a node is placed after all its internal predecessors.

**rankMax** — second pass from rankMin:
- `rankMax(n) = min(rankMin(successors)) − 1` — a node cannot be placed after any of its successors.
- If no internal successors: `rankMax(n) = max(rankMin)` across the lane — the node may float to the last column.
- `rankMax ≥ rankMin` is enforced.

#### Column assignment — `_placeLaneNodes`

Each node is assigned to the column (rank value) in `[rankMin, rankMax]` whose canvas X is closest to the node's pre-layout X. This allows the user to control column placement by repositioning a node before running Layout.

Column X positions are evenly spaced (max 150px between columns), centred within the swim-lane width.

#### Vertical placement within a column

- **1–2 nodes**: pre-layout Y is preserved, clamped to lane bounds with a 20px margin.
- **3+ nodes**: spread evenly between the column's own YMin/YMax (pre-layout), clamped to lane bounds with a 20px margin. Sort order within the column follows pre-layout Y (ascending).

### Taxi edge waypoint

Edges use `curve-style: taxi` with `taxi-direction: horizontal`. The bend position is controlled per-edge via `taxi-turn`, applied individually after `DDS_CY.add()` in `loadMap`.

`waypoint_pct` (float, 0–1, nullable) is stored in `map_flows` and loaded with each edge. Default: `0.5` (midpoint). A draggable handle (`.dds-waypoint-handle`) appears on the bend of the selected edge. Drag updates `taxi-turn` in real time; release persists `waypoint_pct` to `map_flows`. Double-click resets to `0.5`.

### Vertical snap on node drag

During manual drag, a guide line (`.dds-snap-guide`) appears when the dragged node's Y is within 6px canvas of a snap target. Snap is applied on `dragfree`, not during drag, to avoid cursor detachment.

**Snap targets:**
1. **Rule 1** — Y of any directly connected neighbour (amont or aval) visible on the active map.
2. **Rule 2** — Y median of two same-side neighbours (both amont or both aval) sharing the same X column (within 20px tolerance), with no other map node between them on that column.

### Tag-based node coloring

`DDS_MAP.resolveNodeColor(nodeId)` returns the background color for a node: it iterates `tag_colors` in insertion order and returns the color of the first entry whose `tag` is present in the node's `tags` array. If no match is found, it returns `DDS_MAP.DEFAULT_NODE_COLOR` (`#e2e8f0`).

`DDS_MAP.applyNodeColors()` applies `resolveNodeColor` to every node currently on the Cytoscape canvas. It is called at the end of `loadMap` and whenever `tag_colors` is modified (add or delete in Settings).

Node color is also refreshed immediately in the side panel when a tag is added or removed from a node, without requiring a full map reload.

### Legend overlay

`DDS_MAP.renderLegend()` builds an SVG inline overlay positioned at the bottom-left of the canvas wrap (`.dds-legend`). It computes the set of (node_type × tag) combinations present on the active map, groups them by node type, and renders one SVG shape entry per combination (shape from `node_types[].shape`, fill from `tag_colors[].color`, label = tag name).

`DDS_MAP.toggleLegend()` flips `legend_visible` on the active map record in `DDS_STORE` and re-renders. The state is persisted in the JSON file.

The legend is recalculated on: `loadMap`, map tab switch, tag modification on a node, and `tag_colors` add/delete.

The SVG shapes used in the legend (`rectangle`, `diamond`, `ellipse`, `hexagon`, `triangle`, `barrel`, `rhomboid`, `star`) are rendered as inline SVG — compatible with html2canvas capture for PDF export.

---

*b2wise — Confidential*
