# DDScope — User Interface

*v1.2 — Draft — May 2026*

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

---

## 1. Workflow

DDScope is used primarily during or immediately after discovery workshops. The consultant operates the tool on their own device, entering information in real time or consolidating notes after a session.

Typical workflow: create a project → define swim-lanes → add nodes → define products → connect them with flows → review SKUs → define BOMs → apply tags → switch between maps and views for presentation or export.

---

## 2. Views

DDScope maintains a single underlying data model and derives multiple views from it. All views reflect the same data in real time. Products are never rendered on the map canvas — they appear only in the detail panels of flows and nodes.

### 2.1 Map

Displays nodes and flows only. Swim-lanes are rendered as HTML overlay columns. Lead times are shown on flow edges. This is the only map rendering mode.

### 2.2 Table — Nodes

Flat list of all nodes with their fields. Automatically loaded when switching to the Nodes tab if a project is open.

### 2.3 Table — Flows

Flat list of all flows in the project. Automatically loaded when switching to the Flows tab if a project is open.

Each row displays: source node name, target node name, products carried (comma-separated names), lead time (value + unit), tags, notes.

Supported actions directly from the table:

- **Edit** — inline editing of lead time, tags, and notes. Products are edited via an add/remove selector in the row. Source and target nodes are editable via a node selector.
- **Delete** — removes the flow from the project. Triggers the standard cascade: SKU cleanup for all products on the flow (per §4 of DDScope_DataModel.md).

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

The **Save** button is active only when the project has unsaved changes (`dirty = true`). It is disabled and visually greyed out after a Load, Save, or project open. It becomes active again on any modification to the model (insert, update, remove, or project metadata edit).

---

## 4. Map Tabs

Each project contains one or more maps, displayed as a tab bar above the canvas.

### Tab bar

| Control                               | Behaviour                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Map tab (click)                       | Switches the active map. Loads `map_nodes`, `map_flows`, and `map_swim_lanes` for the selected map and re-renders the canvas. |
| Map name (double-click)               | Makes the name editable inline. Confirmed on Enter or blur.                                                                   |
| **+ New map** button                  | Creates a new empty map (default name: "Map N", direction: `right-left`).                                                     |
| **Duplicate map** button (active tab) | Creates a copy of the active map with all its `map_nodes`, `map_flows`, `map_swim_lanes`, and `direction`.                    |
| **Delete map** button (active tab)    | Deletes the active map and all its map-scoped data. Disabled when only one map remains.                                       |

### Elements panel

An **Elements** button in the map toolbar opens a side panel listing all project elements (nodes, flows, swim-lanes) not yet present on the active map. Each element can be added individually via an "Add to map" button.

A flow can only be added to a map if both its source and target nodes are already present on that map. Flows whose endpoint nodes are not both on the map are greyed out in the Elements panel.

To remove an element from the active map, select it on the canvas and use the "Remove from this map" contextual action. This removes the corresponding `map_node`, `map_flow`, or `map_swim_lane` entry without affecting the functional model.

> Removing a node from a map automatically removes all flows where that node is source or target.

---

## 5. Map Interaction

The map is rendered with Cytoscape.js. Swim-lanes are HTML divs overlaid on the Cytoscape canvas and kept in sync via pan/zoom events. All canvas state (node positions, swim-lane geometry, flow visibility) is scoped to the active map.

### Node interactions

- **Node creation** — via the Add node button; node is placed on the canvas (adding a `map_node` entry for the active map) and optionally assigned to a swim-lane. The initial canvas position is computed automatically:
  - **Swim-lane assigned and visible on the active map** — the node is placed at the first free position inside the swim-lane rectangle. Positions are scanned row by row starting from the bottom of the swim-lane, left to right. A position is considered free if no existing node on the map falls within a minimum distance threshold. Grid step and distance threshold are defined as named constants in the layout module.
  - **No swim-lane, or swim-lane not present on the active map** — the node is placed below the bounding box of all swim-lanes currently visible on the map, horizontally centred on that bounding box. If the position is occupied, the node is shifted left by a fixed step, repeated until a free position is found. If no swim-lanes are visible, the node is placed at the centre of the current viewport.
- **Node drag** — free positioning; position saved to `map_nodes` on `dragfree`. Vertical snap is applied on release (see §5 Vertical snap below).
- **Selection** — click a node to open the side panel; click canvas background to close.

### Flow interactions

- **Flow creation** — drag from the green handle that appears on node hover to a target node.
- **Flow rerouting** — selecting a flow shows source (blue) and target (purple) endpoint handles on the respective nodes; dragging a handle and dropping it on another node updates the flow endpoint.
- **Selection** — click an edge to open the side panel.
- **Waypoint handle** — selecting a flow reveals a circular handle (`.dds-waypoint-handle`) positioned on the taxi bend. Drag the handle horizontally to reposition the bend; the change is applied in real time and persisted to `map_flows.waypoint_pct` on release. Double-click the handle to reset the bend to the midpoint (50%).

### Swim-lane interactions

| Gesture                           | Behaviour                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag lane header                  | Reposition lane; child nodes translate with it. No snap.                                                                                                                |
| SHIFT + drag lane header          | Snap and grouping behaviour activated. Snaps to another lane within 40 canvas units; the two lanes align, share the same height, and a shared bounding box is rendered. |
| SHIFT + drag on grouped lane      | Detaches lane from the group.                                                                                                                                           |
| Drag resize handle (bottom-right) | Resize lane. All lanes in the same group adopt the same height.                                                                                                         |
| Click lane header                 | Opens swim-lane side panel (distinguished from drag by movement threshold).                                                                                             |

### Vertical snap

When dragging a node manually, a dashed green guide line appears when the node's Y approaches a snap target (threshold: 6px canvas units). Snap is applied on release to avoid cursor detachment. Two snap rules apply:

1. **Direct neighbour** — snap to the Y of any node directly connected by a flow (amont or aval) on the active map.
2. **Median of aligned neighbours** — if two neighbours on the same side (both amont or both aval) share the same X column (within 20px tolerance) and no other map node lies between them on that column, snap to their Y median.

### Canvas controls

| Control              | Behaviour                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fit (⛶)**          | Computes bounding box of nodes and swim-lanes for the active map, applies pan and zoom. Also triggered on project open and map tab switch. |
| **Layout**           | BFS-based auto-layout per swim-lane (see below), free nodes via Dagre below swim-lanes. Positions saved to `map_nodes`.                   |
| **Direction toggle** | Toggles `direction` between `right-left` (← ←, default) and `left-right` (→ →). Saved to `maps[].direction`. Refreshed on map tab switch.  |

### Auto-layout behaviour

The **Layout** button triggers `DDS_MAP.runLayout()`. For each swim-lane on the active map:

1. A BFS rank is computed locally (flows internal to the lane only). Nodes with no internal predecessor are sources (rank 0). `rankMin` = longest-path from sources; `rankMax` = min(rankMin of successors) − 1, or last column if no successors.
2. Each node is assigned to the column in `[rankMin, rankMax]` whose X is closest to its current canvas X. Repositioning a node before running Layout controls its column.
3. Columns are evenly spaced (max 150px), centred in the swim-lane width.
4. Within each column: nodes with 1–2 members preserve their pre-layout Y (clamped to lane bounds). Nodes in columns with 3+ members are spread evenly between the column's own YMin/YMax (pre-layout). Sort order within the column follows pre-layout Y (ascending) — drag a node up or down before Layout to control its position in the column.

Free nodes (no swim-lane on the active map) are laid out with Dagre below the swim-lane bounding box.

---

## 6. Side Panel

A slide-in panel on the right edge provides inline editing for the selected element. Changes are saved on Save.

### Node panel

Name, type, swim-lane, tags, notes.

**SKUs section** — lists all SKUs associated with this node, derived automatically from the flows entering and leaving it. For each SKU:

- Product name (read-only — existence is derived from flows)
- Tags (editable)
- Notes (editable)

SKUs cannot be added or removed manually. They appear when a product is added to a flow connected to this node, and disappear when the product no longer appears on any connected flow.

**BOMs section** — lists all BOMs defined for this node. For each BOM:

- Output product (selectable from the project's product list)
- Component list: each component has a product (selectable) and a quantity (numeric, editable)
- Actions: add a BOM, add/remove a component, edit quantities, delete a BOM

A node can have multiple BOMs (one per output product). A given output product can only have one BOM per node.

### Flow panel

Lead time (value + unit), tags, notes, and the list of products on the flow. Each product has a × button to remove it. A selector allows adding a product from the project's product list.

> Adding a product to a flow automatically creates the corresponding SKU on the source and target nodes if it does not already exist. Removing the last occurrence of a product on all flows connected to a node automatically deletes the SKU.

### Swim-lane panel

Name, colour swatch selector (8 colours).

---

## 7. Settings Tab

Provides tables for managing swim-lanes, node types, and product types for the current project.

**Swim-lanes** — name and colour swatch. Each swim-lane can be added, edited, or deleted. Deleting a swim-lane clears `default_swim_lane_id` on any node type that referenced it.

**Node types** — code, label, shape, default swim-lane, and default flag. The default swim-lane is pre-selected in the Add node modal when a node of this type is created. Changing the type in the modal updates the swim-lane pre-selection accordingly.

**Product types** — code, label, shape, colour, and default flag.

All changes are persisted on Save. If no project is open, a placeholder is shown.

---

*b2wise — Confidential*
