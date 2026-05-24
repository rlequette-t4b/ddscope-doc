# DDScope — Presentation Layer
*v0.1 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) for entity definitions. [DDScope_Architecture.md](DDScope_Architecture.md) for layer dependencies.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial extraction from DDScope_Architecture.md |

---

## 1. Purpose

The presentation layer is responsible for creating and mutating the `map_*` entities in `DDS_STORE`. It contains all logic that determines how functional entities (nodes, flows, swim-lanes, annotations) are arranged on a map, without any dependency on Cytoscape, the DOM, or any rendering technology.

This layer is the boundary between the functional model and the visual representation. It is the only layer that writes to the presentation tables (`map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands`, `map_annotations`).

**Dependency rule:** presentation layer modules depend only on `DDS_STORE`. They have no knowledge of Cytoscape, HTML overlays, or any browser rendering API.

**Testability:** because the presentation layer is pure — it reads and writes plain objects in `DDS_STORE` — it can be tested independently of any rendering context, using stubs for externally-injected geometry.

---

## 2. Dependency Injection

Some presentation algorithms require geometric information that is not stored in `DDS_STORE` and can only be known at render time (e.g. node dimensions, swim-lane bounds as currently displayed on screen). This information is passed by the rendering layer as function arguments — the presentation layer never reads it from Cytoscape or the DOM directly.

**Convention:** injected geometry is passed as a plain object or callback at call time.

Examples:
- `getNodeSize(nodeId) → { width, height }` — returns the current rendered dimensions of a node, queried from Cytoscape by the caller.
- `getSwimLaneBounds(laneId) → { x, y, width, height }` — returns the current rendered bounds of a swim-lane, queried from the HTML overlay by the caller.

This contract allows the presentation layer to be exercised in test with fixed stub values, and allows the rendering layer to substitute alternative geometry sources (e.g. a simplified renderer, an image-based renderer, a headless test stub).

---

## 3. Node Placement

`DDS_LAYOUT.placeNode(nodeId, mapId, { getSwimLaneBounds, getViewportCenter })` computes the initial `(x, y)` position for a node being added to a map and writes it to `map_nodes`.

The algorithm applies in order:

1. **Swim-lane assigned and visible on the map** — the node is placed vertically centred in the lane (`y = lane_y + lane_height / 2`), and horizontally after the rightmost existing node in that lane (`x = max_node_x + GRID_X`), clamped to the lane right boundary minus `MARGIN`.
2. **No swim-lane, or swim-lane absent from the map** — the node is placed below the bounding box of all swim-lanes visible on the map, horizontally centred. If the position is occupied, the node shifts left by `FALLBACK_STEP`, repeated up to 20 times.
3. **No swim-lanes on the map** — the node is placed at the centre of the current viewport (injected as `getViewportCenter()`).

The same algorithm is used for annotation placement. `DDS_LAYOUT.placeAnnotation(annotationId, mapId, { getSwimLaneBounds, getViewportCenter })` follows identical rules.