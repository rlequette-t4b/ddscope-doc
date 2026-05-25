# DDScope — Backlog

*Living document. Items move from §1 (pre-backlog) to §2 (committed features) when sufficiently defined and prioritised. Each committed entry includes implementation notes and user-facing copy for the future user manual.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 1.0 | May 2026 | Extracted from DDScope_Overview.md §5; FEAT-001 added |

---

## 1. Pre-backlog

Items collected but not yet committed to any version. Not to-do items — inputs for future planning sessions.

**§1.1** contains items with sufficient definition to be discussed for prioritisation. **§1.2** contains fragments and early ideas that need further thinking before they can be scoped.

### 1.1 Candidates

**Node badges on the map canvas**
Display visual indicators directly on Cytoscape nodes. Two categories:
- *Tag-triggered badges* — a badge appears when a specific tag is present on the node. Target tags: `warning` (⚠️), `info` (ℹ️), `buffer` (dedicated icon). Configurable list, potential link with `tag_colors`.
- *Demand badge* — displayed when at least one SKU on the node has a `demands` record.
Multiple badges may coexist on the same node (e.g. warning + demand). Layout: horizontal row, top-right corner. Proposed rendering: Cytoscape ghost nodes (same pattern as note ghosts) for automatic pan/zoom sync and html2canvas compatibility. Visibility scope (all maps vs per-map toggle) to be defined.

**Unicode symbols in text fields displayed on the canvas**
Node notes (displayed as ghost overlays) and annotation content accept free Unicode text, including symbols and emoji (⚠ ▲ ℹ ✓ ✗ 🔴 🟡 🟢 …). Cytoscape renders these natively via its Canvas 2D label engine. Cross-platform rendering is best-effort — no guarantee of visual consistency across OS and browser combinations.

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

### 1.2 Ideas

**Tag-specific selection style**
A distinct visual style for selected nodes when tag-based coloring is active — to avoid confusion between selection highlight and tag color. Approach undefined.

**`DDS_MODEL` — deprecate legacy cascade modules**
Once `DDS_MODEL` is implemented, progressively migrate callers of `DDS_PRODUCTS`, `DDS_BOMS`, `DDS_DEMANDS` to `DDS_MODEL` / `DDS_STORE` direct calls, then remove the deprecated modules. Tracked in `DDScope_Modules.md` backlog.

---

## 2. Committed features

Entry format:

```
### FEAT-NNN — Short title
Status: backlog | in-progress | done
Priority: 1 (core) | 2 (enhancement) | 3 (nice-to-have)
Area: map | panel | tables | AI | settings | infra

**Description**
**Implementation notes**
**User manual copy**
```

---

### FEAT-001 — Lane-constrained drag with Shift override

Status: backlog
Priority: 2
Area: map

**Description**

Currently, nodes and annotation ghosts can be dragged anywhere on the canvas with no awareness of swim-lane boundaries. This feature adds soft lane constraints to drag interactions:

- **Without Shift:** dragging a node or annotation is constrained to its assigned swim lane. The element slides along the lane border instead of leaving it (cursor-on-screen-edge behaviour). Nodes without an assigned lane are blocked from entering any lane.
- **With Shift:** drag is free. The swim lane currently under the cursor is highlighted with a coloured border. On drop:
  - If the element lands on a different lane → confirmation modal to reassign.
  - If the element lands outside all lanes → confirmation modal to remove from lane.
  - If the element lands on the same lane → no modal, position persisted normally.

Both nodes and annotation ghosts follow the same logic (annotations have a `swim_lane_id`).

Undo/redo: lane reassignment uses `TX.NODE_ASSIGN_LANE` (already wired). Position is persisted as usual via `TX.MAP_MOVE_NODE` / `TX.MAP_MOVE_ANNOTATION`.

**Implementation notes**

Planned in two sessions:

*Session A — Clamping (without Shift)*
- `DDS_MAP.initCy` — `drag` handler: real-time clamping via `node.position()`.
- New helpers in `DDS_MAP`:
  - `_getLaneBounds(mapId)` — canvas rects for all lanes on the active map (invalidated on lane resize).
  - `_clampToLane(pos, rect)` — clamps a canvas position inside a lane rect.
  - `_clampOutsideLanes(pos, boundsArray)` — repels a free node away from all lane rects.
- Affected blocks: SCRIPT 1000.
- CSS: no change needed for clamping alone.

*Session B — Shift-drag highlight + confirmation modal*
- `DDS_MAP.initCy` — `drag` handler (Shift branch): hit-test + highlight.
- `DDS_MAP.initCy` — `dragfree` handlers (node + annotation ghost): Shift branch opens modal.
- New helpers in `DDS_MAP`:
  - `_hitTestLane(pos, mapId)` — returns the `swim_lane_id` under a canvas position, or `null`.
  - `_highlightLane(swimLaneId | null)` — adds/removes `.dds-lane-drag-target` class on overlay divs.
  - `_openLaneChangeModal(entityId, type, newLaneId, newPos, cyEl)` — lightweight confirm/cancel modal injected dynamically (not reusing `DDS_REMOVE` overlay).
- CSS: `.dds-swimlane.dds-lane-drag-target { border: 2px solid var(--dds-color-accent); }`.
- Affected blocks: SCRIPT 1000, one STYLE block.

*Known constraints*
- Lane bounds are in canvas coordinates. Must account for Cytoscape pan/zoom when converting from screen coordinates during drag.
- Annotation ghosts use canvas coordinates directly (same as nodes) — no additional conversion needed.
- Code factorisation between node drag and annotation drag is deferred (noted as future refactor in DDScope_UndoRedo.md §3.7).

**User manual copy**

> **Moving nodes and annotations within a swim lane**
>
> When you drag a node or annotation on the map, it stays within its assigned swim lane — it slides along the lane border if you push it to the edge, keeping your map organised automatically.
>
> **Reassigning to a different lane**
>
> To move an element to a different swim lane, hold **Shift** while dragging. The swim lane under your cursor will be highlighted. Release the element on the target lane and confirm the reassignment in the dialogue that appears.
>
> To remove an element from its lane entirely, hold **Shift** and drop it in the open area outside all lanes. Confirm in the dialogue to unassign it.
>
> *Tip: lane reassignment is undoable — press Ctrl+Z if you change your mind.*

---

*b2wise — Confidential*
