# DDScope — Rendering Engine
*v0.2 — Draft — May 2026*

*See also: [DDScope_Presentation.md](DDScope_Presentation.md) for layout logic. [DDScope_UI.md](DDScope_UI.md) for interaction triggers. [DDScope_Architecture.md](DDScope_Architecture.md) for layer dependencies.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial extraction from DDScope_Architecture.md |
| 0.2 | May 2026 | §4 Fit-to-canvas, §5 Taxi edge rendering, §6 BFS rank badges added — extracted from DDScope_Architecture.md §6 |
| 0.3 | May 2026 | Internal links updated — single flat docs/ folder |

---

## 1. Purpose

The rendering engine translates the `map_*` entities in `DDS_STORE` into a visible canvas. It owns all Cytoscape.js interactions and HTML overlay management. It has no knowledge of business rules — it reads the store and paints what it finds there.

**Dependency rule:** rendering modules depend on `DDS_STORE` (read-only for `map_*` tables), Cytoscape (`DDS_CY`), and the DOM. They never call `DDS_ACTIONS` or helper modules directly.

When a layout computation is needed, the rendering engine calls the presentation layer (`DDS_LAYOUT`) and injects the required geometry. After the presentation layer updates `map_*` in `DDS_STORE`, the rendering engine calls `loadMap` (or a targeted incremental update) to reflect the new state.

---

## 2. Full Rebuild — `loadMap`

`DDS_MAP.loadMap(mapId)` is the entry point for a full canvas rebuild. It reads the current `map_*` state from `DDS_STORE` and constructs the Cytoscape element collection from scratch.

**Steps:**
1. Clear the current Cytoscape instance (`DDS_CY.remove('*')`).
2. Build node descriptors `{ data: { id, label, ... }, position: { x, y } }` for each `map_nodes` record.
3. Build edge descriptors for each `map_flows` record, carrying `layoutOffset`, `layoutDirectionInverted`, `waypoint_pct`, `curve_style`, and `show_notes_label` as edge data.
4. Add all elements to Cytoscape in one batch (`DDS_CY.add([...nodes, ...edges])`).
5. Apply per-edge `taxi-turn` values from `waypoint_pct`.
6. Call `applyAllNodeStyles()`.
7. Call `renderNoteGhosts(mapId)`.
8. Call `renderFlowNoteGhosts(mapId)`.
9. Call `renderAnnotationGhosts(mapId)`.
10. Call `renderLegend()`.
11. If `show_bfs_ranks` is active: call `renderBfsRankBadges(mapId)`.
12. Call `DDS_SWIMLANES.render(mapId)`.

`loadMap` is called only on map open and map switch. It must never be called inside a Cytoscape event handler or via `setTimeout(0)` — see the critical drag-stability rule in `CLAUDE.md`.

---

## 3. Incremental Updates

Many operations modify one or a few Cytoscape elements without requiring a full rebuild. The rendering engine exposes targeted update functions for these cases.

| Operation | Function | What it does |
|---|---|---|

---

## 4. Fit-to-canvas — `fitMap`

`DDS_MAP.fitMap` computes the union bounding box of all visible elements on the active map and applies pan and zoom via `DDS_CY.viewport()`.

**Bounding box inputs:**
- Cytoscape node positions from `map_nodes` for the active map.
- Swim-lane geometry from `map_swim_lanes` for the active map.

**Exclusions:** BFS rank badge debug nodes (class `dds-bfs-badge`) are excluded from the bounding box calculation. Note ghosts, flow note ghosts, and annotation ghosts are **included**.

**Timing:** execution is deferred by 50 ms via `setTimeout` to ensure the browser has painted the container before viewport computation.

`fitMap` is triggered on project open, map tab switch, and via the Fit button (⛶) in the toolbar.

---

## 5. Taxi Edge Rendering

### 5.1 Edge curve and bend

Edges use `curve-style: taxi` with `taxi-direction: horizontal` by default. The `curve_style` field on `map_flows` can override this to `straight`.

The taxi bend position is controlled per-edge via `taxi-turn`, applied individually after `DDS_CY.add()` in `loadMap`. The value derives from `waypoint_pct` (float, 0–1) stored in `map_flows`. Default: `0.5` (midpoint).

### 5.2 Waypoint drag handle

A draggable handle (`.dds-waypoint-handle`) appears on the bend of the selected taxi edge. Drag updates `taxi-turn` in real time; release persists `waypoint_pct` to `map_flows`. Double-click resets to `0.5`.

The fields `layout_offset` and `layout_direction_inverted` are loaded from `map_flows` onto each Cytoscape edge as `edge.data('layoutOffset')` and `edge.data('layoutDirectionInverted')` for use by the presentation layer layout algorithm — see [DDScope_Presentation.md](DDScope_Presentation.md) §4.

### 5.3 Flow note ghost (`dds-flow-note-ghost`)

When `show_notes_label` and `notes_as_annotation` are both `true` on a `map_flows` record, a ghost node (class `dds-flow-note-ghost`, id `flow-note-{flow_id}`) is created and positioned at the flow midpoint offset by `notes_annotation_dx` and `notes_annotation_dy`.

- The ghost is **draggable**: release persists the new offset to `map_flows`.
- The ghost is **excluded** from fit-to-canvas and auto-layout (same filter as `dds-note-ghost`).
- When `notes_as_annotation` is `false`, the note is rendered as a native Cytoscape edge label instead.

---

## 6. BFS Rank Badges (debug)

When the `show_bfs_ranks` debug setting is active, `DDS_MAP.renderBfsRankBadges(mapId)` creates a Cytoscape ghost node (class `dds-bfs-badge`) above each swim-lane node that has stored `bfs_rank_min` and `bfs_rank_max` values in `map_nodes`.

These ghost nodes are excluded from the fit-to-canvas bounding box calculation. They are created and destroyed on each `loadMap` call — they are not persisted to `map_nodes` or exported in JSON.

---

*b2wise — Confidential*
