# DDScope — Module Registry
*v0.3 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial registry |
| 0.2 | May 2026 | Reframed as machine-readable database; format densified; prose sections removed |
| 0.3 | May 2026 | DDS_ACTIONS added (SCRIPT 1850); DDS_AI_EXECUTOR removed (absorbed into DDS_ACTIONS + DDS_AI_UI); DDS_AI and DDS_AI_UI dependencies updated |

---

## Purpose and Usage
- [DDScope — Module Registry](#ddscope--module-registry)
  - [Version History](#version-history)
  - [Purpose and Usage](#purpose-and-usage)
  - [Reference Tables](#reference-tables)
    - [Testability classes](#testability-classes)
    - [Extraction contract fields](#extraction-contract-fields)
    - [Test scope fields](#test-scope-fields)
    - [CommWise block title pattern](#commwise-block-title-pattern)
    - [Extracted filename pattern](#extracted-filename-pattern)
  - [Module Entries](#module-entries)
    - [DDS\_COLORS](#dds_colors)
    - [DDS\_STORE](#dds_store)
    - [DDS\_DURATION](#dds_duration)
    - [DDS\_ACTIONS](#dds_actions)
    - [DDS\_AI\_CONTEXT](#dds_ai_context)
    - [DDS\_AI](#dds_ai)
    - [DDS\_AI\_UI](#dds_ai_ui)
    - [DDS\_JSON](#dds_json)
    - [DDS\_PRODUCTS](#dds_products)
    - [DDS\_BOMS](#dds_boms)
    - [DDS\_DEMANDS](#dds_demands)
  - [Refactor Notes](#refactor-notes)
    - [DDS\_STORE — DOM isolation (prerequisite for all store-dependent tests)](#dds_store--dom-isolation-prerequisite-for-all-store-dependent-tests)
    - [DDS\_AI\_EXECUTOR — supprimé](#dds_ai_executor--supprimé)

**This file is a machine-readable database.** It is the authoritative source of truth for DDScope JavaScript module definitions. It is consumed by AI assistants (Claude in DEV and TEST contexts) and is not intended to be read as documentation prose.

Human-readable summaries (for onboarding, PR descriptions, etc.) are generated on demand from this file — they are not stored here.

**What is recorded here:**
- The identity and CommWise address of every `DDS_*` module
- Its public API surface
- Its runtime dependencies
- Its testability classification and extraction readiness

**What is not recorded here:**
- Implementation details (those live in the CommWise blocks themselves)
- UI interaction behaviour (see `DDScope_UI.md`)
- Data model rules (see `DDScope_DataModel.md`)

**Who writes to this file:**
- **DEV** (Claude project) — adds and updates entries when modules are created, refactored, renamed, or their API changes; updates `contract`, `dom_mixed`, `api_documented`, `deps_declared` fields after inspection.
- **TEST** (this repository) — updates `testability` classification and contract fields discovered during extraction; updates `coverage` as tests are written; may also update `test_scope` when asked. The user is responsible for keeping both copies in sync.

Both contexts must keep their copy in sync (manual transfer — see `README.md`).

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
| `dom_mixed` | `yes` / `no` | DOM calls present inside core logic (not isolated in a UI bindings section) |
| `api_documented` | `yes` / `no` | Public API surface listed in the block header comment |
| `deps_declared` | `yes` / `no` | Dependencies listed in the block header comment under `// Depends on:` |

### Test scope fields

| Field | Owner | Values / Meaning |
|---|---|---|
| `test_scope` | DEV | Free-text per-method scenario list. Written by DEV based on API knowledge. |
| `coverage` | TEST | `none` / `partial` / `full` — updated by TEST as tests are written. |

### CommWise block title pattern

All DDScope module blocks must follow: `JS: DDS_<MODULE> — <one-line description>`

The `JS:` prefix is the selector used by `scripts/extract.js` to scope extraction to DDScope modules only.

### Extracted filename pattern

`src/<module_name>.js` — mirrors the JS global name exactly (e.g. `src/DDS_STORE.js`).

---

## Module Entries

---

### DDS_COLORS

```
global:       DDS_COLORS
block:        SCRIPT 105
file:         src/DDS_COLORS.js
testability:  pure
contract:     met
dom_mixed:    no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** single source of truth for the 8-color hex palette used across swim-lanes, node types, product types, and tag colors.

**API:**
```
DDS_COLORS                          // string[] — 8 hex color strings (index = slot)
```

**Dependencies:** none.

---

### DDS_STORE

```
global:       DDS_STORE
block:        SCRIPT 150
file:         src/DDS_STORE.js
testability:  pure
contract:     met
dom_mixed:    no
api_documented: no
deps_declared:  no
```

**Responsibility:** in-memory CRUD on private in-module state (`_state.project`, `_state.dirty`) + serialization helpers (`toJson` / `loadFromText`). Single data access layer for all DDScope modules.

**API:**
```
DDS_STORE.query(table, filters?, options?)   // record[]
DDS_STORE.insert(table, records)             // record[]  — ids auto-assigned
DDS_STORE.update(table, filters, updates)    // record[]
DDS_STORE.remove(table, filters)             // record[]
DDS_STORE.markDirty()                        // void
DDS_STORE.resetDirty()                       // void
DDS_STORE.newProject(name, description, createdBy?)  // project
DDS_STORE.toJson()                           // string
DDS_STORE.loadFromText(text)                 // void (throws on invalid DDScope JSON)
DDS_STORE.getProject()                       // project|null
DDS_STORE.setProject(json)                   // void
DDS_STORE.isDirty()                          // boolean
```

**Dependencies:** none.

**Pending refactor:** none currently tracked for this extracted version.

**High-level test strategy (DDS_STORE):**
- **Test ownership matrix:**

| Area | Owner | Automation | Notes |
|---|---|---|---|
| Memory CRUD (`query/insert/update/remove`) | TEST | Unit (Vitest/Node) | No DDS shim required |
| Counters and seed (`_nextId`, `_seedCounters`) | TEST | Unit (Vitest/Node) | Per-table counters, seeded from existing max IDs |
| Dirty state and callback (`markDirty`, `resetDirty`, implicit dirty on writes) | TEST | Unit (Vitest/Node) | Validate callback contract and name resolution |
| Project structure bootstrap (`_blankProject`, `newProject`, `loadFromText`) | TEST | Unit (Vitest/Node) | Validate required arrays and invalid JSON rejection |
| Serialization and state access (`toJson`, `loadFromText`, `getProject`, `setProject`, `isDirty`) | TEST | Unit (Vitest/Node) | JSON round-trip, state replacement, and dirty-state reads |

- **Scope split:** `DDS_STORE` has two distinct concerns.
  - **In-memory CRUD and state transitions:** automated unit tests in Node/Vitest.
  - **Serialization contract:** automated unit tests in Node/Vitest (`toJson`/`loadFromText`).
- **Core unit-test axes:**
  - **CRUD behavior:** query/insert/update/remove correctness, filtering semantics (including array filters and loose equality), ordering, and table auto-initialization.
  - **ID counters and seed:** deterministic auto-increment per table, seeded from max existing IDs, no cross-table leakage.
  - **Dirty lifecycle contract:** `markDirty`, `resetDirty`, and callback signaling (`onDirtyChange`) only when state changes require it.
  - **Project structure loading:** blank project shape, `newProject` bootstrap behavior, and `loadFromText` validation/failure paths.
- **Known alignment points to keep explicit in tests:**
  - First generated ID after empty table seed is currently `1`.
  - Legacy `tag_colors` to `tag_styles` migration is expected by spec but must be confirmed/implemented in code before asserting it as passing.

---

### DDS_DURATION

```
global:       DDS_DURATION
block:        SCRIPT 1650
file:         src/DDS_DURATION.js
testability:  pure
contract:     met
dom_mixed:    no
api_documented: yes
deps_declared:  yes
test_scope:
  toHours:    all 5 units (hours/days/weeks/months/years); zero value; NaN value; unknown unit → 0
  compare:    h1 > h2; h1 < h2; h1 == h2 (tie → first argument wins)
  toDisplay:  singular (v=1, e.g. '1 day'); plural (v>1); zero; unknown unit → ''
coverage:     full
```

**Responsibility:** duration arithmetic and human-readable formatting. Used by CTT line rendering and future cumulative lead time display.

**API:**
```
DDS_DURATION.toHours(value, unit)        // number — converts to hours (internal base)
DDS_DURATION.compare(v1, u1, v2, u2)    // { value, unit } — returns the longer duration
DDS_DURATION.toDisplay(value, unit)      // string — e.g. "5 days", "1 week"
// DDS_DURATION.add(v1, u1, v2, u2)     // reserved — v2, not implemented
```

**Dependencies:** none.

---

### DDS_ACTIONS

```
global:       DDS_ACTIONS
block:        SCRIPT 1850
file:         src/DDS_ACTIONS.js
testability:  store-dependent
contract:     unverified
dom_mixed:    no
api_documented: yes
deps_declared:  yes
```

**Responsibility:** action execution engine for the DDScope functional model. Receives a JSON action list, resolves `new_*` temporary references across all fields, validates against the known action vocabulary, and applies operations sequentially on `DDS_STORE`. Also provides the action vocabulary definition (structured and as formatted text for Claude) and human-readable action descriptions for the confirmation UI. The vocabulary specification is defined in **[DDScope_Actions.md](DDScope_Actions.md)**; `DDS_ACTIONS` is its authoritative runtime implementation.

**API:**
```
DDS_ACTIONS.execute(actions)       // Promise<{ applied: action[], failed: action|null }>
                                   // Executes actions sequentially. Rejects unknown action types
                                   // before any write. Resolves new_* references as IDs are created.

DDS_ACTIONS.describe(actions)      // { index: number, label: string }[]
                                   // Returns a human-readable label for each action.
                                   // Resolves real IDs from DDS_STORE and new_* from the plan itself
                                   // (two-pass: collect new_* labels, then resolve).

DDS_ACTIONS.getVocabularyText()    // string — action vocabulary injected into the Claude system prompt

DDS_ACTIONS.ACTIONS                // object — structured action definitions used as source of truth
                                   // for getVocabularyText() and for unit tests
                                   // Shape per action: { required: string[], optional: string[], notes: string[] }
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
```

**test_scope:**
```
execute:
  empty plan → { applied: [], failed: null }
  unknown action type → rejected before any write; failed set; applied empty
  new_node_N resolved in subsequent action fields (swim_lane_id, source_id, etc.)
  new_bom_N resolved in add_bom_component.bom_id
  new_product_N resolved in add_sku, add_flow product_ids
  mid-plan failure → failed non-null; applied lists actions already executed
describe:
  empty plan → []
  new_* label resolved from plan (add_node name used in subsequent action label)
  real ID resolved from DDS_STORE (existing node name displayed)
  unknown action → generic or error label, no throw
ACTIONS:
  every known action present
  required and optional fields match AI Assistant spec §3
getVocabularyText:
  returns non-empty string
  contains all known action names
coverage: none
```

---

### DDS_AI_CONTEXT

```
global:       DDS_AI_CONTEXT
block:        SCRIPT 2200
file:         src/DDS_AI_CONTEXT.js
testability:  store-dependent
contract:     unverified
dom_mixed:    no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** serialises the current in-memory project into the Claude context JSON format defined in `DDScope_AI_Assistant.md` §4. Called before every AI request.

**API:**
```
DDS_AI_CONTEXT.build()   // object — Claude context JSON (nodes, flows, skus, demands, boms, maps…)
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

### DDS_AI

```
global:       DDS_AI
block:        SCRIPT 2400
file:         src/DDS_AI.js
testability:  out-of-scope
contract:     unverified
dom_mixed:    no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** system prompt assembly via `DDS_ACTIONS.getVocabularyText()`, Claude API call via CommWise secure proxy, response validation (schema check, unknown action rejection).

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
global:       DDS_AI_UI
block:        SCRIPT 2500
file:         src/DDS_AI_UI.js
testability:  render-dependent
contract:     unverified
dom_mixed:    yes  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** AI panel rendering, message bubbles, plan display via `DDS_ACTIONS.describe()`, confirm/cancel interactions, error reporting from `DDS_ACTIONS.execute()` result (`{ applied, failed }`).

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
global:       DDS_JSON
block:        SCRIPT 600
file:         src/DDS_JSON.js
testability:  store-dependent
contract:     unverified
dom_mixed:    no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** imports a source project JSON into the current in-memory project with full ID remapping. Supports copy modes `full`, `lanes`, `types` (defined in `DDScope_Overview.md` §3.1).

**API:**
```
DDS_JSON.importProject(sourceJson, mode)   // void — writes remapped data into DDS.state.project
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

### DDS_PRODUCTS

```
global:       DDS_PRODUCTS
block:        SCRIPT 1600
file:         src/DDS_PRODUCTS.js
testability:  store-dependent
contract:     unverified
dom_mixed:    unverified
api_documented: no
deps_declared:  no
```

**Responsibility:** product CRUD with SKU cascade on delete (removes product from all flows, deletes orphaned SKUs, applies BOM cascade).

**API:** to be documented on extraction.

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

### DDS_BOMS

```
global:       DDS_BOMS
block:        SCRIPT 1800
file:         src/DDS_BOMS.js
testability:  store-dependent
contract:     unverified
dom_mixed:    unverified
api_documented: no
deps_declared:  no
```

**Responsibility:** BOM and BOM component CRUD with cascade. Delete BOM → removes all its components. SKU deletion triggers BOM cascade for affected output products and components.

**API:** to be documented on extraction.

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

### DDS_DEMANDS

```
global:       DDS_DEMANDS
block:        SCRIPT 1660
file:         src/DDS_DEMANDS.js
testability:  store-dependent
contract:     unverified
dom_mixed:    unverified
api_documented: no
deps_declared:  no
```

**Responsibility:** demand record CRUD (CTT + demand per period per SKU) and `map_demands` visibility toggling. Cascade from `delete_node`, `delete_product`, `remove_sku`.

**API:** to be documented on extraction.

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
```

---

## Refactor Notes

### DDS_STORE — DOM isolation (prerequisite for all store-dependent tests)

**Problem:** `_markDirty()` and `_markClean()` call `document.getElementById` directly inside core CRUD logic. Any test invoking `insert()`, `update()`, or `remove()` fails without a DOM shim.

**Target:** expose `DDS_STORE.onDirtyChange = null`. The store calls it instead of touching `document`:

```javascript
// Inside _markDirty / _markClean:
if (typeof DDS_STORE.onDirtyChange === 'function') {
  DDS_STORE.onDirtyChange(dirty, projectName);
}
```

DOM wiring moves to the boot module (DDS_INIT or DDS_UI_NAV):

```javascript
DDS_STORE.onDirtyChange = function(dirty, name) {
  var btn = document.getElementById('dds-btn-save');
  if (btn) btn.disabled = !dirty;
  var label = document.getElementById('dds-nav-project-label');
  if (label) label.textContent = name + (dirty ? ' \u2022' : '');
};
```

In tests: `onDirtyChange` is left `null` — no DOM, no error.

**Browser impact:** none. Behaviour identical.

**Unblocks:** `DDS_STORE`, `DDS_AI_EXECUTOR`, `DDS_AI_CONTEXT`, `DDS_JSON`, `DDS_PRODUCTS`, `DDS_BOMS`, `DDS_DEMANDS`.

### DDS_AI_EXECUTOR — supprimé

Logique absorbée dans `DDS_ACTIONS` (exécution + résolution `new_*`) et `DDS_AI_UI` (reporting d'erreur, affichage du plan). Le bloc CommWise correspondant peut être archivé ou supprimé lors du prochain chantier AI.

---

*b2wise — Confidential*
