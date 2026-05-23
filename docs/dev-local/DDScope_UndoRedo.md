# DDScope — Transaction Pattern & Implementation Tracker

*v0.2 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial draft — pattern + call site inventory |
| 0.2 | May 2026 | Clarified map_* scope; added all presentation-layer call sites, drag interactions, AI layer |
| 0.3 | May 2026 | DDS_TX_HELPER (SCRIPT 1870) added — wraps begin/commit/rollback; pattern updated at all call sites |

---

## 1. Pattern


### 1.1 Transaction lifecycle

Every user interaction that mutates the store must be wrapped in a transaction.
Use `DDS_TX_HELPER.run(label, fn)` — it handles the begin/commit/rollback cycle internally.

┌─────────────────────────────────────────────────────────────┐
│  UI module (submit handler)                                 │
│                                                             │
│  DDS_TX_HELPER.run(TX.NODE_CREATE, () => {                  │
│    DDS_NODES.create(fields);   // one or more helper calls  │
│    DDS_FLOWS.update(...);      // each translates to actions │
│  });                                                        │
└─────────────────────────────────────────────────────────────┘

`DDS_TX_HELPER` is defined in SCRIPT 1870. It is a temporary utility placed
between DDS_TRANSACTIONS (SCRIPT 1860) and the UI modules, pending the
presentation layer refactor.

**Rules:**

1. Pass all mutations for the interaction inside the `fn` callback.
2. `fn` must be synchronous — no async/await inside.

### 1.2 Scope: functional and presentation tables

`DDS_TRANSACTION` captures the full `DDS_STORE` snapshot via `toJson()`, which includes **all tables** — both functional (`nodes`, `flows`, etc.) and presentation (`map_nodes`, `map_flows`, `map_annotations`, `map_swim_lanes`, `map_demands`). Undo/redo therefore restores canvas positions, visibility, and layout state alongside functional data.

This means **all store mutations are in scope**, including:
- Node/flow/product/SKU/BOM/demand/annotation CRUD (via helper modules).
- Node canvas position updates (`map_nodes.x/y` on drag).
- Flow waypoint updates (`map_flows.waypoint_pct` on drag).
- Swim-lane geometry changes (`map_swim_lanes.x/y/width/height`).
- Annotation canvas position updates (`map_annotations.x/y` on drag).
- Note ghost offsets (`map_nodes.note_dx/note_dy`, `map_flows.notes_annotation_dx/dy`).
- CTT line position and size (`map_nodes.demand_x/y/length`).
- Add/remove element from map (`map_nodes`, `map_flows`, `map_annotations` insert/delete).

**After undo/redo on the map view:** call `DDS_MAP.loadMap()` then `DDS_SWIMLANES.render()`. Do **not** call `runLayout()` — positions are restored from the snapshot and must not be recalculated.

### 1.3 Case: interaction cancelled by the user

`begin()` is called only at submit time, not at modal open.

```js
// WRONG — begin at modal open
function openModal() {
  currentTxId = DDS_TRANSACTION.begin(TX.NODE_CREATE);  // ❌
}

// CORRECT — begin at submit only
function handleConfirm() {
  const txId = DDS_TRANSACTION.begin(TX.NODE_CREATE);
  try {
    DDS_NODES.create(fields);
    DDS_TRANSACTION.commit(txId);
  } catch (err) {
    DDS_TRANSACTION.rollback(txId);
  }
}
```

### 1.4 Case: drag interactions

Drag interactions persist position updates to the store on the terminal event (`dragfree`, mouseup, or equivalent). The transaction wraps only the store write — not the drag motion itself.

```js
cy.on('dragfree', 'node', (evt) => {
  const node = evt.target;
  const { x, y } = node.position();
  const mapNodeId = node.data('mapNodeId');

  const txId = DDS_TRANSACTION.begin(TX.MAP_MOVE_NODE);
  try {
    DDS_STORE.update('map_nodes', mapNodeId, { x, y });
    DDS_TRANSACTION.commit(txId);
  } catch (err) {
    DDS_TRANSACTION.rollback(txId);
  }
});
```

### 1.5 Case: partial failure in a multi-step interaction

If a helper call throws mid-sequence, `rollback()` restores the full snapshot taken at `begin()` — including changes made by earlier helpers that had already succeeded. No manual partial rollback is needed.

```js
const txId = DDS_TRANSACTION.begin(TX.FLOW_REROUTE);
try {
  DDS_FLOWS.reroute(flowId, newSourceId, newTargetId);
  DDS_FLOWS.update(flowId, { lead_time_value: newLt });  // if this throws → full rollback
  DDS_TRANSACTION.commit(txId);
} catch (err) {
  DDS_TRANSACTION.rollback(txId);  // restores state before reroute too
}
```

### 1.6 AI layer

`DDS_AI_UI` owns the transaction wrapping AI-generated action plans. After the user confirms the plan, `DDS_AI_UI` opens a transaction, calls `DDS_ACTIONS.execute()` with the full action list, then commits or rolls back. `DDS_AI` itself is not transaction-aware.

```js
// In DDS_AI_UI — confirm handler
function handleAiConfirm(actions) {
  const txId = DDS_TRANSACTION.begin(TX.AI_APPLY_ACTIONS);
  try {
    const result = DDS_ACTIONS.execute(actions);
    if (result.failed) throw new Error(`Action failed: ${result.failed.type}`);
    DDS_TRANSACTION.commit(txId);
  } catch (err) {
    DDS_TRANSACTION.rollback(txId);
    // display error in AI panel
  }
}
```

---

## 2. Transaction labels

### 2.1 Convention

The label passed to `begin(label)` is a **catalogue key**: dot-notation string constant, no spaces, no special characters other than `.` and `_`.

**Naming convention:** `<domain>.<operation>`

### 2.2 Centralised catalogue

The `TX` catalogue lives in a **dedicated SCRIPT block** (`TX_LABELS` or equivalent) — not in `DDS_TRANSACTION`. This keeps the transaction manager focused on mechanics and allows the label catalogue to evolve independently (e.g. adding translation tables later without touching the functional module).

```js
// Dedicated TX_LABELS block
const TX = {
  // Nodes
  NODE_CREATE:              'node.create',
  NODE_UPDATE:              'node.update',
  NODE_DELETE:              'node.delete',
  NODE_ASSIGN_LANE:         'node.assign_lane',
  // Flows
  FLOW_CREATE:              'flow.create',
  FLOW_UPDATE:              'flow.update',
  FLOW_DELETE:              'flow.delete',
  FLOW_REROUTE:             'flow.reroute',
  FLOW_ADD_PRODUCT:         'flow.add_product',
  FLOW_REMOVE_PRODUCT:      'flow.remove_product',
  // Products
  PRODUCT_CREATE:           'product.create',
  PRODUCT_UPDATE:           'product.update',
  PRODUCT_DELETE:           'product.delete',
  // SKUs
  SKU_ADD:                  'sku.add',
  SKU_UPDATE:               'sku.update',
  SKU_REMOVE:               'sku.remove',
  // BOMs
  BOM_CREATE:               'bom.create',
  BOM_UPDATE_COMPONENTS:    'bom.update_components',
  BOM_DELETE:               'bom.delete',
  // Demands
  DEMAND_CREATE:            'demand.create',
  DEMAND_UPDATE:            'demand.update',
  DEMAND_DELETE:            'demand.delete',
  // Annotations
  ANNOTATION_CREATE:        'annotation.create',
  ANNOTATION_UPDATE:        'annotation.update',
  ANNOTATION_DELETE:        'annotation.delete',
  // Swim lanes
  LANE_CREATE:              'lane.create',
  LANE_UPDATE:              'lane.update',
  LANE_DELETE:              'lane.delete',
  LANE_REORDER:             'lane.reorder',
  // Maps
  MAP_CREATE:               'map.create',
  MAP_RENAME:               'map.rename',
  MAP_DELETE:               'map.delete',
  MAP_DUPLICATE:            'map.duplicate',
  // Map presentation — combined operations
  MAP_ADD_PRODUCT_NODE:     'map.add_product_node',
  // Map presentation — element visibility
  MAP_ADD_NODE:             'map.add_node',
  MAP_ADD_FLOW:             'map.add_flow',
  MAP_ADD_ANNOTATION:       'map.add_annotation',
  MAP_REMOVE_NODE:          'map.remove_node',
  MAP_REMOVE_FLOW:          'map.remove_flow',
  MAP_REMOVE_ANNOTATION:    'map.remove_annotation',
  // Map presentation — canvas geometry
  MAP_MOVE_NODE:            'map.move_node',
  MAP_MOVE_NOTE_GHOST:      'map.move_note_ghost',
  MAP_MOVE_CTT:             'map.move_ctt',
  MAP_RESIZE_CTT:           'map.resize_ctt',
  MAP_MOVE_WAYPOINT:        'map.move_waypoint',
  MAP_MOVE_FLOW_NOTE_GHOST: 'map.move_flow_note_ghost',
  MAP_MOVE_ANNOTATION:      'map.move_annotation',
  MAP_RESIZE_LANE:          'map.resize_lane',
  // Project
  PROJECT_RENAME:           'project.rename',
  // Settings
  SETTINGS_NODE_TYPE:       'settings.node_type',
  SETTINGS_PRODUCT_TYPE:    'settings.product_type',
  // AI
  AI_APPLY_ACTIONS:         'ai.apply_actions',
};
window.TX = TX;
```

### 2.3 Future localisation

When Undo/Redo buttons display a contextual label (tooltip or dynamic text), a translation table indexed by TX key is sufficient:

```js
const TX_LABELS_EN = {
  'node.create':      'Create node',
  'node.update':      'Edit node',
  'node.delete':      'Delete node',
  'flow.create':      'Create flow',
  'map.move_node':    'Move node',
  'ai.apply_actions': 'Apply AI changes',
  // ...
};
```

> **Note:** dynamic Undo/Redo button labels (e.g. "Undo: Create node") are out of scope for now. Buttons are anonymous — enabled or disabled only, with no contextual label. `lastCommittedLabel()` on `DDS_TRANSACTION` is not planned.

---

## 3. Call site inventory

Statuses: `to-do` | `done` | `n/a`

> **n/a** is reserved for read-only interactions and ephemeral UI state (panel open/close, tab switch, dropdown hover) that produce no store mutation.

### 3.1 DDS_NODE_UI — SCRIPT 1300

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm node creation (modal) | `TX.NODE_CREATE` | Create node | to-do |
| Confirm node edit (modal) | `TX.NODE_UPDATE` | Edit node | to-do |

### 3.2 DDS_FLOW_UI — SCRIPT 1400

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Drop to create flow | `TX.FLOW_CREATE` | Create flow | to-do |
| Confirm reroute (drag handle drop) | `TX.FLOW_REROUTE` | Reroute flow | to-do |

### 3.3 DDS_PANEL — SCRIPT 1500 + 1505

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Save node fields (side panel) | `TX.NODE_UPDATE` | Edit node | to-do |
| Save flow fields (side panel) | `TX.FLOW_UPDATE` | Edit flow | to-do |
| Assign node to lane (side panel) | `TX.NODE_ASSIGN_LANE` | Move node to lane | to-do |
| Add product to flow (side panel) | `TX.FLOW_ADD_PRODUCT` | Add product to flow | to-do |
| Remove product from flow (side panel) | `TX.FLOW_REMOVE_PRODUCT` | Remove product from flow | to-do |
| Add SKU (demand sub-section) | `TX.SKU_ADD` | Add SKU | to-do |
| Update SKU (demand sub-section) | `TX.SKU_UPDATE` | Edit SKU | to-do |
| Remove SKU (demand sub-section) | `TX.SKU_REMOVE` | Remove SKU | to-do |
| Save demand fields | `TX.DEMAND_UPDATE` | Edit demand | to-do |

### 3.4 DDS_REMOVE — SCRIPT 2050

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm node delete (full) | `TX.NODE_DELETE` | Delete node | to-do |
| Confirm flow delete (full) | `TX.FLOW_DELETE` | Delete flow | to-do |
| Confirm annotation delete (full) | `TX.ANNOTATION_DELETE` | Delete annotation | to-do |
| Remove node from map only | `TX.MAP_REMOVE_NODE` | Remove node from map | to-do |
| Remove flow from map only | `TX.MAP_REMOVE_FLOW` | Remove flow from map | to-do |
| Remove annotation from map only | `TX.MAP_REMOVE_ANNOTATION` | Remove annotation from map | to-do |

### 3.5 DDS_ELEMENTS_UI — SCRIPT 2100

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Add node to map | `TX.MAP_ADD_NODE` | Add node to map | to-do |
| Add flow to map | `TX.MAP_ADD_FLOW` | Add flow to map | to-do |
| Add annotation to map | `TX.MAP_ADD_ANNOTATION` | Add annotation to map | to-do |

### 3.6 DDS_MAP_UI — SCRIPT 1200

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm map create | `TX.MAP_CREATE` | Create map | to-do |
| Confirm map rename | `TX.MAP_RENAME` | Rename map | to-do |
| Confirm map delete | `TX.MAP_DELETE` | Delete map | to-do |
| Confirm map duplicate | `TX.MAP_DUPLICATE` | Duplicate map | to-do |
| Confirm project rename (nav bar modal) | `TX.PROJECT_RENAME` | Rename project | to-do |
| Confirm add product on map (modal) | `TX.MAP_ADD_PRODUCT_NODE` | Add product to map | to-do |

> The "Add product on map" modal creates a product (if new), a node, and a SKU in a single interaction — all helper calls must be wrapped in a **single** transaction.

### 3.7 Drag interactions — DDS_MAP / DDS_SWIMLANES

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Node drag (`dragfree`) — `map_nodes.x/y` | `TX.MAP_MOVE_NODE` | Move node | to-do |
| Note ghost drag (`dragfree`) — `map_nodes.note_dx/dy` | `TX.MAP_MOVE_NOTE_GHOST` | Move note | to-do |
| CTT line drag (mouseup) — `map_nodes.demand_x/y` | `TX.MAP_MOVE_CTT` | Move CTT line | to-do |
| CTT handle drag (mouseup) — `map_nodes.demand_length` | `TX.MAP_RESIZE_CTT` | Resize CTT line | to-do |
| Flow waypoint drag (mouseup) — `map_flows.waypoint_pct` | `TX.MAP_MOVE_WAYPOINT` | Move flow waypoint | to-do |
| Flow note ghost drag (`dragfree`) — `map_flows.notes_annotation_dx/dy` | `TX.MAP_MOVE_FLOW_NOTE_GHOST` | Move flow note | to-do |
| Annotation drag (`dragfree`) — `map_annotations.x/y` | `TX.MAP_MOVE_ANNOTATION` | Move annotation | to-do |
| Swim-lane resize/reposition (mouseup) — `map_swim_lanes.x/y/width/height` | `TX.MAP_RESIZE_LANE` | Resize swim lane | to-do |

### 3.8 DDS_NODES_UI — SCRIPT 1750

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm node create (table) | `TX.NODE_CREATE` | Create node | to-do |
| Save node edit (table inline) | `TX.NODE_UPDATE` | Edit node | to-do |
| Confirm node delete (table) | `TX.NODE_DELETE` | Delete node | to-do |

### 3.9 DDS_FLOWS_UI — SCRIPT 1760

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Save flow edit (table inline) | `TX.FLOW_UPDATE` | Edit flow | to-do |
| Confirm flow delete (table) | `TX.FLOW_DELETE` | Delete flow | to-do |

### 3.10 DDS_PRODUCTS_UI — SCRIPT 1700

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm product create (table) | `TX.PRODUCT_CREATE` | Create product | to-do |
| Save product edit (table inline) | `TX.PRODUCT_UPDATE` | Edit product | to-do |
| Confirm product delete (table) | `TX.PRODUCT_DELETE` | Delete product | to-do |

### 3.11 DDS_BOMS_UI — SCRIPT 1900

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm BOM create | `TX.BOM_CREATE` | Create BOM | to-do |
| Save BOM components edit | `TX.BOM_UPDATE_COMPONENTS` | Edit BOM components | to-do |
| Confirm BOM delete | `TX.BOM_DELETE` | Delete BOM | to-do |

### 3.12 DDS_DEMANDS_UI — SCRIPT 1770

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Save demand edit (table inline) | `TX.DEMAND_UPDATE` | Edit demand | to-do |
| Confirm demand delete (table) | `TX.DEMAND_DELETE` | Delete demand | to-do |

### 3.13 DDS_ANNOTATIONS_UI — SCRIPT 1780

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Save annotation edit (inline) | `TX.ANNOTATION_UPDATE` | Edit annotation | to-do |
| Confirm annotation delete (table) | `TX.ANNOTATION_DELETE` | Delete annotation | to-do |

### 3.14 Swim lane management

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Confirm lane create | `TX.LANE_CREATE` | Create swim lane | to-do |
| Confirm lane rename | `TX.LANE_UPDATE` | Rename swim lane | to-do |
| Confirm lane delete | `TX.LANE_DELETE` | Delete swim lane | to-do |
| Confirm lane reorder | `TX.LANE_REORDER` | Reorder swim lanes | to-do |

### 3.15 DDS_SETTINGS_UI — SCRIPT 2600

| Interaction | TX key | English label | Status |
|---|---|---|---|
| Save node type edit | `TX.SETTINGS_NODE_TYPE` | Edit node type | to-do |
| Save product type edit | `TX.SETTINGS_PRODUCT_TYPE` | Edit product type | to-do |

### 3.16 DDS_AI_UI — SCRIPT 2500

| Interaction | TX key | English label | Status |
|---|---|---|---|
| User confirms AI action plan | `TX.AI_APPLY_ACTIONS` | Apply AI changes | to-do |

> The transaction wraps the full `DDS_ACTIONS.execute(actions)` call. If `result.failed` is non-null, `rollback()` is called and the error is surfaced in the AI panel. `DDS_AI` itself is not transaction-aware.

---

## 4. Implementation checklist (per call site)

- [ ] Identify the submit / terminal-event handler (not modal open, not drag start).
- [ ] Add `const txId = DDS_TRANSACTION.begin(TX.<KEY>);` as the first line.
- [ ] Wrap all store mutations in `try { ... DDS_TRANSACTION.commit(txId); }`.
- [ ] Add `catch (err) { DDS_TRANSACTION.rollback(txId); }`.
- [ ] Verify `begin()` is not called on cancel/dismiss.
- [ ] For map view: verify undo/redo handler calls `loadMap()` + `DDS_SWIMLANES.render()`, not `runLayout()`.
- [ ] Mark status as `done` in this document.
