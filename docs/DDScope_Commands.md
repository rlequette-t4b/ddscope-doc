# DDScope — Commands & Transaction Pattern

*v1.0 — Draft — May 2026*

*Source of authority for: the DDS_CMD command layer (target architecture), the TX catalogue, the legacy transaction pattern, the call site inventory, and the AI vocabulary contract.*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial draft — pattern + call site inventory |
| 0.2 | May 2026 | Clarified map_* scope; added all presentation-layer call sites, drag interactions, AI layer |
| 0.3 | May 2026 | DDS_TX_HELPER (SCRIPT 1870) added — wraps begin/commit/rollback; pattern updated at all call sites |
| 0.4 | May 2026 | DDS_TX_HELPER.run() extended with onSuccess callback — presentation-layer side effects separated from store mutations; DDS_NODE_UI._doSave() patched as first call site |
| 0.5 | May 2026 | map_* tables confirmed in TX scope; DDS_PANEL node panel fully wired (all 7 handlers); swim-lane panel wired (2 handlers); flow panel wired (10 handlers, issues in progress); annotation panel wired (4 handlers, to test — bug on annotation creation); _afterUndoRedo closes side panel to avoid stale fields |
| 0.6 | May 2026 | DDS_FLOW_UI wirés (FLOW_CREATE, FLOW_REROUTE) ; DDS_MAP drag nœud (MAP_MOVE_NODE) et note ghost (MAP_MOVE_NOTE_GHOST) ; DDS_REMOVE toutes branches (NODE_DELETE, FLOW_DELETE, LANE_DELETE, ANNOTATION_DELETE, MAP_REMOVE_*, MULTI_DELETE) ; TX.MULTI_DELETE ajouté au catalogue ; colonne tested ajoutée à l'inventaire ; règle "une TX par interaction" documentée |
| 0.7 | May 2026 | Waypoint drag + dblclick câblés (MAP_MOVE_WAYPOINT) ; swim-lane drag + resize câblés (MAP_RESIZE_LANE) ; fix revertDelta union-des-clés ; preserveViewport après undo/redo ; pattern "begin au mousedown" documenté (§1.5) ; fix revertDelta documenté (§1.6) ; sections 3.1 node edit et 3.5 DDS_ELEMENTS_UI passées en n/a ; tables Nodes/Flows/Annotations inline edit passées en n/a (feature supprimée) ; tous les call sites DDS_PANEL et DDS_REMOVE passés en tested=yes |
| 1.0 | May 2026 | Document renamed DDScope_Commands.md; §0 DDS_CMD target architecture added; TX catalogue extended with notes domain (FEAT-002); legacy pattern preserved under §1–§4 |

---

## 0. Target architecture — DDS_CMD

This section describes the command layer that will eventually replace the legacy helper + DDS_ACTIONS stack. It is introduced incrementally, starting with the notes domain (FEAT-002). All other domains continue to use the legacy pattern until migrated.

### 0.1 Motivation

The current stack has four layers between the UI and the store:

```
UI  →  helper (DDS_NODES, DDS_FLOWS, …)  →  DDS_ACTIONS  →  DDS_STORE / DDS_MODEL
```

Problems: business logic is split between helpers and DDS_ACTIONS; the AI vocabulary (`DDScope_Actions.md`) is a separate artefact that must be kept in sync with the TX catalogue; `DDS_TX_HELPER` wraps begin/commit/rollback externally; there is no single natural entry point for logging or observability.

### 0.2 Target

```
UI  →  DDS_CMD.execute(TX.KEY, params, mapId, onSuccess?)  →  DDS_STORE / DDS_MODEL
AI  →  DDS_CMD.executeList([{ type, params }], mapId, onSuccess?)  →  (single wrapping TX)
```

- **One module** (`DDS_CMD`) replaces helpers, `DDS_ACTIONS`, and `DDS_TX_HELPER`.
- **One command per TX key** — each command encapsulates its own business logic and cascade rules.
- **`DDS_CMD.execute` wraps begin/commit/rollback automatically.** No external wrapper needed.
- **`mapId`** is passed for commands that create or modify map-scoped entities; `null` otherwise.
- **`onSuccess`** is preserved for Cytoscape/DOM side effects that must run after commit.
- **`DDS_CMD.executeList`** is the AI entry point: executes a list of `{ type, params }` commands sequentially inside a single global transaction.

### 0.3 Signature

```javascript
// Single command
DDS_CMD.execute(txKey, params, mapId, onSuccess?)
// Returns: { ok: boolean, id?: integer }

// AI batch
DDS_CMD.executeList(commands, mapId, onSuccess?)
// commands: [{ type: TX.KEY, params: {} }, ...]
// Returns: { ok: boolean, failed?: { type, params } }
```

### 0.4 AI vocabulary contract

`DDS_CMD` is the future single source of truth for the AI action vocabulary. When a command is registered in `DDS_CMD`, its description, parameter schema, and examples are co-located with its implementation — no separate `DDScope_Actions.md` to maintain.

`DDS_CMD.getVocabularyText()` replaces `DDS_ACTIONS.getVocabularyText()`. The AI system prompt is assembled from the command registry directly.

> **Current state:** `DDScope_Actions.md` and `DDS_ACTIONS` remain authoritative for the AI vocabulary until DDS_CMD covers all domains. Notes commands (FEAT-002) are not in the AI vocabulary yet.

### 0.5 Migration strategy

DDS_CMD coexists with the legacy stack. Legacy helpers and DDS_ACTIONS are untouched until their domain is migrated. The migration order follows the call site inventory in §3 — domains with `to-do` call sites are migrated first to avoid double work.

**Current DDS_CMD domains:** notes (`note_categories`, `notes`) — FEAT-002.

### 0.6 Notes domain — TX keys

Commands implemented in DDS_CMD for FEAT-002:

| TX key | Operation | mapId used |
|---|---|---|
| `TX.NOTE_CATEGORY_CREATE` | Insert `note_categories` record | No |
| `TX.NOTE_CATEGORY_UPDATE` | Update `note_categories` record (label, position) | No |
| `TX.NOTE_CATEGORY_DELETE` | Delete `note_categories` record + cascade to `notes` | No |
| `TX.NOTE_CATEGORY_REORDER` | Update `position` on multiple `note_categories` records | No |
| `TX.NOTE_CREATE` | Insert `notes` record | No |
| `TX.NOTE_UPDATE` | Update `notes` record (content, position) | No |
| `TX.NOTE_DELETE` | Delete `notes` record | No |
| `TX.NOTE_REORDER` | Update `position` on multiple `notes` records within a category | No |

Usage examples:

```javascript
DDS_CMD.execute(TX.NOTE_CATEGORY_CREATE, { label: 'Contraintes' }, null)
DDS_CMD.execute(TX.NOTE_CREATE, { category_id: 3, content: 'Environ 350 fournisseurs', position: 0 }, null)
DDS_CMD.execute(TX.NOTE_UPDATE, { id: 7, content: 'Environ 400 fournisseurs' }, null)
DDS_CMD.execute(TX.NOTE_DELETE, { id: 7 }, null)
DDS_CMD.execute(TX.NOTE_CATEGORY_DELETE, { id: 3 }, null)  // cascades to notes
```

---

## 1. Legacy pattern — DDS_TX_HELPER

*Used by all domains not yet migrated to DDS_CMD.*

### 1.1 Transaction lifecycle

`DDS_TX_HELPER.run(label, fn, onSuccess?)` — wraps `begin`/`commit`/`rollback`.

- `fn(ctx)` — synchronous store mutations only. Populate `ctx` with any data needed by the presentation layer (IDs, positions, etc.).
- `onSuccess(ctx)` — optional. Called after `commit()`, never on rollback. Intended for Cytoscape / DOM side effects that must not be inside the transaction snapshot.

**Rules:**

1. Pass all store mutations inside `fn`. Do not mix Cytoscape calls in `fn`.
2. `fn` and `onSuccess` must be synchronous — no async/await.
3. A single `run()` per user interaction, even when multiple helpers are chained.
4. If `fn` throws, rollback is automatic and `onSuccess` is never called.
5. Do not call `DDS_TRANSACTIONS.begin/commit/rollback` directly in UI modules **unless** the drag pattern requires opening the transaction at `mousedown` (see §1.5).
6. A single `run()` per user interaction, even when multiple helpers are chained inside `fn`. Opening one transaction per helper call would produce multiple undo stack entries for what the user perceives as a single action.

```js
// Simple case — no presentation side effects needed
DDS_TX_HELPER.run(TX.NODE_UPDATE, function(ctx) {
  DDS_NODES.update(nodeId, fields);
});

// With presentation callback — IDs produced in fn, used in onSuccess
DDS_TX_HELPER.run(TX.NODE_CREATE, function(ctx) {
  var result = DDS_NODES.create(fields);
  ctx.nodeId = result.applied[0]._created_id;
  var pos = DDS_LAYOUT.placeNode(ctx.nodeId, mapId);
  ctx.x = pos ? pos.x : 200;
  ctx.y = pos ? pos.y : 200;
  var rows = DDS_STORE.insert('map_nodes', { map_id: mapId, node_id: ctx.nodeId, x: ctx.x, y: ctx.y });
  ctx.mapNodeId = rows[0].id;
}, function(ctx) {
  DDS_CY.add({ group: 'nodes', data: { id: 'n' + ctx.nodeId, ... }, position: { x: ctx.x, y: ctx.y } });
});
```

### 1.2 Scope: functional and presentation tables

`DDS_TRANSACTIONS` captures the full `DDS_STORE` state via a delta mechanism on `begin()` and restores it on `rollback()` or `undo()`. This covers **all tables** — both functional (`nodes`, `flows`, etc.) and presentation (`map_nodes`, `map_flows`, `map_annotations`, `map_swim_lanes`, `map_demands`). Undo/redo therefore restores canvas positions, visibility, and layout state alongside functional data.

This means **all store mutations are in scope**, including:
- Node/flow/product/SKU/BOM/demand/annotation CRUD (via helper modules).
- Note category and note CRUD (via DDS_CMD).
- Node canvas position updates (`map_nodes.x/y` on drag).
- Flow waypoint updates (`map_flows.waypoint_pct` on drag).
- Swim-lane geometry changes (`map_swim_lanes.x/y/width/height`).
- Annotation canvas position updates (`map_annotations.x/y` on drag).
- Note ghost offsets (`map_nodes.note_dx/note_dy`, `map_flows.notes_annotation_dx/dy`).
- CTT line position and size (`map_nodes.demand_x/y/length`).
- Add/remove element from map (`map_nodes`, `map_flows`, `map_annotations` insert/delete).

**After undo/redo on the map view:** call `DDS_MAP.loadMap(mapId, true)` (with `preserveViewport=true`) then `DDS_SWIMLANES.render()`. Do **not** call `runLayout()` — positions are restored from the snapshot and must not be recalculated.

### 1.3 Case: interaction cancelled by the user

`run()` is called only at submit time, not at modal open. If the user cancels, no transaction is opened.

### 1.4 Case: drag interactions (standard)

Drag interactions that do **not** mutate store records directly in `onMove` persist position updates to the store on the terminal event (`dragfree`, mouseup, or equivalent). The transaction wraps only the store write — not the drag motion itself.

### 1.5 Case: drag interactions with direct store mutation in onMove

Some drag handlers (swim-lane drag, CTT drag) mutate store records **directly by reference** during `onMove` for real-time rendering. Required pattern:

1. Capture original values into a local snapshot **before** `begin`.
2. Call `DDS_TRANSACTIONS.begin(TX.<KEY>)` at `mousedown`.
3. In `onMove`: mutate the record directly for real-time rendering.
4. In `onUp` (moved): restore original values on the record → `DDS_STORE.update` with new values → `DDS_TRANSACTIONS.commit(txId)`.
5. In `onUp` (click without drag): `DDS_TRANSACTIONS.rollback(txId)`.

### 1.6 Case: side panel open during undo/redo

Close the panel on every undo/redo — the user re-selects the element to continue editing. Implementation: `_afterUndoRedo()` in `DDS_UI_NAV` (SCRIPT 700).

### 1.7 Case: partial failure in a multi-step interaction

If a helper call throws mid-sequence, rollback is automatic and restores the full state captured at `begin()`.

### 1.8 AI layer (current)

`DDS_AI_UI` owns the transaction wrapping AI-generated action plans. After the user confirms, `DDS_AI_UI` calls `DDS_TX_HELPER.run(TX.AI_APPLY_ACTIONS, fn)` with the full action list passed to `DDS_ACTIONS.execute(actions)`.

---

## 2. Transaction labels — TX catalogue

### 2.1 Convention

The label passed to `begin(label)` / `DDS_CMD.execute(txKey, …)` is a **catalogue key**: dot-notation string constant from the `TX` object.

**Naming convention:** `<domain>.<operation>`

### 2.2 Centralised catalogue

The `TX` catalogue lives in a **dedicated SCRIPT block** (SCRIPT 1865). `DDS_CMD` reads from it — `TX` remains the single source of key constants.

```js
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
  // Notes (DDS_CMD — FEAT-002)
  NOTE_CATEGORY_CREATE:     'note_category.create',
  NOTE_CATEGORY_UPDATE:     'note_category.update',
  NOTE_CATEGORY_DELETE:     'note_category.delete',
  NOTE_CATEGORY_REORDER:    'note_category.reorder',
  NOTE_CREATE:              'note.create',
  NOTE_UPDATE:              'note.update',
  NOTE_DELETE:              'note.delete',
  NOTE_REORDER:             'note.reorder',
  // Multi-selection
  MULTI_DELETE:             'multi.delete',
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

When Undo/Redo buttons display a contextual label, a translation table indexed by TX key is sufficient. Dynamic labels are out of scope for now — buttons are anonymous (enabled/disabled only).

---

## 3. Call site inventory

Statuses: `to-do` | `done` | `n/a`
Tested: `yes` | `partial` | `no` | `—` (n/a or to-do)
Pattern: `cmd` (DDS_CMD) | `helper` (legacy DDS_TX_HELPER)

> **n/a** is reserved for: read-only interactions, ephemeral UI state (panel open/close, tab switch), features removed from scope, and table interactions replaced by the map + side panel pattern.

### 3.1 DDS_NODE_UI — SCRIPT 1300

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm node creation (modal) | `TX.NODE_CREATE` | helper | done | yes |

### 3.2 DDS_FLOW_UI — SCRIPT 1400

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Drop to create flow | `TX.FLOW_CREATE` | helper | done | yes |
| Confirm reroute (drag handle drop) | `TX.FLOW_REROUTE` | helper | done | yes |
| Waypoint drag (mouseup) | `TX.MAP_MOVE_WAYPOINT` | helper | done | yes |
| Waypoint double-click reset | `TX.MAP_MOVE_WAYPOINT` | helper | done | yes |

### 3.3 DDS_PANEL — SCRIPT 1500 + 1505

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Save node fields (side panel) | `TX.NODE_UPDATE` | helper | done | yes |
| Save flow fields (side panel) | `TX.FLOW_UPDATE` | helper | done | yes |
| Assign node to lane (side panel) | `TX.NODE_ASSIGN_LANE` | helper | done | yes |
| Add product to flow (side panel) | `TX.FLOW_ADD_PRODUCT` | helper | done | yes |
| Remove product from flow (side panel) | `TX.FLOW_REMOVE_PRODUCT` | helper | done | yes |
| Add SKU (demand sub-section) | `TX.SKU_ADD` | helper | done | yes |
| Update SKU (demand sub-section) | `TX.SKU_UPDATE` | helper | done | yes |
| Remove SKU (demand sub-section) | `TX.SKU_REMOVE` | helper | done | yes |
| Save demand fields | `TX.DEMAND_UPDATE` | helper | done | yes |

### 3.4 DDS_REMOVE — SCRIPT 2050

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm node delete (full) | `TX.NODE_DELETE` | helper | done | yes |
| Confirm flow delete (full) | `TX.FLOW_DELETE` | helper | done | yes |
| Confirm lane delete (full) | `TX.LANE_DELETE` | helper | done | yes |
| Confirm annotation delete (full) | `TX.ANNOTATION_DELETE` | helper | done | yes |
| Remove node from map only | `TX.MAP_REMOVE_NODE` | helper | done | yes |
| Remove flow from map only | `TX.MAP_REMOVE_FLOW` | helper | done | yes |
| Remove annotation from map only | `TX.MAP_REMOVE_ANNOTATION` | helper | done | yes |
| Multi-selection delete (full) | `TX.MULTI_DELETE` | helper | done | yes |
| Multi-selection map-only | `TX.MAP_REMOVE_NODE` | helper | done | yes |

### 3.5 DDS_ELEMENTS_UI — SCRIPT 2100

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Add node to map | `TX.MAP_ADD_NODE` | helper | n/a | — |
| Add flow to map | `TX.MAP_ADD_FLOW` | helper | n/a | — |
| Add annotation to map | `TX.MAP_ADD_ANNOTATION` | helper | n/a | — |

> Elements panel feature removed from scope.

### 3.6 DDS_MAP_UI — SCRIPT 1200

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm map create | `TX.MAP_CREATE` | helper | to-do | — |
| Confirm map rename | `TX.MAP_RENAME` | helper | to-do | — |
| Confirm map delete | `TX.MAP_DELETE` | helper | to-do | — |
| Confirm map duplicate | `TX.MAP_DUPLICATE` | helper | to-do | — |
| Confirm project rename (nav bar modal) | `TX.PROJECT_RENAME` | helper | to-do | — |
| Confirm add product on map (modal) | `TX.MAP_ADD_PRODUCT_NODE` | helper | to-do | — |

### 3.7 Drag interactions — DDS_MAP / DDS_SWIMLANES / DDS_FLOW_UI

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Node drag (`dragfree`) | `TX.MAP_MOVE_NODE` | helper | done | yes |
| Note ghost drag (`dragfree`) | `TX.MAP_MOVE_NOTE_GHOST` | helper | done | yes |
| Waypoint drag (mouseup) | `TX.MAP_MOVE_WAYPOINT` | helper | done | yes |
| Swim-lane drag (mouseup) | `TX.MAP_RESIZE_LANE` | helper | done | yes |
| Swim-lane resize (mouseup) | `TX.MAP_RESIZE_LANE` | helper | done | yes |
| CTT line drag (mouseup) | `TX.MAP_MOVE_CTT` | helper | to-do | — |
| CTT handle drag (mouseup) | `TX.MAP_RESIZE_CTT` | helper | to-do | — |
| Flow note ghost drag (`dragfree`) | `TX.MAP_MOVE_FLOW_NOTE_GHOST` | helper | to-do | — |
| Annotation drag (`dragfree`) | `TX.MAP_MOVE_ANNOTATION` | helper | done | yes |

### 3.8 DDS_NODES_UI — SCRIPT 1750

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm node create (table) | `TX.NODE_CREATE` | helper | done | — |

### 3.9 DDS_FLOWS_UI — SCRIPT 1760

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| ~~Save flow edit (inline)~~ | — | — | n/a | — |

### 3.10 DDS_PRODUCTS_UI — SCRIPT 1700

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm product create (table) | `TX.PRODUCT_CREATE` | helper | to-do | — |
| Save product edit (table inline) | `TX.PRODUCT_UPDATE` | helper | to-do | — |
| Confirm product delete (table) | `TX.PRODUCT_DELETE` | helper | to-do | — |

### 3.11 DDS_BOMS_UI — SCRIPT 1900

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm BOM create | `TX.BOM_CREATE` | helper | to-do | — |
| Save BOM components edit | `TX.BOM_UPDATE_COMPONENTS` | helper | to-do | — |
| Confirm BOM delete | `TX.BOM_DELETE` | helper | to-do | — |

### 3.12 DDS_DEMANDS_UI — SCRIPT 1770

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Save demand edit (table inline) | `TX.DEMAND_UPDATE` | helper | to-do | — |
| Confirm demand delete (table) | `TX.DEMAND_DELETE` | helper | to-do | — |

### 3.13 DDS_ANNOTATIONS_UI — SCRIPT 1780

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm annotation delete (table) | `TX.ANNOTATION_DELETE` | helper | to-do | — |

### 3.14 Swim lane management

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Confirm lane create | `TX.LANE_CREATE` | helper | to-do | — |
| Confirm lane rename | `TX.LANE_UPDATE` | helper | to-do | — |
| Confirm lane delete | `TX.LANE_DELETE` | helper | to-do | — |
| Confirm lane reorder | `TX.LANE_REORDER` | helper | to-do | — |

### 3.15 DDS_SETTINGS_UI — SCRIPT 2600

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Save node type edit | `TX.SETTINGS_NODE_TYPE` | helper | to-do | — |
| Save product type edit | `TX.SETTINGS_PRODUCT_TYPE` | helper | to-do | — |
| Note category create | `TX.NOTE_CATEGORY_CREATE` | cmd | to-do | — |
| Note category rename | `TX.NOTE_CATEGORY_UPDATE` | cmd | to-do | — |
| Note category delete | `TX.NOTE_CATEGORY_DELETE` | cmd | to-do | — |
| Note category reorder | `TX.NOTE_CATEGORY_REORDER` | cmd | to-do | — |

### 3.16 DDS_NOTES_UI — SCRIPT TBD (FEAT-002)

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| Add note | `TX.NOTE_CREATE` | cmd | to-do | — |
| Edit note | `TX.NOTE_UPDATE` | cmd | to-do | — |
| Delete note | `TX.NOTE_DELETE` | cmd | to-do | — |
| Reorder note | `TX.NOTE_REORDER` | cmd | to-do | — |

### 3.17 DDS_AI_UI — SCRIPT 2500

| Interaction | TX key | Pattern | Status | Tested |
|---|---|---|---|---|
| User confirms AI action plan | `TX.AI_APPLY_ACTIONS` | helper | done | — |

---

## 4. Implementation checklist (per call site)

**DDS_CMD pattern:**
- [ ] TX key registered in `TX` catalogue and in `DDS_CMD` command registry.
- [ ] `DDS_NOTES_UI` / `DDS_SETTINGS_UI` calls `DDS_CMD.execute(TX.KEY, params, mapId, onSuccess?)`.
- [ ] `mapId` is `null` for commands with no map dimension.
- [ ] `onSuccess` used only for DOM side effects after commit.
- [ ] Cascade rules (e.g. `NOTE_CATEGORY_DELETE`) implemented inside the command, not in the caller.
- [ ] Mark status as `done` in §3.

**Legacy helper pattern (`DDS_TX_HELPER.run`):**
- [ ] Identify the submit / terminal-event handler (not modal open, not drag start).
- [ ] Wrap all store mutations in `DDS_TX_HELPER.run(TX.<KEY>, fn, onSuccess?)`.
- [ ] Put all Cytoscape / DOM side effects in `onSuccess`, never in `fn`.
- [ ] Use `ctx` to pass data produced in `fn` to `onSuccess`.
- [ ] Verify `run()` is not called on cancel/dismiss.
- [ ] Single `run()` per user interaction — never one per helper call.
- [ ] For map view: verify undo/redo handler calls `loadMap(mapId, true)`, not `runLayout()`.
- [ ] Mark status as `done` in §3.

**Begin-at-mousedown pattern (§1.5):**
- [ ] Capture `_origValues` before `begin`.
- [ ] Call `DDS_TRANSACTIONS.begin(TX.<KEY>)` at `mousedown`.
- [ ] Restore originals → `DDS_STORE.update` → `commit` at `onUp` (moved).
- [ ] `rollback` at `onUp` (not moved).

---

*b2wise — Confidential*
