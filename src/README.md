# src/

DDScope JavaScript modules extracted from CommWise SCRIPT blocks. These files are the inputs for Vitest unit tests and local debugging of non-UI modules. CommWise is the source of truth — `src/` is a synchronized working copy.

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

## How files move — AI-assisted pull and push via Claude Desktop

Files in this folder are synchronized by Claude Desktop through the CommWise MCP connection.

- **PULL** — extracting a module from CommWise into `src/`.
- **PUSH** — exporting a corrected module from `src/` back to CommWise.

**No manual copy-paste or script is needed.**

### To pull (extract or refresh a module):

> *"Extract DDS_DURATION from CommWise into src/"*
> *"Refresh DDS_COLORS from CommWise"*
> *"Extract all testable modules from CommWise"*

Claude will:
1. Look up the module in `docs/DDScope_Modules.md` (block position, global name, testability).
2. Skip modules with `testability: render-dependent` or `out-of-scope`.
3. Fetch the block from CommWise (`commwise_get_block`, appID `22645`, code_type `script`).
4. Verify the block title starts with `JS: DDS_` — abort if not.
5. Append `export default <GLOBAL>;` for ESM compatibility with Vitest.
6. Write (or overwrite) the file in `src/`.
7. Update the tracking table below with `Last operation = PULL`, timestamp, app version, and revision ID.

### To push (export a corrected module to CommWise):

> *"Push DDS_STORE to CommWise"*

Claude will:
1. Look up the module in `docs/DDScope_Modules.md` — confirm `testability` is `pure` or `store-dependent`.
2. Fetch the current live block from CommWise and confirm the intended diff.
3. Start a CommWise session (`commwise_start_session`).
4. Strip the extraction-only line (`export default <GLOBAL>;`) from the push payload.
5. Update the block with `create_revision: true` and `append_release_notes: true`.
6. Re-fetch the updated block and verify exact content match.
7. Update the tracking table below with `Last operation = PUSH`, timestamp, app version, and revision ID.

**Push eligibility:** only modules with `testability: pure` or `store-dependent` in `DDScope_Modules.md`. Never push `render-dependent` modules from this repo.

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

If a fix is needed:
1. Correct the file locally.
2. Ask Claude Desktop to push it to CommWise.
3. Claude re-extracts here to confirm parity.

---

## Operation Tracking

After **every pull or push**, this table must be updated immediately.

**Dirty status:**
- `YES` — local changes pending push to CommWise.
- `NO` — in sync with CommWise.
- `NEW` — created locally this session, not yet pushed to CommWise.

**Freshness check:** compare `Revision` with the current revision ID in CommWise. If different, re-extract.

| File | CommWise block | Testability | Dirty | Last operation | Date | App version | Revision |
|---|---|---|---|---|---|---|---|
| `DDS_DURATION.js` | SCRIPT 1650 | pure | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_COLORS.js` | SCRIPT 105 | pure | NO | PULL | 2026-05-23 | v100 | #23900 |
| `DDS_STORE.js` | SCRIPT 150 | store-dependent | NO | PULL | 2026-05-24 | v100 | #23962 |
| `DDS_ACTIONS.js` | SCRIPT 1850 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_MODEL.js` | SCRIPT 1550 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_BOMS.js` | SCRIPT 1800 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_NODES.js` | SCRIPT 1560 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_PRODUCTS.js` | SCRIPT 1610 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_FLOWS.js` | SCRIPT 1620 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_SKUS.js` | SCRIPT 1630 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_DEMANDS.js` | SCRIPT 1660 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_LANES.js` | SCRIPT 1640 | store-dependent | NO | PULL | 2026-05-23 | v101 | #23899 |
| `DDS_TOOLS.js` | SCRIPT 40 | pure | NO | PULL | 2026-05-23 | v100 | #23909 |
| `DDS_TRANSACTIONS.js` | SCRIPT 1860 | store-dependent | NO | PUSH | 2026-05-24 | v100 | #23913 |
| `DDS_TX.js` | SCRIPT 1865 | pure | NEW | — | 2026-05-25 | — | — |
| `DDS_CMD.js` | SCRIPT 1875 | store-dependent | NEW | — | 2026-05-25 | — | — |

*b2wise — Confidential*
