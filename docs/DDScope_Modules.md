# DDScope — Module Registry
*v0.2 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial registry |
| 0.2 | May 2026 | Reframed as machine-readable database; format densified; prose sections removed |

---

## Purpose and Usage

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
testability:  store-dependent
contract:     partial
dom_mixed:    no
api_documented: yes
deps_declared:  no
```

**Responsibility:** in-memory CRUD on `DDS.state.project` + serialization helpers (`toJson` / `loadFromText`). Single data access layer for all DDScope modules.

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
```

**Dependencies:**
```
DDS             SCRIPT 400   — global state (DDS.state.project, DDS.state.dirty)
```

**Pending refactor:** none currently tracked for this extracted version.

**High-level test strategy (DDS_STORE):**
- **Test ownership matrix:**

| Area | Owner | Automation | Notes |
|---|---|---|---|
| Memory CRUD (`query/insert/update/remove`) | TEST | Unit (Vitest/Node) | Store-dependent tests with DDS state shim |
| Counters and seed (`_nextId`, `_seedCounters`) | TEST | Unit (Vitest/Node) | Per-table counters, seeded from existing max IDs |
| Dirty state and callback (`markDirty`, `resetDirty`, implicit dirty on writes) | TEST | Unit (Vitest/Node) | Validate callback contract and name resolution |
| Project structure bootstrap (`_blankProject`, `newProject`, `loadFromText`) | TEST | Unit (Vitest/Node) | Validate required arrays and invalid JSON rejection |
| Serialization (`toJson`, `loadFromText`) | TEST | Unit (Vitest/Node) | JSON round-trip, parse failures, and clean state reset after load |

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

### DDS_AI_EXECUTOR

```
global:       DDS_AI_EXECUTOR
block:        SCRIPT 2300
file:         src/DDS_AI_EXECUTOR.js
testability:  store-dependent
contract:     unverified
dom_mixed:    no  (expected)
api_documented: no
deps_declared:  no
```

**Responsibility:** sequential execution of a Claude action plan against `DDS_STORE`. Resolves `new_*` temporary IDs across actions. Rejects unknown action types before any write.

**API:**
```
DDS_AI_EXECUTOR.execute(actions)   // Promise<{ applied: action[], failed: action|null }>
```

**Dependencies:**
```
DDS_STORE   SCRIPT 150
DDS         SCRIPT 400
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

---

*b2wise — Confidential*
