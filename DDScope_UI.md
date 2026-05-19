# DDScope — User Interface

*v1.7 — Draft — May 2026*

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

---

## 1. Workflow

DDScope is used primarily during or immediately after discovery workshops. The consultant operates the tool on their own device, entering information in real time or consolidating notes after a session.

Typical workflow: create a project → define swim-lanes → add nodes → define products → connect them with flows → review SKUs → define BOMs → apply tags → configure tag colors → switch between maps and views for presentation or export.

---

## 2. Views

DDScope maintains a single underlying data model and derives multiple views from it. All views reflect the same data in real time. Products are never rendered on the map canvas — they appear only in the detail panels of flows and nodes.

### 2.1 Map

Displays nodes and flows only. Swim-lanes are rendered as HTML overlay columns. Lead times are shown on flow edges. Node background colors reflect tag-based coloring when `tag_colors` entries are defined. Node notes may be displayed as italic text overlays when enabled per node per map. This is the only map rendering mode.

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

---

## 3. Navigation Bar

The nav bar is always visible and contains three zones: tabs on the left, project name centred, and actions on the right.

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
| Map tab (click)                       | Switches the active map. Loads `map_nodes`, `map_flows`, and `map_swim_lanes` for the selected map and re-renders the canvas. |
| Map name (double-click)               | Makes the name editable inline. Confirmed on Enter or blur.                                                                   |
| **+ New map** button                  | Creates a new empty map (default name: "Map N", direction: `right-left`, `legend_visible: true`).                            |
| **Duplicate map** button (active tab) | Creates a copy of the active map with all its `map_nodes`, `map_flows`, `map_swim_lanes`, `direction`, and `legend_visible`. |
| **Delete map** button (active tab)    | Deletes the active map and all its map-scoped data. Disabled when only one map remains.                                       |

### Elements panel

An **Elements** button in the map toolbar opens a side panel listing all project elements (nodes, flows, swim-lanes) not yet present on the active map. Each element can be added individually via an "Add to map" button.

A flow can only be added to a map if both its source and target nodes are already present on that map. Flows whose endpoint nodes are not both on the map are greyed out in the Elements panel.

To remove or delete an element from the active map, select it on the canvas and use the **Remove** button in the toolbar.

> Removing a node from a map automatically removes all flows where that node is source or target.

---

## 5. Map Interaction

The map is rendered with Cytoscape.js. Swim-lanes are HTML divs overlaid on the Cytoscape canvas and kept in sync via pan/zoom events. All canvas state (node positions, swim-lane geometry, flow visibility) is scoped to the active map.

### Node interactions

- **Node creation** — via the Add node button; initial canvas position is computed automatically (swim-lane grid, below swim-lanes, or viewport centre).
- **Node drag** — free positioning; position saved to `map_nodes` on `dragfree`. Vertical snap is applied on release. Any visible note ghost follows the node automatically, preserving its relative offset.
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

### Vertical snap

When dragging a node manually, a dashed green guide line appears when the node's Y approaches a snap target (threshold: 6px canvas units). Snap is applied on release. Two snap rules apply:

1. **Direct neighbour** — snap to the Y of any node directly connected by a flow on the active map.
2. **Median of aligned neighbours** — if two neighbours on the same side share the same X column (within 20px tolerance) and no other map node lies between them on that column, snap to their Y median.

### Canvas controls

| Control              | Behaviour                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fit (⛶)**          | Computes bounding box of nodes and swim-lanes for the active map, applies pan and zoom. Ghost note nodes are excluded from this calculation. Also triggered on project open and map tab switch. |
| **Layout**           | BFS-based auto-layout per swim-lane. Nodes without a swim-lane are not repositioned. Ghost note nodes are excluded. Positions saved to `map_nodes`. |
| **Direction toggle** | Toggles `direction` between `right-left` (← ←, default) and `left-right` (→ →). Saved to `maps[].direction`.                             |
| **Legend**           | Toggles the legend overlay. State persisted in `maps[].legend_visible`.                                                                   |
| **Remove**           | Active when a node, flow, or swim-lane is selected. Opens the Remove modal (see §5 — Remove modal). |

### Remove modal

Clicking **Remove** with an element selected opens a confirmation modal titled *Remove Node*, *Remove Flow*, or *Remove Swim-lane* depending on the selection.

The modal displays a summary of the consequences of a full delete (number of flows, SKUs, BOMs that will be removed by cascade).

A **Remove only from map** checkbox is present, unchecked by default.

| Checkbox state | Behaviour |
| -------------- | --------- |
| **Unchecked** (default) | The element is deleted from the functional model with full cascade: all dependent flows, SKUs, BOMs, and map references across all maps are removed. |
| **Checked** | The element is removed from the active map only. The functional model is unchanged. The element remains available in the Elements panel for re-adding. |

Two buttons: **Remove** (destructive) and **Cancel**.

> For swim-lanes, an unchecked delete also deletes all nodes assigned to that swim-lane and their full cascade (flows, SKUs, BOMs).

### Auto-layout behaviour

The **Layout** button triggers `DDS_MAP.runLayout()`. For each swim-lane on the active map, a BFS rank is computed locally (flows internal to the lane only). Nodes without a swim-lane on the active map are left in place — their positions are not modified. Ghost note nodes are excluded entirely.

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

**SKUs section** — lists all SKUs associated with this node, derived automatically from the flows entering and leaving it. For each SKU: product name (read-only), tags (editable), notes (editable). SKUs cannot be added or removed manually.

**BOMs section** — lists all BOMs defined for this node. For each BOM: output product, component list with quantities. Actions: add a BOM, add/remove a component, edit quantities, delete a BOM.

### Flow panel

**Endpoints** — a summary line at the top of the panel displays source and target nodes in the format `Name(tag1, tag2) ← Name(tag1)`. Tags are omitted when the node has none. The arrow direction matches the active map direction (`←` for `right-left`, `→` for `left-right`). Refreshed on every panel open, including after rerouting.

Lead time (value + unit), tags, notes, and the list of products on the flow. Each product has a × button to remove it. A selector allows adding a product from the project's product list.

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

All changes are persisted on Save. If no project is open, a placeholder is shown.

---

*b2wise — Confidential*
