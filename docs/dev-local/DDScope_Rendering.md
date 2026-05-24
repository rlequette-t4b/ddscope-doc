# DDScope — Rendering Engine
*v0.1 — Draft — May 2026*

*See also: [DDScope_Presentation.md](../shared/DDScope_Presentation.md) for layout logic. [DDScope_UI.md](../shared/DDScope_UI.md) for interaction triggers. [DDScope_Architecture.md](../shared/DDScope_Architecture.md) for layer dependencies.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial extraction from DDScope_Architecture.md |

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

`loadMap` is called only on map open and map switch. It must never be called inside a Cytoscape event handler or via `setTimeout(0)` — see the critical drag-stability rule in `META 2`.

---

## 3. Incremental Updates

Many operations modify one or a few Cytoscape elements without requiring a full rebuild. The rendering engine exposes targeted update functions for these cases.

| Operation | Function | What it does |
|---|---|---|