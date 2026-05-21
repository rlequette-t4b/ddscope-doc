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

The AI assistant will:
1. Look up the module in `docs/DDScope_Modules.md` (block position, global name, file path, testability).
2. Skip modules with `testability: render-dependent` or `out-of-scope`.
3. Fetch the block from CommWise (`commwise_get_block`, appID `22645`, code_type `script`).
4. Verify the block title starts with `JS: DDS_` — abort if not.
5. Append `export default <GLOBAL>;` for ESM compatibility with Vitest.
6. Write (or overwrite) the file in `src/`.

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

| File | CommWise block | Testability |
|---|---|---|
| `DDS_DURATION.js` | SCRIPT 1650 | pure |

*b2wise — Confidential*
