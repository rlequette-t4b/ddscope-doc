# src/

DDScope JavaScript modules synchronized with CommWise SCRIPT blocks. These files are the inputs for Vitest unit tests and local development of the modules. They are also naintained from an other place. Commwise is the source of truth so care must be taken to coordinate update.

---

## What lives here

Each file mirrors a single CommWise SCRIPT block and exposes the module as a default export:

```
src/DDS_DURATION.js    ← CommWise SCRIPT 1650
src/DDS_COLORS.js      ← CommWise SCRIPT 105
src/DDS_STORE.js       ← CommWise SCRIPT 150
...
```

The authoritative list of all modules, their block addresses, and their testability classification is in [`docs/DDScope_Modules.md`](../docs/DDScope_Modules.md).

---

## How files move — AI-assisted pull and push

Files in this folder are synchronized by the AI assistants in VS Code through the CommWise MCP connection.

- `PULL` means extracting a module from CommWise into `src/`.
- `PUSH` means exporting a corrected module from this repository back to CommWise.

For push operations, always follow the dedicated workflow in [`docs/DDScope_CommWise_Push_Workflow.md`](../docs/DDScope_CommWise_Push_Workflow.md).

**No manual copy-paste or script is needed.**

### To extract a module, just ask:

> *"Extract DDS_DURATION from CommWise into src/"*
> *"Extract all testable modules from CommWise"*

### To refresh an existing extraction, just ask:

> *"Refresh DDS_DURATION from CommWise"*
> *"Re-extract DDS_COLORS from CommWise and overwrite src"*

For pull operations, the AI assistant will:
1. Look up the module in `docs/DDScope_Modules.md` (block position, global name, file path, testability).
2. Skip modules with `testability: render-dependent` or `out-of-scope`.
3. Fetch the block from CommWise (`commwise_get_block`, appID `22645`, code_type `script`).
4. Verify the block title starts with `JS: DDS_` — abort if not.
5. Read current app metadata/version from CommWise for traceability.
6. Append `export default <GLOBAL>;` for ESM compatibility with Vitest.
7. Write (or overwrite) the file in `src/`.
8. Update the tracking table in this file with `Last operation = PULL`, operation date/time, CommWise app version, and CommWise revision id (`#xxxxx`).

For push operations, follow the push workflow document and then update the same table with `Last operation = PUSH` using the verified push metadata.

### Prerequisite

The AI assistant must be connected to the CommWise MCP server in VS Code. Verify via the tools panel — the CommWise server should show as connected.

---

## File format

Every file in `src/` follows this structure:

```javascript
// CommWise block content — IIFE exposing a global
var DDS_DURATION = (function () {
  // ...
  return api;
}());

// ESM export appended during extraction — do not remove
export default DDS_DURATION;
```

Do not edit the body of these files for production fixes without a controlled sync workflow. If a fix is needed:
1. Correct the file locally.
2. Use the push workflow in `docs/DDScope_CommWise_Push_Workflow.md` to export safely to CommWise.
3. Re-extract here to confirm parity.

---

## Operation Tracking

After **every pull or push**, this table must be updated immediately with:
- dirty status (`YES` if local changes are pending push, `NO` if synced)
- last operation (`PULL` or `PUSH`)
- operation timestamp
- CommWise app version used for that operation
- CommWise revision id used for that operation

Dirty status workflow:
1. Set `Dirty = YES` when a module is modified locally and not yet exported to CommWise.
2. Keep `Dirty = YES` until push is completed and verified.
3. Set `Dirty = NO` immediately after a successful and verified push.
4. A generic "push" request should target only rows where `Dirty = YES`.

How to check if a local module is up to date:
1. Compare module row value in **Revision** with current revision id in CommWise.
2. If revision differs, run a new synchronization operation for the module.
3. **App version** is informational only and must not be used as the freshness gate.

| File | CommWise block | Testability | Dirty | Last operation | Date | App version | Revision |
|---|---|---|---|---|---|---|---|
| `DDS_DURATION.js` | SCRIPT 1650 | pure | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_COLORS.js` | SCRIPT 105 | pure | NO | PULL | 2026-05-23 10:45:08 | v100 | #23900 |
| `DDS_STORE.js` | SCRIPT 150 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_ACTIONS.js` | SCRIPT 1850 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_MODEL.js` | SCRIPT 1550 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_BOMS.js` | SCRIPT 1800 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_NODES.js` | SCRIPT 1560 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_PRODUCTS.js` | SCRIPT 1610 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_FLOWS.js` | SCRIPT 1620 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_SKUS.js` | SCRIPT 1630 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_DEMANDS.js` | SCRIPT 1660 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_LANES.js` | SCRIPT 1640 | store-dependent | NO | PULL | 2026-05-23 10:34:01 | v101 | #23899 |
| `DDS_TRANSACTIONS.js` | SCRIPT 1860 | store-dependent | YES | PULL | 2026-05-23  | v101 | #local-stub |

*b2wise — Confidential*
