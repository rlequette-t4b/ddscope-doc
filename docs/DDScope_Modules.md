# DDScope — Module Registry
*v0.6 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial registry |
| 0.2 | May 2026 | Reframed as machine-readable database; format densified; prose sections removed |
| 0.3 | May 2026 | DDS_ACTIONS added (SCRIPT 1850); DDS_AI_EXECUTOR removed; DDS_AI and DDS_AI_UI dependencies updated |
| 0.4 | May 2026 | Dependency graph added; DDS_MODEL introduced as functional integrity layer; DDS_PRODUCTS, DDS_BOMS, DDS_DEMANDS, DDS_NODES marked deprecated; DDS_ACTIONS and DDS_REMOVE dependencies updated |
| 0.5 | May 2026 | Layered write architecture documented: UI/AI write only via DDS_ACTIONS; DDS_ACTIONS uses DDS_STORE for simple ops and DDS_MODEL for cascades; reads unrestricted. Dependency graph updated. |
| 0.6 | May 2026 | Helper layer introduced: DDS_NODES, DDS_PRODUCTS, DDS_FLOWS, DDS_SKUS created; DDS_BOMS and DDS_DEMANDS refactored as helpers (no longer deprecated). UI modules call helpers only — no direct DDS_STORE or DDS_ACTIONS calls. DDS_ACTIONS.execute() made synchronous. |

---

## Purpose and Usage

**This file is a machine-readable database.** Authoritative source of truth for DDScope JavaScript module definitions. Consumed by AI assistants (Claude in DEV and TEST contexts).

**What is recorded here:** module identity, CommWise block address, public API, runtime dependencies, testability classification, extraction readiness.

**What is not recorded here:** implementation details, UI behaviour (see `DDScope_UI.md`), data model rules (see `DDScope_DataModel.md`).

Both DEV and TEST contexts must keep their copy in sync (manual transfer — see `README.md`).

---

## Layered Write Architecture

```
UI modules / AI modules
        ↓  (all writes)
   Helper layer                    ← NEW: DDS_NODES, DDS_PRODUCTS, DDS_FLOWS,
   (DDS_NODES, DDS_PRODUCTS,           DDS_SKUS, DDS_BOMS, DDS_DEMANDS
    DDS_FLOWS, DDS_SKUS,
    DDS_BOMS, DDS_DEMANDS)
        ↓  translates to actions
   DDS_ACTIONS  (synchronous)
        ↓ simple ops          ↓ cascade ops
   DDS_STORE              DDS_MODEL
        ↓                      ↓
              DDS_STORE (raw CRUD)
```

**Rule 1 — UI writes only via helpers.**
No UI module may call `DDS_ACTIONS.execute()`, `DDS_STORE.insert/update/remove`, or `DDS_MODEL.*` directly on functional layer tables. All writes from UI go through a domain helper (e.g. `DDS_NODES.create(...)`, `DDS_BOMS.delete(...)`).

**Rule 2 — AI writes via `DDS_ACTIONS` directly.**
AI modules (`DDS_AI`, `DDS_AI_UI`) call `DDS_ACTIONS.execute()` directly — they do not go through helpers.

**Rule 3 — Helpers translate to actions.**
Each helper method builds an action list and calls `DDS_ACTIONS.execute()` synchronously. Helpers also expose read methods (`getAll`, `getById`, etc.) as wrappers over `DDS_STORE.query`.

**Rule 4 — `DDS_ACTIONS.execute()` is synchronous.**
Returns `{ applied: action[], failed: action|null }` directly. No Promise, no async/await in the call chain from UI to store.

**Rule 5 — `DDS_ACTIONS` uses `DDS_STORE` for simple ops, `DDS_MODEL` for cascades.**
- Simple mutations (add, update): `DDS_ACTIONS` calls `DDS_STORE` directly.
- Cascade operations (delete_node, delete_flow, delete_product, delete_bom, remove_sku, delete_demand): `DDS_ACTIONS` delegates to `DDS_MODEL`.

**Rule 6 — reads are unrestricted.**
Any module may call `DDS_STORE.query` on any table at any time. Helpers expose named read methods for UI convenience — UI modules should prefer helper reads over direct `DDS_STORE.query` calls.

**Exception — presentation layer:**
`map_nodes`, `map_flows`, `map_swim_lanes`, `map_demands` are managed directly by presentation layer modules (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_ELEMENTS`, etc.) and are outside `DDS_ACTIONS`' scope.

---

## Dependency Graph

```mermaid
graph TD

  subgraph Pure["Pure — no dependencies"]
    DDS_COLORS
    DDS_STORE
    DDS_DURATION
  end

  subgraph Functional["Functional layer"]
    DDS_MODEL
    DDS_ACTIONS
    DDS_JSON
    DDS_AI_CONTEXT
  end

  subgraph Helpers["Helper layer (UI facade)"]
    DDS_NODES
    DDS_PRODUCTS
    DDS_FLOWS
    DDS_SKUS
    DDS_BOMS
    DDS_DEMANDS
  end

  subgraph AI["AI layer"]
    DDS_AI
    DDS_AI_UI
  end

  DDS_MODEL       --> DDS_STORE
  DDS_ACTIONS     --> DDS_STORE
  DDS_ACTIONS     --> DDS_MODEL
  DDS_JSON        --> DDS_STORE
  DDS_AI_CONTEXT  --> DDS_STORE

  DDS_NODES    --> DDS_ACTIONS
  DDS_NODES    --> DDS_STORE
  DDS_PRODUCTS --> DDS_ACTIONS
  DDS_PRODUCTS --> DDS_STORE
  DDS_FLOWS    --> DDS_ACTIONS
  DDS_FLOWS    --> DDS_STORE
  DDS_SKUS     --> DDS_ACTIONS
  DDS_SKUS     --> DDS_STORE
  DDS_BOMS     --> DDS_ACTIONS
  DDS_BOMS     --> DDS_STORE
  DDS_DEMANDS  --> DDS_ACTIONS
  DDS_DEMANDS  --> DDS_STORE

  DDS_AI          --> DDS_STORE
  DDS_AI          --> DDS_AI_CONTEXT
  DDS_AI          --> DDS_ACTIONS

  DDS_AI_UI       --> DDS_STORE
  DDS_AI_UI       --> DDS_AI
  DDS_AI_UI       --> DDS_ACTIONS
```

**Notes:**
- `DDS_STORE` is the root dependency of all layers.
- `DDS_MODEL` handles all cascade operations.
- `DDS_ACTIONS` is the single write entry point — synchronous. Calls `DDS_STORE` for simple ops, `DDS_MODEL` for cascades.
- Helper layer modules translate semantic UI calls into action lists and delegate to `DDS_ACTIONS.execute()`.
- `DDS_REMOVE` (render-dependent, not in this registry) calls `DDS_ACTIONS` for full deletes and `DDS_ELEMENTS` for map-only removals.
- Render-dependent modules (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_LAYOUT`, `DDS_PANEL`, all `*_UI` modules) are not in this registry. Tested via Playwright only.

---

## Reference Tables

### Testability classes

| Class | Condition | Test layer |
|---|---|---|
| `pure` | No DOM, no Cytoscape, no globals beyond window shim | Vitest — no setup |
| `store-dependent` | Uses `DDS_STORE` / `DDS` state, no rendering | Vitest — store + DDS shim required |
| `render-dependent` | Requires Cytoscape canvas or DOM layout | Playwright |
| `out-of-scope` | File System Access API, IndexedDB, CommWise internals | Manual only |

### Extraction contract fields

| Field | Values | Meaning |
|---|---|---|
| `contract` | `met` / `partial` / `unverified` / `not-met` | Whether the block can be extracted without manual edits |
| `dom_mixed` | `yes` / `no` | DOM calls present inside core logic |
| `api_documented` | `yes` / `no` | Public API surface listed in block header comment |
| `deps_declared` | `yes` / `no` | Dependencies listed under `// Depends on:` in block header |

### Test scope fields

| Field | Owner | Values / Meaning |
|---|---|---|
| `test_scope` | DEV | Free-text per-method scenario list |
| `coverage` | TEST | `none` / `partial` / `full` |

### CommWise block title pattern

`JS: DDS_<MODULE> — <one-line description>`

### Extracted filename pattern

`src/<module_name>.js`

---

## Module Entries

---

### DDS_COLORS

```
global:         DDS_COLORS
block:          SCRIPT 105
file:           src/DDS_COLORS.js
testability:    pure
contract:       met
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** single source of truth for the 8-color hex palette.

**API:**
```
DDS_COLORS   // string[] — 8 hex color strings
```

**Dependencies:** none.

---

### DDS_STORE

```
global:         DDS_STORE
block:          SCRIPT 150
file:           src/DDS_STORE.js
testability:    pure
contract:       met
dom_mixed:      no
api_documented: no
deps_declared:  no
```

**Responsibility:** in-memory CRUD + serialization. No business rules — raw CRUD only.

**Write access:** `DDS_STORE.insert/update/remove` on functional tables is called by `DDS_ACTIONS` (simple ops) and `DDS_MODEL` (cascade ops) only. UI modules use helpers for writes and `DDS_STORE.query` for reads when no helper read method is available.

**API:**
```
DDS_STORE.query(table, filters?, options?)   // record[]
DDS_STORE.insert(table, records)             // record[] — ids auto-assigned
DDS_STORE.update(table, filters, updates)    // record[]
DDS_STORE.remove(table, filters)             // record[]
DDS_STORE.markDirty()                        // void
DDS_STORE.resetDirty()                       // void
DDS_STORE.newProject(name, description, createdBy?)  // project
DDS_STORE.toJson()                           // string
DDS_STORE.loadFromText(text)                 // void
DDS_STORE.getProject()                       // project|null
DDS_STORE.setProject(json)                   // void
DDS_STORE.isDirty()                          // boolean
```

**Dependencies:** none.

**Pending refactor:** DOM isolation — `_markDirty()` calls `document.getElementById` directly. Target: `DDS_STORE.onDirtyChange` callback. Prerequisite for all store-dependent unit tests.

---

### DDS_DURATION

```
global:         DDS_DURATION
block:          SCRIPT 1650
file:           src/DDS_DURATION.js
testability:    pure
contract:       met
dom_mixed:      no
api_documented: yes
deps_declared:  yes
test_scope:
  toHours:   all 5 units; zero; NaN; unknown unit → 0
  compare:   h1 > h2; h1 < h2; h1 == h2 (tie → first wins)
  toDisplay: singular (v=1); plural (v>1); zero; unknown unit → ''
coverage:       full
```

**Responsibility:** duration arithmetic and formatting.

**API:**
```
DDS_DURATION.toHours(value, unit)        // number
DDS_DURATION.compare(v1, u1, v2, u2)    // { value, unit }
DDS_DURATION.toDisplay(value, unit)      // string
```

**Dependencies:** none.

---

### DDS_MODEL

```
global:         DDS_MODEL
block:          SCRIPT 1550
file:           src/DDS_MODEL.js
testability:    store-dependent
contract:       partial
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** authoritative runtime implementation of cascade delete rules (`DDScope_DataModel.md` §17.1). Called by `DDS_ACTIONS` for cascade operations only.

**API (cascade operations):**
```
DDS_MODEL.deleteNode(nodeId)
DDS_MODEL.deleteFlow(flowId)
DDS_MODEL.deleteProduct(productId)
DDS_MODEL.deleteSwimLane(swimLaneId)
DDS_MODEL.removeSku(nodeId, productId)
DDS_MODEL.deleteDemand(nodeId, productId)
DDS_MODEL.deleteBom(bomId)
DDS_MODEL.rerouteFlow(flowId, newSourceId?, newTargetId?)
DDS_MODEL.addProductToFlow(flowId, productId)
DDS_MODEL.removeProductFromFlow(flowId, productId)
```

**Dependencies:**
```
DDS_STORE    SCRIPT 150
```

**test_scope:** (see v0.5 entry — unchanged)

---

### DDS_ACTIONS

```
global:         DDS_ACTIONS
block:          SCRIPT 1850
file:           src/DDS_ACTIONS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** single write entry point for helper and AI layers. Translates action lists into `DDS_STORE` calls (simple ops) or `DDS_MODEL` calls (cascade ops). Provides the action vocabulary and human-readable descriptions.

**Synchronous:** `execute()` returns `{ applied, failed }`

**Cascade actions** (routed to `DDS_MODEL`): `delete_node`, `delete_flow`, `delete_product`, `delete_bom`, `remove_sku`, `delete_demand`.

**Simple actions** (routed to `DDS_STORE` directly): all others.

**Robustness:** normalises `action.action → action.type` at the start of `execute()` and `describe()`.

**API:**
```
DDS_ACTIONS.execute(actions)       // { applied: action[], failed: action|null }  ← synchronous
DDS_ACTIONS.describe(actions)      // { index: number, label: string }[]
DDS_ACTIONS.getVocabularyText()    // string — injected into Claude system prompt
DDS_ACTIONS.ACTIONS                // object — structured vocabulary definitions
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS_MODEL   SCRIPT 1550
```

---

### DDS_NODES

```
global:         DDS_NODES
block:          SCRIPT 1560
file:           src/DDS_NODES.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for node operations. Translates semantic calls into `DDS_ACTIONS` action lists. UI modules call this module — never `DDS_ACTIONS` or `DDS_STORE` directly for node writes.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_NODES.create(fields)                    // { name, type_code?, swim_lane_id?, tags?, notes? } → record
DDS_NODES.update(nodeId, fields)            // → record
DDS_NODES.delete(nodeId)                    // → void
DDS_NODES.assignToLane(nodeId, laneId)      // → void

// Reads — DDS_STORE.query wrappers
DDS_NODES.getAll()                          // node[]
DDS_NODES.getById(nodeId)                   // node | null
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_PRODUCTS

```
global:         DDS_PRODUCTS
block:          SCRIPT 1610
file:           src/DDS_PRODUCTS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for product operations. Replaces the previous DDS_PRODUCTS (SCRIPT 1600) which called DDS_STORE directly. UI modules call this module for all product writes.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_PRODUCTS.create(fields)                 // { name, type_code?, tags?, notes? } → record
DDS_PRODUCTS.update(productId, fields)      // → record
DDS_PRODUCTS.delete(productId)              // → void

// Reads — DDS_STORE.query wrappers
DDS_PRODUCTS.getAll()                       // product[]
DDS_PRODUCTS.getById(productId)             // product | null
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_FLOWS

```
global:         DDS_FLOWS
block:          SCRIPT 1620
file:           src/DDS_FLOWS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for flow operations. UI modules call this module for all flow writes.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_FLOWS.create(fields)                              // { source_id, target_id, lead_time_value?, lead_time_unit?, tags?, notes? } → record
DDS_FLOWS.update(flowId, fields)                      // → record
DDS_FLOWS.delete(flowId)                              // → void
DDS_FLOWS.reroute(flowId, newSourceId?, newTargetId?) // → void
DDS_FLOWS.addProduct(flowId, productId)               // → void
DDS_FLOWS.removeProduct(flowId, productId)            // → void

// Reads — DDS_STORE.query wrappers
DDS_FLOWS.getAll()                                    // flow[]
DDS_FLOWS.getById(flowId)                             // flow | null
DDS_FLOWS.getForNode(nodeId)                          // flow[] — flows where node is source or target
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_SKUS

```
global:         DDS_SKUS
block:          SCRIPT 1630
file:           src/DDS_SKUS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for SKU operations. UI modules call this module for all SKU writes.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_SKUS.add(nodeId, productId, fields?)    // { tags?, notes? } → void
DDS_SKUS.update(nodeId, productId, fields)  // → void
DDS_SKUS.remove(nodeId, productId)          // → void

// Reads — DDS_STORE.query wrappers
DDS_SKUS.getAll()                           // sku[]
DDS_SKUS.getForNode(nodeId)                 // sku[]
DDS_SKUS.getForProduct(productId)           // sku[]
DDS_SKUS.get(nodeId, productId)             // sku | null
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_BOMS

```
global:         DDS_BOMS
block:          SCRIPT 1800
file:           src/DDS_BOMS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for BOM operations. Refactored from direct DDS_STORE calls to DDS_ACTIONS delegation. `updateComponents` performs an internal diff (remove / add / update) to produce the minimal action list.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_BOMS.create(nodeId, outputProductId, components)   // components: [{ product_id, quantity }] → void
DDS_BOMS.updateComponents(bomId, components)           // diff against existing → void
DDS_BOMS.delete(bomId)                                 // → void

// Reads — DDS_STORE.query wrappers
DDS_BOMS.getAll()                                      // bom[]
DDS_BOMS.getComponents(bomId)                          // bom_component[]
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_DEMANDS

```
global:         DDS_DEMANDS
block:          SCRIPT 1660
file:           src/DDS_DEMANDS.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** helper facade for demand operations. Refactored from direct DDS_STORE calls to DDS_ACTIONS delegation. Map visibility methods (`showOnMap`, `hideFromMap`) operate on the presentation layer (`map_demands`) and remain direct DDS_STORE calls — they are outside DDS_ACTIONS scope.

**API:**
```
// Writes — delegate to DDS_ACTIONS.execute()
DDS_DEMANDS.create(nodeId, productId, fields?)   // { ctt_value?, ctt_unit?, demand_value?, demand_period?, notes? } → void
DDS_DEMANDS.update(nodeId, productId, fields)    // → void
DDS_DEMANDS.delete(nodeId, productId)            // → void

// Presentation layer — direct DDS_STORE (not via DDS_ACTIONS)
DDS_DEMANDS.showOnMap(demandId, mapId)           // → void
DDS_DEMANDS.hideFromMap(demandId, mapId)         // → void

// Reads — DDS_STORE.query wrappers
DDS_DEMANDS.getAll()                             // demand[]
DDS_DEMANDS.getForNode(nodeId)                   // demand[]
DDS_DEMANDS.get(nodeId, productId)               // demand | null
```

**Dependencies:**
```
DDS_ACTIONS   SCRIPT 1850
DDS_STORE     SCRIPT 150
```

---

### DDS_AI_CONTEXT

```
global:         DDS_AI_CONTEXT
block:          SCRIPT 2200
file:           src/DDS_AI_CONTEXT.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** serialises the current project to Claude context JSON (`DDScope_AI_Assistant.md` §4). Read-only — uses `DDS_STORE.query` only.

**API:**
```
DDS_AI_CONTEXT.build()   // object — Claude context JSON
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

### DDS_AI

```
global:         DDS_AI
block:          SCRIPT 2400
file:           src/DDS_AI.js
testability:    out-of-scope
contract:       unverified
dom_mixed:      no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** system prompt assembly, Claude API call via CommWise secure proxy, response validation. Writes via `DDS_ACTIONS.execute()` directly (not via helpers).

**Dependencies:**
```
DDS_STORE        SCRIPT 150
DDS              SCRIPT 400
DDS_AI_CONTEXT   SCRIPT 2200
DDS_ACTIONS      SCRIPT 1850
```

---

### DDS_AI_UI

```
global:         DDS_AI_UI
block:          SCRIPT 2500
file:           src/DDS_AI_UI.js
testability:    render-dependent
contract:       unverified
dom_mixed:      yes  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** AI panel rendering, plan display, confirm/cancel. Writes via `DDS_ACTIONS.execute()` directly (not via helpers).

**Dependencies:**
```
DDS_STORE        SCRIPT 150
DDS              SCRIPT 400
DDS_AI           SCRIPT 2400
DDS_ACTIONS      SCRIPT 1850
```

---

### DDS_JSON

```
global:         DDS_JSON
block:          SCRIPT 600
file:           src/DDS_JSON.js
testability:    store-dependent
contract:       unverified
dom_mixed:      no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** project import with full ID remapping. Supports copy modes `full`, `lanes`, `types`. Uses `DDS_STORE` directly for batch inserts during import (exception to Rule 1 — import is a bulk initialisation operation, not a functional mutation).

**API:**
```
DDS_JSON.importProject(sourceJson, mode)   // void
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

## Backlog

- [X] **Implement `DDS_NODES`** (SCRIPT 1560) — new helper
- [X] **Implement `DDS_PRODUCTS`** (SCRIPT 1610) — new helper, replaces SCRIPT 1600
- [X] **Implement `DDS_FLOWS`** (SCRIPT 1620) — new helper
- [X] **Implement `DDS_SKUS`** (SCRIPT 1630) — new helper
- [X] **Refactor `DDS_BOMS`** (SCRIPT 1800) — migrate to helper pattern
- [X] **Refactor `DDS_DEMANDS`** (SCRIPT 1660) — migrate to helper pattern
- [X] **Make `DDS_ACTIONS.execute()` synchronous** — remove Promise wrapper (SCRIPT 1850)
- [X] **Migrate `DDS_BOMS_UI`** — replace DDS_BOMS.* (old) with new helper API
- [X] **Migrate `DDS_PANEL` (demand section)** — replace DDS_DEMANDS.* (old) with new helper API
- [X] **Migrate `DDS_DEMANDS_UI`** — replace DDS_DEMANDS.* (old) with new helper API
- [X] **Migrate `DDS_NODES_UI`** — replace any direct store calls with DDS_NODES.*
- [X] **Migrate `DDS_PRODUCTS_UI`** — replace any direct store calls with DDS_PRODUCTS.*
- [X] **Migrate `DDS_FLOWS_UI`** — replace any direct store calls with DDS_FLOWS.*
- [X] **Remove SCRIPT 1600** (old DDS_PRODUCTS + DDS_NODES) — replaced by empty superseded stub
- [X] **`DDS_STORE` DOM isolation refactor** — prerequisite for all store-dependent unit tests
- [ ] **`DDS_MODEL.validateSkus()`** — non-destructive SKU coherence check (v2)

---

## Refactor Notes

### DDS_STORE — DOM isolation (prerequisite for store-dependent tests)

**Problem:** `_markDirty()` calls `document.getElementById` inside core CRUD logic.

**Target:** expose `DDS_STORE.onDirtyChange = null` callback:

```javascript
if (typeof DDS_STORE.onDirtyChange === 'function') {
  DDS_STORE.onDirtyChange(dirty, projectName);
}
```

DOM wiring moves to boot module. In tests: `onDirtyChange` left `null` — no DOM, no error.

**Unblocks:** `DDS_STORE`, `DDS_MODEL`, `DDS_ACTIONS`, `DDS_AI_CONTEXT`, `DDS_JSON`.

---

*b2wise — Confidential*
