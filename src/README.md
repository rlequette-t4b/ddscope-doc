# src/

DDScope JavaScript modules extracted from CommWise SCRIPT blocks. These files are the inputs for Vitest unit tests.

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

## How files get here — AI-assisted extraction

Files in this folder are extracted by the AI assistant in VS Code directly from CommWise via the CommWise MCP connection. **No manual copy-paste or script is needed.**

### To extract a module, just ask:

> *"Extract DDS_DURATION from CommWise into src/"*
> *"Extract all testable modules from CommWise"*

### To refresh an existing extraction, just ask:

> *"Refresh DDS_DURATION from CommWise"*
> *"Re-extract DDS_COLORS from CommWise and overwrite src"*

The AI assistant will:
1. Look up the module in `docs/DDScope_Modules.md` (block position, global name, file path, testability).
2. Skip modules with `testability: render-dependent` or `out-of-scope`.
3. Fetch the block from CommWise (`commwise_get_block`, appID `22645`, code_type `script`).
4. Verify the block title starts with `JS: DDS_` — abort if not.
5. Read current app metadata/version from CommWise for traceability.
6. Append `export default <GLOBAL>;` for ESM compatibility with Vitest.
7. Write (or overwrite) the file in `src/`.
8. Update the **Currently extracted** table in this file, including extraction date/time, CommWise app version, and CommWise revision id (`#xxxxx`).

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

Do not edit the body of these files for production fixes. If a fix is needed:
1. Correct the file locally for test purposes.
2. Paste the fix into the DEV AI project.
3. DEV applies it to the CommWise block via MCP session.
4. Re-extract here to confirm.

---

## Currently extracted

After **every extraction or refresh**, this table must be updated immediately with:
- extraction timestamp
- CommWise app version used for extraction
- CommWise revision id used for extraction

How to check if a local module is up to date:
1. Compare module row value in **Extracted from revision** with current revision id in CommWise.
2. If revision differs, refresh extraction for the module.
3. **Extracted from app version** is informational only and must not be used as the freshness gate.

| File | CommWise block | Testability | Last extracted (local) | Extracted from app version | Extracted from revision |
|---|---|---|---|---|---|
| `DDS_DURATION.js` | SCRIPT 1650 | pure | 2026-05-22 08:30:36 | v100 | #23759 |
| `DDS_COLORS.js` | SCRIPT 105 | pure | 2026-05-22 08:30:36 | v100 | #23759 |
| `DDS_STORE.js` | SCRIPT 150 | store-dependent | 2026-05-22 08:30:36 | v100 | #23759 |
| `DDS_ACTIONS.js` | SCRIPT 1850 | store-dependent | 2026-05-22 13:18:23 | v100 | #23802 |
| `DDS_MODEL.js` | SCRIPT 1550 | store-dependent | 2026-05-22 13:55:07 | v100 | #23809 |

*b2wise — Confidential*
