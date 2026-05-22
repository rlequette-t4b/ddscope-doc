- [DDScope — User Interface](#ddscope--user-interface)
  - [Version History](#version-history)
  - [1. Workflow](#1-workflow)
  - [2. Views](#2-views)
    - [2.1 Map](#21-map)
    - [2.2 Table — Nodes](#22-table--nodes)
    - [2.3 Table — Flows](#23-table--flows)
    - [2.4 Table — Products](#24-table--products)
    - [2.5 Table — BOMs](#25-table--boms)
    - [2.6 Table — Demand](#26-table--demand)
  - [3. Navigation Bar](#3-navigation-bar)
    - [Project name](#project-name)
    - [Save button](#save-button)
  - [4. Map Tabs](#4-map-tabs)
    - [Tab bar](#tab-bar)
    - [Elements panel](#elements-panel)
  - [5. Map Interaction](#5-map-interaction)
    - [Node interactions](#node-interactions)
    - [Add product on map](#add-product-on-map)
    - [Note ghost interactions](#note-ghost-interactions)
    - [CTT line interactions](#ctt-line-interactions)
    - [Flow interactions](#flow-interactions)
    - [Swim-lane interactions](#swim-lane-interactions)
    - [Vertical snap](#vertical-snap)
    - [Canvas controls](#canvas-controls)
    - [Remove modal](#remove-modal)
    - [Auto-layout behaviour](#auto-layout-behaviour)
    - [Legend overlay](#legend-overlay)
  - [6. Side Panel](#6-side-panel)
    - [Node panel](#node-panel)
    - [Flow panel](#flow-panel)
    - [Swim-lane panel](#swim-lane-panel)
  - [7. Settings Tab](#7-settings-tab)
# DDScope — User Interface

*v1.10 — Draft — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) for entity definitions. [DDScope_Overview.md](DDScope_Overview.md) for project copy modes.*

---

## Version History

| Version | Date     | Summary                                                                                                                                                     |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.4     | May 2026 | Initial split from monolithic spec; swim-lane interaction model finalised; Settings tab, auto-layout, fit-to-canvas, tab navigation logic documented        |
| 0.5     | May 2026 | Multi-map support: map tab bar, Elements panel, map-scoped canvas state; workflow updated                                                                   |
| 0.6     | May 2026 | With-products map mode removed; SKU section added to node side panel; stock points reference removed                                                        |
| 0.7     | May 2026 | BOM concept added: section in node side panel and dedicated BOMs tab                                                                                        |
| 0.8     | May 2026 | Flow visibility rules enforced in Elements panel; node removal cascade documented                                                                           |
| 0.9     | May 2026 | DataStore references removed; link to ProjectManagement replaced by Overview                                                                                |
| 1.0     | May 2026 | Direction toggle on map toolbar; project name centred in nav with edit button; node type default swim-lane; dirty flag on Save button; Settings tab updated |
| 1.1     | May 2026 | Flow table view added: inline edit and delete, all project flows, tab placed between Nodes and Products                                                     |
| 1.2     | May 2026 | Auto-layout upgraded (BFS ranking per swim-lane); waypoint handle on taxi edges; vertical snap on node drag |
| 1.3     | May 2026 | Tag colors + legend: Settings section, node coloring, legend overlay with toggle |
| 1.4     | May 2026 | Remove button replaces "Remove from map": unified modal with "Remove only from map" checkbox |
| 1.5     | May 2026 | Note overlay on nodes: Show note on map checkbox in node panel, ghost node drag on canvas |
| 1.6     | May 2026 | Add product on map: toolbar button + modal (product search/create + swim-lane); is_product_node_default column in Settings node types |
| 1.7     | May 2026 | Flow rerouting: draggable endpoint handles (blue = source, purple = target) replace Shift/Ctrl+click; flow panel: endpoint summary at top |
| 1.8     | May 2026 | Flow panel: Skip in layout checkbox; persisted in map_flows.skip_in_layout |
| 1.9     | May 2026 | Demand feature: SKU demand sub-section in node panel, Demand tab, CTT line overlay interactions |
| 1.10    | May 2026 | Label position override per map: select in node panel, stored in `map_nodes.label_position` |

---

## 1. Workflow

DDScope is used primarily during or immediately after discovery workshops. The consultant operates the tool on their own device, entering information in real time or consolidating notes after a session.

Typical workflow: create a project → define swim-lanes → add nodes → define products → connect them with flows → review SKUs → define BOMs → apply tags → configure tag colors → switch between maps and views for presentation or export.

---

## 2. Views

DDScope maintains a single underlying data model and derives multiple views from it. All views reflect the same data in real time. Products are never rendered on the map canvas — they appear only in the detail panels of flows and nodes.

### 2.1 Map

Displays nodes and flows only. Swim-lanes are rendered as HTML overlay columns. Lead times are shown on flow edges. Node background colors reflect tag-based coloring when `tag_colors` entries are defined. Node notes may be displayed as italic text overlays when enabled per node per map. CTT lines are displayed as red horizontal bars below nodes when enabled per map via `map_demands`. This is the only map rendering mode.

### 2.2 Table — Nodes

Flat list of all nodes with their fields. Automatically loaded when switching to the Nodes tab if a project is open.

### 2.3 Table — Flows

Flat list of all flows in the project. Automatically loaded when switching to the Flows tab if a project is open.

Each row displays: source node name, target node name, products carried (comma-separated names), lead time (value + unit), tags, notes.

Supported actions directly from the table:

- **Edit** — inline editing of lead time, tags, and notes. Products are edited via an add/remove selector in the row. Source and target nodes are editable via a node selector.
- **Delete** — removes the flow from the project. Triggers the standard cascade: SKU cleanup for all products on the flow.

No side panel is opened on row click. All editing is inline.

### 2.4 Table — Products

Flat list of all products with their fields and associated flows (from → to). Automatically loaded when switching to the Products tab if a project is open.

### 2.5 Table — BOMs

Flat list of all BOMs in the project. Each row shows: node, output product, and the list of components with their quantities. Supports adding, editing, and deleting BOMs directly from the table. Intended as the primary view for reviewing and preparing the DDOptim export.

### 2.6 Table — Demand

Flat list of all SKUs that have a demand record in the project. Automatically loaded when switching to the Demand tab if a project is open.

Each row displays: node name, product name, CTT (value + unit), demand (value + period), notes.

Supported actions directly from the table:

- **Edit** — inline editing of all fields.
- **Delete** — removes the demand record. Cascades to `map_demands` and resets `demand_x`, `demand_y`, `demand_length` on all `map_nodes` for that node.

---

## 3. Navigation Bar

The nav bar is always visible and contains three zones: tabs on the left, project name centred, and actions on the right.

The tab order is: **Map — Nodes — Flows — Products — BOMs — Demand — Settings**

### Project name

When a project is open, the project name is displayed in bold at the centre of the nav bar. An unsaved indicator (`•`) is appended when the project has unsaved changes.

A pencil button (✎) appears on hover to the right of the project name. Clicking it opens a modal to edit the project name and description. Saving the modal marks the project as dirty.

### Save button

The **Save** button is active only when the project has unsaved changes (`dirty = true`). It is disabled and visually greyed out after a Load, Save, or project open. It becomes active again on any modification to the model.

---

## 4. Map Tabs

Each project contains one or more maps, displayed as a tab bar above the canvas.

### Tab bar

| Control                               | Behaviour                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Map tab (click)                       | Switches the active map. Loads `map_nodes`, `map_flows`, `map_swim_lanes`, and `map_demands` for the selected map and re-renders the canvas. |
| Map name (double-click)               | Makes the name editable inline. Confirmed on Enter or blur.                                                                   |
| **+ New map** button                  | Creates a new empty map (default name: "Map N", direction: `right-left`, `legend_visible: true`).                            |
| **Duplicate map** button (active tab) | Creates a copy of the active map with all its `map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands`, `direction`, and `legend_visible`. |
| **Delete map** button (active tab)    | Deletes the active map and all its map-scoped data. Disabled when only one map remains.                                       |

### Elements panel

An **Elements** button in the map toolbar opens a side panel listing all project elements (nodes, flows, swim-lanes) not yet present on the active map. Each element can be added individually via an "Add to map" button.

A flow can only be added to a map if both its source and target nodes are already present on that map. Flows whose endpoint nodes are not both on the map are greyed out in the Elements panel.

To remove or delete an element from the active map, select it on the canvas and use the **Remove** button in the toolbar.

> Removing a node from a map automatically removes all flows where that node is source or target.

---

## 5. Map Interaction

The map is rendered with Cytoscape.js. Swim-lanes are HTML divs overlaid on the Cytoscape canvas and kept in sync via pan/zoom events. All canvas state (node positions, swim-lane geometry, flow visibility, CTT line geometry) is scoped to the active map.

### Node interactions

- **Node creation** — via the Add node button; initial canvas position is computed automatically (swim-lane grid, below swim-lanes, or viewport centre).
- **Node drag** — free positioning; position saved to `map_nodes` on `dragfree`. Vertical snap is applied on release. Any visible note ghost and CTT line follow the node automatically, preserving their relative offsets.
- **Selection** — click a node to open the side panel; click canvas background to close.

### Add product on map

The **+ Product** button in the map toolbar opens a modal that creates a node-product pair in a single action — the common pattern where a node represents a product stock point on the map.

**Modal fields:**

| Field | Behaviour |
|---|---|
| Product | Search input with live dropdown. Existing products are listed as matches. If the typed name does not exactly match any existing product, a `+ Create "…"` option appears at the bottom of the dropdown. The Add button is enabled only after a selection is made from the dropdown. |
| Product type | Appears only when creating a new product (hidden for existing products). Pre-selected on the `is_default` product type. |
| Swim-lane | Optional. Pre-selected on the `default_swim_lane_id` of the node type marked `is_product_node_default` (falls back to `is_default` type, then first type). |

**On confirm:**
1. Creates the product if new (name + selected type; tags and notes left empty).
2. Resolves the node type: `is_product_node_default` → `is_default` → first type.
3. Creates the node (name = product name, resolved type, selected swim-lane).
4. Places the node on the active map via the standard placement algorithm (`DDS_LAYOUT.placeNode`).
5. Creates the SKU (node × product, no tags).
6. Applies node color immediately (`DDS_MAP.applyNodeColors`).

### Note ghost interactions

- A note ghost (`note-{node_id}`) is a Cytoscape node rendered as italic text with no visible shape.
- Note ghosts are **draggable independently**: drag repositions the ghost and persists the new `note_dx`/`note_dy` offsets to `map_nodes`.
- Note ghosts are **not selectable** — clicking a ghost does not open the side panel.
- Note ghosts are excluded from fit-to-canvas and auto-layout.

### CTT line interactions

- The CTT line is an HTML overlay (`.dds-ctt-line-wrap`) rendered below the node, synchronised with Cytoscape pan/zoom.
- **Drag line** — repositions the overlay; persists `demand_x`, `demand_y` to `map_nodes`.
- **Drag handle (left or right)** — resizes the line symmetrically; persists `demand_length` to `map_nodes`.
- **Node drag** — the CTT overlay follows the node, preserving its relative offset.
- The CTT line is excluded from fit-to-canvas and auto-layout.

### Flow interactions

- **Flow creation** — drag from the green handle that appears on node hover to a target node.
- **Flow rerouting** — selecting a flow shows two draggable handles: a **blue circle** on the source endpoint, a **purple circle** on the target endpoint. Both handles are positioned at the exact point where the edge meets the node (using Cytoscape's `sourceEndpoint()` / `targetEndpoint()`), including when the edge connects at the top or bottom of a node. Dragging a handle to another valid node reroutes that endpoint and refreshes the side panel. Releasing in empty space cancels with no change. A ghost line connects the fixed opposite endpoint to the cursor during drag. Valid target nodes are highlighted during drag; the opposite endpoint node is excluded.
- **Selection** — click an edge to open the side panel.
- **Waypoint handle** — selecting a flow reveals a circular handle on the taxi bend. Drag to reposition; double-click to reset to midpoint (50%).

### Swim-lane interactions

| Gesture                           | Behaviour                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag lane header                  | Reposition lane; child nodes translate with it. No snap.                                                                                                                |
| SHIFT + drag lane header          | Snap and grouping behaviour activated. Snaps to another lane within 40 canvas units; the two lanes align, share the same height, and a shared bounding box is rendered. |
| SHIFT + drag on grouped lane      | Detaches lane from the group.                                                                                                                                           |
| Drag resize handle (bottom-right) | Resize lane. All lanes in the same group adopt the same height.                                                                                                         |
| Click lane header                 | Opens swim-lane side panel.                                                                                                                                             |

### Vertical and horizontal snap on node drag

When dragging a node manually, two guide lines appear when the node is within 6px canvas units of a snap target:

- A horizontal guide (`.dds-snap-guide`) for Y snap.
- A vertical guide (`.dds-snap-guide-v`) for X snap.

Both snaps are applied on release, not during drag, to avoid cursor detachment. The final position combines the snapped X and Y independently.

Snap targets follow the same two rules on both axes:

1. **Direct neighbour** — snap to the coordinate of any node directly connected by a flow on the active map.
2. **Median of aligned neighbours** — if two neighbours on the same side share the same perpendicular coordinate (within 20px tolerance) and no other map node lies between them on that axis, snap to their median coordinate.

Y snap uses neighbours aligned on the same X column; X snap uses neighbours aligned on the same Y row.

### Canvas controls

| Control              | Behaviour                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fit (⛶)**          | Computes bounding box of nodes and swim-lanes for the active map, applies pan and zoom. Ghost note nodes and CTT lines are excluded from this calculation. Also triggered on project open and map tab switch. |
| **Layout**           | BFS-based auto-layout per swim-lane. Nodes without a swim-lane are not repositioned. Ghost note nodes are excluded. Flows with `layout_offset = 0` are excluded from rank computation. Flows with `layout_offset = N > 1` impose a minimum column distance of `N` between source and target. Bidirectional flows with `layout_direction_inverted = true` have their source and target swapped in the BFS graph. Positions saved to `map_nodes`. |
| **Direction toggle** | Toggles `direction` between `right-left` (← ←, default) and `left-right` (→ →). Saved to `maps[].direction`.                             |
| **Legend**           | Toggles the legend overlay. State persisted in `maps[].legend_visible`.                                                                   |
| **Remove**           | Active when a node, flow, or swim-lane is selected. Opens the Remove modal (see §5 — Remove modal). |

### Remove modal

Clicking **Remove** with an element selected opens a confirmation modal titled *Remove Node*, *Remove Flow*, or *Remove Swim-lane* depending on the selection.

The modal displays a summary of the consequences of a full delete (number of flows, SKUs, BOMs, demands that will be removed by cascade).

A **Remove only from map** checkbox is present, unchecked by default.

| Checkbox state | Behaviour |
| -------------- | --------- |
| **Unchecked** (default) | The element is deleted from the functional model with full cascade: all dependent flows, SKUs, BOMs, demands, and map references across all maps are removed. |
| **Checked** | The element is removed from the active map only. The functional model is unchanged. The element remains available in the Elements panel for re-adding. |

Two buttons: **Remove** (destructive) and **Cancel**.

> For swim-lanes, an unchecked delete also deletes all nodes assigned to that swim-lane and their full cascade (flows, SKUs, BOMs, demands).

### Auto-layout behaviour

The **Layout** button triggers `DDS_MAP.runLayout()`. For each swim-lane on the active map, a BFS rank is computed locally (flows internal to the lane only). Flows with `layout_offset = 0` are excluded from this rank computation, so the nodes they connect are free to receive any rank, including the same rank. Flows with `layout_offset = N > 0` impose a minimum distance of `N` columns between source and target. For bidirectional flows, `layout_direction_inverted = true` swaps source and target in the BFS graph. Nodes without a swim-lane on the active map are left in place — their positions are not modified. Ghost note nodes are excluded entirely.

### Legend overlay

The legend is an SVG inline overlay positioned at the bottom-left of the canvas. It displays one entry per (node type × tag color) combination present on the active map, grouped by node type and ordered by `tag_colors` insertion order within each type. Each entry shows the node shape (filled with the tag color) and the tag name as label.

- Nodes without a type or without a matching tag color entry are excluded.
- The legend is recalculated automatically when: the map changes, a node's tags are modified, or `tag_colors` is updated.
- The **Legend** button in the toolbar toggles visibility; state is saved per map in `legend_visible`.
- SVG inline rendering makes the legend compatible with html2canvas capture for future PDF export.

---

## 6. Side Panel

A slide-in panel on the right edge provides inline editing for the selected element. Changes are saved immediately (auto-save on change/blur).

### Node panel

Name, type, swim-lane, tags, notes.

**Tags** — adding or removing a tag immediately updates the node's background color on the canvas (tag-based coloring) and refreshes the legend.

**Show note on map** — a checkbox below the Notes field. When checked, the content of the Notes field is displayed as an italic text overlay on the active map, positioned below the node by default. The checkbox is disabled when the Notes field is empty. If the Notes field is cleared while the checkbox is checked, the checkbox is automatically unchecked and the ghost removed.

**Label position** — a select field below "Show note on map". Overrides the label position defined on the node type for this map only. Options: *As in type* (default, no override), *Center*, *Above*, *Below*. Stored in `map_nodes.label_position`. The same node can have different label positions on different maps.

**SKUs section** — lists all SKUs associated with this node, derived automatically from the flows entering and leaving it. For each SKU: product name (read-only), tags (editable), notes (editable).

Each SKU row displays a small badge when a demand record exists for that SKU. Clicking the SKU row expands a sub-section below it showing:

- CTT — value + unit selector (`hours`, `days`, `weeks`, `months`, `years`)
- Demand — value + period selector (`hours`, `days`, `weeks`, `months`, `years`)
- Notes
- A **Show on map** button — creates a `map_demands` record for the active map if absent (opt-in). Label changes to **Hide from map** when a `map_demands` record exists for the active map.
- A **Delete demand** button — removes the demand record with full cascade.

When no demand exists for a SKU, a **+ Demand** button appears in the SKU row. Clicking it creates an empty demand record for that SKU and expands the sub-section immediately.

SKUs cannot be added or removed manually from this section.

**BOMs section** — lists all BOMs defined for this node. For each BOM: output product, component list with quantities. Actions: add a BOM, add/remove a component, edit quantities, delete a BOM.

### Flow panel

**Endpoints** — a summary line at the top of the panel displays source and target nodes in the format `Name(tag1, tag2) ← Name(tag1)`. Tags are omitted when the node has none. The arrow direction matches the active map direction (`←` for `right-left`, `→` for `left-right`). Refreshed on every panel open, including after rerouting.

Lead time (value + unit), tags, notes, and the list of products on the flow. Each product has a × button to remove it. A selector allows adding a product from the project's product list.

**Layout controls** — visible only when both endpoint nodes are in the same swim-lane present on the active map:

| Field | Description |
|---|---|
| Layout offset | Integer `>= 0`. `0` excludes the flow from BFS. `N` enforces a minimum column distance of `N` (default `1`). |
| Inverser sens layout | Checkbox visible only for bidirectional flows. When checked, source and target are swapped in the BFS rank graph. |

> Adding a product to a flow automatically creates the corresponding SKU on the source and target nodes if it does not already exist. Removing the last occurrence of a product on all flows connected to a node automatically deletes the SKU.

### Swim-lane panel

Name, colour swatch selector (8 colours).

---

## 7. Settings Tab

Provides tables for managing swim-lanes, node types, product types, and tag colors for the current project.

**Swim-lanes** — name and colour swatch. Each swim-lane can be added, edited, or deleted. Deleting a swim-lane clears `default_swim_lane_id` on any node type that referenced it.

**Node types** — code, label, shape, color, default swim-lane, default flag, and product flag. The table displays a **Product** column showing a badge when `is_product_node_default` is set. Only one node type can be default at a time; only one can have `is_product_node_default` at a time — setting a new value clears the previous one. The default swim-lane is pre-selected in the Add node modal and in the Add product on map modal.

**Product types** — code, label, shape, colour, and default flag. Only one product type can be default at a time.

**Tag colors** — tag label and colour. Each entry associates a free-text tag with a display colour from the 8-colour palette. Entries are ordered by insertion order, which determines priority when a node matches multiple tagged entries. Actions: add (via the shared settings modal), delete. No inline edit — delete and recreate to change.

Adding a tag color: the shared settings modal opens in `tagcolor` mode, showing only the tag field (with native autocomplete from all tags used in the project) and the colour swatch. No code or shape fields.

Modifying or deleting tag colors immediately refreshes node colors on the canvas and updates the legend.

**Developer** — advanced toggles persisted in the DataStore.

| Toggle | Behaviour |
|---|---|
| Show BFS ranks | Displays amber badges above swim-lane nodes showing their min-max BFS rank. Requires running Layout after enabling. Persisted in DataStore. |

All changes are persisted on Save. If no project is open, a placeholder is shown.

---

*b2wise — Confidential*
