# Patch — DDScope_Modules.md
## Motif : ajout DDS_TOOLS (SCRIPT 40), TX (SCRIPT 1865), DDS_TX_HELPER (SCRIPT 1870)

---

### 1. Version History — ajouter une ligne

**Après la ligne v1.2 :**

```
| 1.3 | May 2026 | DDS_TOOLS (SCRIPT 40) added — transversal utility module, DDS_TOOLS.log levelled logger. TX (SCRIPT 1865) added — transaction label catalogue. DDS_TX_HELPER (SCRIPT 1870) added — UI transaction wrapper with onSuccess callback. |
```

---

### 2. Module Entries — insérer avant DDS_COLORS (premier module)

```markdown
### DDS_TOOLS

​```
global:         DDS_TOOLS
block:          SCRIPT 40
file:           src/DDS_TOOLS.js
testability:    pure
contract:       met
dom_mixed:      no
api_documented: yes
deps_declared:  yes
​```

**Responsibility:** transversal utility module — loaded first so all subsequent modules can use it. Currently exposes `DDS_TOOLS.log`, a levelled logger wrapping `console`. Additional utilities will be added here over time.

**API:**
​```
DDS_TOOLS.log.setLevel(level)   // 'debug'|'info'|'warn'|'error'|'off' — persists to localStorage
DDS_TOOLS.log.getLevel()        // returns current level string
DDS_TOOLS.log.debug(...)        // logs if level <= debug
DDS_TOOLS.log.info(...)         // logs if level <= info
DDS_TOOLS.log.warn(...)         // logs if level <= warn
DDS_TOOLS.log.error(...)        // logs if level <= error
​```

**Dependencies:** none.

**Notes:** default level is `'warn'`. Level is read from `localStorage` key `dds_log_level` at boot. In test environments, call `DDS_TOOLS.log.setLevel('off')` in setup to silence all output. `localStorage` is accessed defensively — safe in Node.js with the `shims/window.js` shim.
```

---

### 3. Module Entries — insérer après DDS_TRANSACTIONS

```markdown
### TX

​```
global:         TX
block:          SCRIPT 1865
file:           src/TX.js
testability:    pure
contract:       met
dom_mixed:      no
api_documented: yes
deps_declared:  yes
​```

**Responsibility:** centralised catalogue of transaction labels passed to `DDS_TRANSACTIONS.begin()`. One constant per user interaction. Naming convention: `DOMAIN_OPERATION`.

**API:**
​```
TX.NODE_CREATE         // 'node.create'
TX.NODE_UPDATE         // 'node.update'
TX.NODE_DELETE         // 'node.delete'
TX.FLOW_CREATE         // 'flow.create'
// ... (see block source for full list)
TX.AI_APPLY_ACTIONS    // 'ai.apply_actions'
​```

**Dependencies:** none.

---

### DDS_TX_HELPER

​```
global:         DDS_TX_HELPER
block:          SCRIPT 1870
file:           src/DDS_TX_HELPER.js
testability:    store-dependent
contract:       partial
dom_mixed:      no
api_documented: yes
deps_declared:  yes
​```

**Responsibility:** temporary UI transaction wrapper — encapsulates `DDS_TRANSACTIONS.begin/commit/rollback` into a single `run()` call. Separates store mutations (`fn`) from presentation side-effects (`onSuccess`). To be absorbed into the presentation layer refactor.

**API:**
​```
DDS_TX_HELPER.run(label, fn, onSuccess?)
  // label     : TX catalogue key (e.g. TX.NODE_CREATE)
  // fn(ctx)   : synchronous store mutations — populates ctx with produced IDs/values
  // onSuccess(ctx) : optional — called after commit, never on rollback
  //                  intended for Cytoscape / DOM side effects
​```

**Dependencies:**
​```
DDS_TRANSACTIONS   SCRIPT 1860
TX                 SCRIPT 1865
​```

**Notes:** `fn` and `onSuccess` must be synchronous. If `fn` throws, rollback is automatic and `onSuccess` is never called. Do not call `DDS_TRANSACTIONS.begin/commit/rollback` directly in UI modules — use this helper instead.
```

---

### 4. Backlog — ajouter les entrées complétées

**Ajouter à la liste :**

```
- [X] **Add `DDS_TOOLS`** (SCRIPT 40) — transversal utility module with DDS_TOOLS.log
- [X] **Add `TX`** (SCRIPT 1865) — transaction label catalogue
- [X] **Add `DDS_TX_HELPER`** (SCRIPT 1870) — UI transaction wrapper with onSuccess callback
- [X] **Wire undo/redo buttons** — DIV 200 + SCRIPT 700 (DDS_UI_NAV.bindUndoRedo)
- [X] **First call site TX.NODE_CREATE** — DDS_NODE_UI._doSave() patched (SCRIPT 1300)
```
