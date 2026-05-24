{REPLACE_ALL}
*v2.1 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) for entity definitions. [DDScope_UI.md](DDScope_UI.md) for rendering behaviour. [DDScope_Modules.md](DDScope_Modules.md) for the JavaScript module registry.*

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
| 1.4 | May 2026 | Note overlay on nodes: DDS_MAP.renderNoteGhosts, ghost node lifecycle, exclusions from fitMap and runLayout |
| 1.5 | May 2026 | skip_in_layout on map_flows: excluded from BFS rank computation; loaded on Cytoscape edges in loadMap |
| 1.6 | May 2026 | demands and map_demands added; DDS_DURATION utility module documented; CTT line HTML overlay documented |
| 1.7 | May 2026 | JavaScript module registry introduced; module table updated to reference DDScope_Modules.md |
| 1.8 | May 2026 | DDS_ACTIONS added (SCRIPT 1850) in functional layer; DDS_AI_EXECUTOR removed; DDS_AI responsibility updated |
| 1.9 | May 2026 | Helper layer introduced: DDS_NODES, DDS_PRODUCTS, DDS_FLOWS, DDS_SKUS, DDS_BOMS, DDS_DEMANDS. DDS_ACTIONS.execute() made synchronous. UI modules call helpers only. |
| 2.0 | May 2026 | DDS_ICONS added (SCRIPT 110) — SVG icon library; icon_key, label_position, transparent_bg on node_types; applyNodeColors extended to applyAllNodeStyles. |
| 2.1 | May 2026 | DDS_ANNOTATIONS helper and DDS_ANNOTATIONS_UI table view added to module registry |
| 2.2 | May 2026 | DDS_TRANSACTIONS (SCRIPT 1860) added - stub undo/redo + transaction ownership documented |
| 2.3 | May 2026 | DDS_TOOLS (SCRIPT 40) added — transversal utility module (DDS_TOOLS.log levelled logger). TX (SCRIPT 1865) et DDS_TX_HELPER (SCRIPT 1870) ajoutés — catalogue de labels de transaction et wrapper UI transaction. |

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

## 3. JavaScript Modules


DDScope logic is split across named JavaScript modules, each living in a dedicated CommWise SCRIPT block. All modules are exposed as globals on `window` under the `DDS_` prefix.

**[DDScope_Modules.md](DDScope_Modules.md) is the authoritative registry** for all `DDS_*` modules. It records for each module: CommWise block address (`code_type` + `position`), public API, runtime dependencies, testability classification, and extraction readiness. Consult it before working on any module.

The tables below are a structural overview only — patterns, responsibilities, and layer boundaries.
They do not duplicate the API contracts, block addresses, or dependency declarations found in the registry.
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

## 6. Key Implementation Details

### Fit-to-canvas

`DDS_MAP.fitMap` computes the union bounding box of Cytoscape node positions (from `map_nodes` for the active map) and swim-lane geometry (from `map_swim_lanes` for the active map), then applies pan and zoom via `DDS_CY.viewport()`. A 50 ms `setTimeout` defers execution until the browser has painted the container.

Only BFS rank badge debug nodes are excluded from the bounding box calculation — note ghosts, flow note ghosts, and annotation ghosts are included.

### Node placement

`DDS_LAYOUT.placeNode(nodeId, mapId)` computes the initial canvas position for a new node. It is called by the Add node modal (`DDS_NODE_UI`), the Elements panel (`DDS_ELEMENTS`), and the AI assistant executor (`DDS_ACTIONS`) — ensuring consistent placement across all creation paths.

The algorithm applies in order:

1. **Swim-lane assigned and visible on the map** — the node is placed vertically centred in the lane (`y = lane_y + lane_height / 2`), and horizontally after the rightmost existing node in that lane (`x = max_node_x + GRID_X`), clamped to the lane right boundary minus `MARGIN`.
2. **No swim-lane, or swim-lane absent from the map** — the node is placed below the bounding box of all swim-lanes visible on the map, horizontally centred. If the position is occupied, the node shifts left by `FALLBACK_STEP`, repeated up to 20 times.
3. **No swim-lanes on the map** — the node is placed at the centre of the current viewport.

### Auto-layout

`DDS_MAP.runLayout()` uses a custom BFS-based ranking algorithm per swim-lane. Nodes without a swim-lane on the active map are not repositioned — their positions are preserved as-is.

**Ghost note nodes are excluded** from the layout node grouping (`node.hasClass('dds-note-ghost')` filter applied before lane assignment).

#### BFS ranking — `_computeRanksForLane(laneNodeIds)`

Ranks are computed **locally per swim-lane**, considering only flows where both endpoints belong to the lane. Flows entering from other swim-lanes are ignored — nodes with no internal predecessor are treated as sources (rank 0).

**`layout_offset`** (integer, loaded from `map_flows` onto each Cytoscape edge as `edge.data('layoutOffset')`) controls BFS inclusion and column distance:
- `0` — the flow is excluded from BFS entirely; the nodes it connects are free to share a column.
- `N > 0` (default `1`) — the target must be placed at least `N` columns after the source.

**`layout_direction_inverted`** (boolean, loaded as `edge.data('layoutDirectionInverted')`) applies to bidirectional flows only. When `true`, source and target are swapped in the BFS predecessor/successor graph, so the rank propagates in the opposite direction.

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

`layout_offset` (integer) is loaded from `map_flows` onto each Cytoscape edge as `edge.data('layoutOffset')`. It controls whether the edge participates in BFS and the minimum column distance it enforces.

`layout_direction_inverted` (boolean) is loaded as `edge.data('layoutDirectionInverted')` for bidirectional flows only. When active, `_computeRanksForLane` swaps source and target in the predecessor/successor graph.

`show_notes_label` (boolean) controls whether `flows.notes` is rendered as an edge label on the canvas.

`notes_as_annotation` (boolean) controls the rendering mode of the flow note when `show_notes_label` is `true`. When `false` (default), the note is rendered as a native Cytoscape edge label. When `true`, a ghost node (class `dds-flow-note-ghost`, id `flow-note-{flow_id}`) is created and positioned at the flow midpoint offset by `notes_annotation_dx` and `notes_annotation_dy`. The ghost is draggable; releasing it persists the new offset to `map_flows`. The ghost is excluded from fit-to-canvas and auto-layout using the same filter as `dds-note-ghost` nodes (`node.hasClass('dds-flow-note-ghost')`).

`curve_style` (text) controls the edge routing style. Supported values are `taxi` (default) and `straight`.

### Vertical and horizontal snap on node drag

During manual drag, two guide lines appear when the dragged node is within 6px canvas of a snap target:
- A horizontal guide (`.dds-snap-guide`) for Y snap.
- A vertical guide (`.dds-snap-guide-v`) for X snap.

Both snaps are applied simultaneously on `dragfree`, not during drag, to avoid cursor detachment. The final position is `(newX, newY)`, combining both axes independently.

**Snap targets (identical rules for both axes):**
1. **Rule 1** — coordinate of any directly connected neighbour (amont or aval) visible on the active map.
2. **Rule 2** — median coordinate of two same-side neighbours (both amont or both aval) sharing the same perpendicular coordinate (within 20px tolerance), with no other map node between them on that axis.

Y snap considers neighbours sharing the same X column; X snap considers neighbours sharing the same Y row.

### BFS rank badges (debug)

When the `show_bfs_ranks` setting is active, `DDS_MAP.renderBfsRankBadges(mapId)` creates a Cytoscape ghost node (class `dds-bfs-badge`) above each swim-lane node that has stored `bfs_rank_min` and `bfs_rank_max` values. The badge label shows `min` when `min === max`, or `min-max` otherwise.

Badges are non-selectable, non-draggable, styled as amber rounded rectangles, and excluded from the `fitMap` bounding box and `runLayout` grouping — identical exclusion pattern to `dds-note-ghost`.

`DDS_MAP.clearBfsRankBadges()` removes all badges from the canvas.

`renderBfsRankBadges` is called at the end of `_persist()` in `runLayout` (after storing ranks) and at the end of `loadMap` (if ranks are already stored). Both calls are conditional on `DDS_SETTINGS.isShowBfsRanks()`.

Ranks are stored on `map_nodes` (`bfs_rank_min`, `bfs_rank_max`) only when `show_bfs_ranks` is active — `runLayout` skips the store update otherwise.

### Tag-based node coloring and icon rendering

`DDS_MAP.resolveNodeColor(nodeId)` returns the background color for a node: iterates `tag_colors` in insertion order and returns the color of the first entry whose `tag` is present in the node's `tags` array. Falls back to `DDS_MAP.DEFAULT_NODE_COLOR` (`#e2e8f0`) when no match is found.

`DDS_MAP.applyAllNodeStyles()` applies the full visual style for every node currently on the Cytoscape canvas. It is called at the end of `loadMap` and whenever `tag_colors` is modified (add or delete in Settings).

`DDS_MAP.applyNodeStyle(nodeId)` applies the style for a single node. Called immediately when a tag is added or removed from a node in the side panel, without requiring a full map reload. The logic:

1. Resolve `color = DDS_MAP.resolveNodeColor(nodeId)`.
2. Look up `node_type` for the node → read `icon_key`, `label_position`, `transparent_bg`.
3. **No `icon_key`** (absent, null, or not found in `DDS_ICONS`): apply `background-color: color`, shape and label position only. Fallback — fully backwards-compatible.
4. **`icon_key` found, `transparent_bg: false`** (default — white icon on colored background):
   - `background-color`: resolved tag color
   - `background-image`: `DDS_ICONS.toDataUrl(icon_key)` — SVG with `fill="white"`
   - `background-fit: contain`, `background-clip: none`
   - `background-opacity: 1`
5. **`icon_key` found, `transparent_bg: true`** (colored icon on transparent background):
   - `background-opacity: 0` — node shape background is invisible
   - `background-image`: `DDS_ICONS.toDataUrl(icon_key, color)` — SVG with `fill="{{color}}"` replaced by resolved tag color
   - `background-fit: contain`, `background-clip: none`
6. Apply label position from `node_types[].label_position`:
   - `center` (default): `text-valign: center`, `text-margin-y: 0`, label color `white`
   - `below`: `text-valign: bottom`, `text-margin-y: 8`, label color `#222222`
   - `above`: `text-valign: top`, `text-margin-y: -8`, label color `#222222`

**Fixed size for icon nodes with external label:** when `label_position` is `below` or `above` and `icon_key` is defined, `width` and `height` are forced to `40px` to prevent the node shape from resizing with the label length. Shape-only nodes (no `icon_key`) keep their natural Cytoscape dimensions.

**Selection highlight for transparent_bg nodes:** nodes with `transparent_bg: true` have `border-opacity: 0` by default. On `select`, `border-opacity` is temporarily set to `1` to make the selection border visible. On `unselect`, `border-opacity` is restored to `0`.

**Cytoscape `background-image` constraints (validated experimentally):**
- The SVG must carry explicit `width` and `height` attributes (e.g. `width="32" height="32"`). Without them, Cytoscape cannot determine the intrinsic size and clips the image.
- `background-fit: contain` scales the image to fit the node — do not combine with `background-width`/`background-height` in pixels, as they conflict.
- `background-color: transparent` is not supported — use `background-opacity: 0` instead.
- `background-clip` has no significant effect on rectangular nodes with `background-fit: contain`.

### Legend overlay

`DDS_MAP.renderLegend()` builds an SVG inline overlay positioned at the bottom-left of the canvas wrap (`.dds-legend`). It computes the set of (node_type × tag) combinations present on the active map, groups them by node type, and renders one SVG shape entry per combination (shape from `node_types[].shape`, fill from `tag_colors[].color`, label = tag name).

`DDS_MAP.toggleLegend()` flips `legend_visible` on the active map record in `DDS_STORE` and re-renders. The state is persisted in the JSON file.

The legend is recalculated on: `loadMap`, map tab switch, tag modification on a node, and `tag_colors` add/delete.

The SVG shapes used in the legend (`rectangle`, `diamond`, `ellipse`, `hexagon`, `triangle`, `barrel`, `rhomboid`, `star`) are rendered as inline SVG — compatible with html2canvas capture for PDF export.

### Note overlay on nodes

`DDS_MAP.renderNoteGhosts(mapId)` creates a Cytoscape ghost node for each `map_node` record where `note_visible = true` and `nodes.notes` is non-empty. It is called at the end of `loadMap`, after `renderLegend`.

**Ghost node properties:**
- Cytoscape id: `note-{node_id}`
- Classes: `dds-note-ghost`
- Data: `nodeId`, `mapNodeId`, `label` (= `nodes.notes`)
- Position: `(map_node.x + note_dx, map_node.y + note_dy)`
- Style: italic, 11px, colour `#64748b`, transparent background, no border, `text-wrap: wrap`, `text-max-width: 200px`
- `selectable: false` via CSS selector; draggable

**Drag behaviour:**
- Ghost drag (`dragfree` on `node.dds-note-ghost`): recomputes `note_dx = ghost.x − parent.x`, `note_dy = ghost.y − parent.y` and persists to `map_nodes`.
- Parent node drag (`dragfree` on regular nodes): repositions the ghost at `(new_x + note_dx, new_y + note_dy)` without modifying the offsets.

**Exclusions:**
- `fitMap`: ghost nodes filtered out of the bounding box calculation.
- `runLayout`: ghost nodes filtered out of lane grouping — not repositioned by layout.

**AI assistant integration:** when `DDS_ACTIONS` applies an `update_node` action containing a non-empty `notes` field, it sets `note_visible = true` on the corresponding `map_node` of the active map, so the note appears automatically after the plan is executed.

### DDS_DURATION

A utility module providing duration comparison and formatting functions. Used by the CTT line renderer and by future lead time aggregation features. Fully documented in [DDScope_Modules.md](DDScope_Modules.md).

```javascript
DDS_DURATION.toHours(value, unit)         // → number — converts any duration to hours (internal comparison base)
DDS_DURATION.compare(v1, u1, v2, u2)     // → { value, unit } — returns the longer of two durations
DDS_DURATION.toDisplay(value, unit)       // → string — formats as "5 days", "3 weeks", etc.
// DDS_DURATION.add(v1, u1, v2, u2)      // reserved — v2, not implemented
```

Unit values: `hours`, `days`, `weeks`, `months`, `years`.

Conversion factors used by `toHours`:

| Unit | Hours |
|---|---|
| hours | 1 |
| days | 24 |
| weeks | 168 |
| months | 720 |
| years | 8760 |

### CTT line overlay

The CTT line is a per-node HTML overlay rendered inside `.dds-canvas-wrap`, following the same synchronisation pattern as swim-lanes (pan/zoom events update `transform`).

**Structure per node (when at least one `map_demands` record exists for the node on the active map):**

```
div.dds-ctt-line-wrap   — positioned absolutely, transform-synced with Cytoscape viewport
  div.dds-ctt-label     — "CTT: 5 days", positioned above the line centre
  div.dds-ctt-line      — the red horizontal bar
  div.dds-ctt-handle-l  — left resize handle (red circle)
  div.dds-ctt-handle-r  — right resize handle (red circle)
```

**Displayed value:** `DDS_DURATION.toDisplay` applied to the max CTT among all `map_demands` for this node on the active map, prefixed with `CTT:`.

**Position:** centre of the line at `(map_node.x + demand_x, map_node.y + demand_y)`. Default offsets: `demand_x = 0`, `demand_y = 60`.

**Length:** `demand_length` canvas units. Default on first placement: width of the node as rendered by Cytoscape (`node.renderedBoundingBox().w`), converted to model units via zoom factor.

**Drag behaviour:** dragging `dds-ctt-line-wrap` repositions the overlay and persists `demand_x`, `demand_y` to `map_nodes`.

**Resize behaviour:** dragging `dds-ctt-handle-l` or `dds-ctt-handle-r` extends or shrinks the line symmetrically and persists `demand_length` to `map_nodes`.

**Node drag:** when a node is dragged (`dragfree`), the CTT overlay is repositioned at `(new_x + demand_x, new_y + demand_y)` without modifying the offsets — same pattern as note ghosts.

**Lifecycle:**
- Created by `DDS_MAP.renderCTTOverlays(mapId)`, called at the end of `loadMap` and after any `map_demands` insert or delete.
- Destroyed and recreated on map switch.
- Not included in `fitMap` bounding box calculation.
- Not affected by `runLayout`.

---

*b2wise — Confidential*
