# DDScope — Architecture
*v3.4 — May 2026*

*See also: [DDScope_DataModel.md](DDScope_DataModel.md) · [DDScope_Presentation.md](DDScope_Presentation.md) · [DDScope_Rendering.md](DDScope_Rendering.md) · [DDScope_UI.md](DDScope_UI.md) · [DDScope_Modules.md](DDScope_Modules.md)*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.4 | May 2026 | Initial split from monolithic spec |
| 0.5–2.3 | May 2026 | Incremental updates (see prior history in git) |
| 3.0 | May 2026 | Major restructure: implementation details extracted to dedicated documents; Architecture now describes layers and dependencies only |
| 3.1 | May 2026 | §6 Key Implementation Details dispatched to Presentation, Rendering, and UI docs |
| 3.2 | May 2026 | Internal links updated — single flat docs/ folder |
| 3.3 | May 2026 | §6 Obsolete Patterns added |
| 3.4 | May 2026 | §4 table catalogue and §5.5 file format moved to DDScope_DataModel.md; replaced by pointers |

---

## 1. Platform

DDScope runs entirely within the CommWise platform as a single-page CommWise Web App. Single-user per session. No concurrent editing.

**Stack:**

| Concern | Solution |
|---|---|
| Persistent storage | Local JSON file — in-memory store + File System Access API |
| Map rendering | Cytoscape.js v3.33.1 |
| Swim-lane rendering | HTML overlay divs (not Cytoscape compounds) |
| Auto-layout | Custom BFS ranking per swim-lane |

---

## 2. Layered Architecture

DDScope is organised into five layers. Each layer has a single responsibility and a constrained dependency direction — no layer may depend on a layer above it.

```
┌───────────────────────────────┐  User-facing interactions, views, panels
│           UI layer           │
├───────────────────────────────┤  Cytoscape canvas + HTML overlays
│        Rendering layer        │
├───────────────────────────────┤  map_* entity logic, layout algorithms
│      Presentation layer       │
├─────────────┬───────────────┬─┤  Domain helpers / AI action execution / DDS_CMD
│  Helper layer│   AI layer    │
├───────────────────────────────┤  DDS_STORE, DDS_ACTIONS, DDS_MODEL
│       Functional layer        │
└───────────────────────────────┘
```

### Functional layer

The foundation. Manages in-memory state (`DDS_STORE`), action execution (`DDS_ACTIONS`), cascade rules (`DDS_MODEL`), undo/redo (`DDS_TRANSACTIONS`), and file persistence. No knowledge of rendering or UI.

### Functional layer modules

| Module | Responsibility |
|---|---|
| `DDS_TOOLS` | Transversal utilities — `DDS_TOOLS.log` levelled logger (debug/info/warn/error/off), localStorage-persisted level |
| `DDS_COLORS` | 8-color palette constant |
| `DDS_ICONS` | SVG icon library — keyed dictionary, `toDataUrl()` with color injection |
| `DDS_STORE` | In-memory CRUD + file persistence |
| `DDS_DURATION` | Duration arithmetic and formatting |
| `DDS_MODEL` | Cascade delete rules — authoritative runtime |
| `DDS_ACTIONS` | Action execution engine — synchronous; apply action lists on DDS_STORE/DDS_MODEL, resolve new_* references, action vocabulary |
| `DDS_TRANSACTIONS` | Snapshot-based undo/redo transaction manager — wraps DDS_STORE state capture and restore |
| `DDS_TX` | Transaction label catalogue — centralised constants for `DDS_TRANSACTIONS.begin()` and `DDS_CMD.execute()` |
| `DDS_CMD` | Unified command layer — notes domain bootstrap; replaces helpers + DDS_ACTIONS for migrated domains |
| `DDS_TX_HELPER` | UI transaction wrapper — `DDS_TX_HELPER.run(label, fn, onSuccess?)` encapsulates begin/commit/rollback; temporary, pending full DDS_CMD migration |
| `DDS_JSON` | Project import with copy modes + ID remapping |

### Helper layer modules

UI modules call helpers for all functional writes and reads (legacy domains). Helpers translate semantic calls into `DDS_ACTIONS` action lists.

| Module | Responsibility |
|---|---|
| `DDS_NODES` | Node CRUD helper |
| `DDS_PRODUCTS` | Product CRUD helper |
| `DDS_FLOWS` | Flow CRUD helper |
| `DDS_SKUS` | SKU CRUD helper |
| `DDS_BOMS` | BOM CRUD helper |
| `DDS_DEMANDS` | Demand CRUD helper |
| `DDS_ANNOTATIONS` | Annotation CRUD helper |

### AI layer modules

| Module | Block | Responsibility |
|---|---|---|
| `DDS_AI_CONTEXT` | SCRIPT 2200 | Serialises project to Claude context JSON |
| `DDS_AI` | SCRIPT 2400 | System prompt assembly, Claude API call, response validation |
| `DDS_AI_UI` | SCRIPT 2500 | AI panel, plan display, confirm/cancel, error reporting |

### Presentation layer modules (render-dependent)

| Module | Block | Responsibility |
|---|---|---|
| `DDS_MAP` (state) | SCRIPT 900 | DDS_MAP state + Cytoscape style definition |
| `DDS_MAP` (load) | SCRIPT 1000 | loadMap, fitMap, runLayout |
| `DDS_MAP` (style) | SCRIPT 1050 | Tag colors, legend overlay, node icon rendering |
| `DDS_MAP` (CTT) | SCRIPT 1055 | CTT line HTML overlay |
| `DDS_SWIMLANES` | SCRIPT 1100 | Swim-lane overlay + pan/zoom sync |
| `DDS_SWIMLANE_GROUP` | SCRIPT 1150 | Swim-lane grouping logic |
| `DDS_LAYOUT` | SCRIPT 1250 | Node placement algorithm |
| `DDS_MAP_UI` | SCRIPT 1200 | Map tabs, map management, toolbar |
| `DDS_NODE_UI` | SCRIPT 1300 | Node creation modal |
| `DDS_FLOW_UI` | SCRIPT 1400 | Flow creation handle + rerouting |
| `DDS_PANEL` | SCRIPT 1500 | Side panel controller |
| `DDS_PANEL` (demand) | SCRIPT 1505 | SKU demand sub-section in node panel |
| `DDS_ELEMENTS` | SCRIPT 2000 | Add/remove elements from map |
| `DDS_ELEMENTS_UI` | SCRIPT 2100 | Elements panel UI + events |
| `DDS_REMOVE` | SCRIPT 2050 | Remove modal (map-only or full delete) |
| `DDS_NODES_UI` | SCRIPT 1750 | Node table view |
| `DDS_FLOWS_UI` | SCRIPT 1760 | Flow table view |
| `DDS_PRODUCTS_UI` | SCRIPT 1700 | Product table view |
| `DDS_BOMS_UI` | SCRIPT 1900 | BOMs table view |
| `DDS_DEMANDS_UI` | SCRIPT 1770 | Demand table view |
| `DDS_ANNOTATIONS_UI` | SCRIPT 1780 | Annotations table view |
| `DDS_NOTES_UI` | SCRIPT TBD | Notes panel below the canvas (FEAT-002) |
| `DDS_SETTINGS_UI` | SCRIPT 2600 | Settings tab |

---

## 4. Data Model

The project is held entirely in memory as a single JSON object. It contains named arrays for the functional and presentation layers.

See **[DDScope_DataModel.md](DDScope_DataModel.md)** for the full table catalogue, entity field definitions, cascade rules, file format, and runtime defaults.

---

## 5. Persistence

### 5.1 In-memory store — DDS_STORE

`DDS_STORE` is the raw data access layer. It exposes a synchronous CRUD API and is schema-agnostic — it does not know the list of tables. Tables are created on first access.

**Write access rules:**
- UI modules write through helper modules (legacy domains) or `DDS_CMD` (notes domain).
- Helper modules call `DDS_ACTIONS.execute()` for all functional writes.
- `DDS_CMD` wraps `DDS_TRANSACTIONS.begin/commit/rollback` and calls `DDS_STORE` directly.
- `DDS_ACTIONS` calls `DDS_STORE.insert/update/remove` (simple ops) or `DDS_MODEL.*` (cascade ops).
- AI modules (`DDS_AI`, `DDS_AI_UI`) call `DDS_ACTIONS.execute()` directly.
- Presentation layer modules manage `map_*` tables directly via `DDS_STORE` — the only exception.
- `DDS_STORE.query` is unrestricted — any module may read any table.

### 5.2 File persistence

The project is persisted as a single `.json` file on the consultant's machine. No server, no database, no network dependency.

| Operation | Chrome / Edge | Other browsers |
|---|---|---|
| **Load** | `showOpenFilePicker()` — File System Access API | `<input type="file">` |
| **Save** | Write directly to the open file (`FileSystemWritableFileStream`) | Download (`<a download>`) |
| **Save As** | `showSaveFilePicker()` — new file | Download |

### 5.3 Auto-reopen (Chrome / Edge only)

The `FileSystemFileHandle` of the last open file is persisted in IndexedDB. On boot, DDScope checks whether the permission is already granted. If so, the file is reopened automatically with no user interaction. If the handle exists but permission has not been granted (e.g. after a browser restart), a prompt is triggered on the first user gesture.

### 5.4 Dirty state

`DDS.state.dirty` is set to `true` on any `insert`, `update`, `remove`, or explicit `DDS_STORE.markDirty()` call. A bullet indicator (`•`) is appended to the project name in the navigation bar, and the **Save** button becomes active. Reset to `false` on Load, Save, Save As, new project creation, and auto-reopen.

---

## 6. Obsolete Patterns

Patterns that have been superseded. Do not use in any new code.

| Pattern | Replaced by | Details |
|---|---|---|
| `skip_in_layout` on `map_flows` | `layout_offset: 0` | Old boolean field; `layout_offset` is the authoritative control |
| CommWise DataStore as persistence layer | File System Access API + `DDS_STORE` | DDScope persists to a local JSON file. DataStore is not used. |
| Sequential `insert()` loops | Batch inserts with `inserted_ids` for ID remapping | Sequential inserts across related tables fail to remap foreign keys correctly. |
| Helper + DDS_ACTIONS pattern for new domains | `DDS_CMD.execute()` | New domains use DDS_CMD directly — no helper, no DDS_ACTIONS. |

---

*b2wise — Confidential*
