## Language

All documentation and code comments must be written in English, unless the user explicitly requests otherwise. The user prefers French for conversation and is fluent in English.

# DDScope — Claude Code Context

> This file is the primary context for Claude Desktop working in this repository.
> Keep it up to date. When something important is learned in a session, add it here.

---

## 1. Project Identity

**DDScope** is a CommWise web application built by b2wise. It supports DDMRP scoping workshops — consultants use it to build supply chain maps capturing current-state structure before buffer design begins.

- **CommWise app ID:** 22645
- **CommWise connector:** C3
- **CommWise URL slug:** `mcp-c3-ddscope`
- **Domain:** b2wise / DDMRP (DDOpt, buffer positioning, Supply Chain Mapping & VSM methodology)
- **Single-user.** No concurrent editing. No server. No database.

---

## 2. Stack

| Concern | Solution |
|---|---|
| Platform | CommWise Web App (single-page) |
| Persistent storage | Local JSON file — `DDS_STORE` in-memory + File System Access API |
| Map rendering | Cytoscape.js v3.33.1 |
| Swim-lane rendering | HTML overlay divs (not Cytoscape compounds) |
| Auto-layout | Custom BFS ranking per swim-lane |
| Layout plugin | Dagre v0.8.5 |
| Module prefix | `DDS_` (global JS objects, one per CommWise SCRIPT block) |

---

## 3. Repository Structure

This repo is the **single working environment** — design, documentation, code, and tests all live here.

```
docs/               # All documentation — flat, no sub-folders
src/                # Extracted functional modules (mirror of CommWise SCRIPT blocks)
tests/              # Vitest unit tests + Playwright e2e specs
fixtures/           # JSON project files for automated tests
samples/            # Realistic DDScope projects for demos and manual testing
shims/              # Minimal stubs for CommWise/browser globals (Node.js compat)
```

**Sources of truth:**
- **Documentation** → `docs/` in this repo (GitHub)
- **Application code** → CommWise (app ID 22645)

---

## 4. Key Documentation Pointers

Read these before working on any feature area:

| Document | Scope |
|---|---|
| `docs/DDScope_Overview.md` | Product purpose, scope v1/v2, constraints |
| `docs/DDScope_DataModel.md` | All entities, fields, cascade rules |
| `docs/DDScope_Architecture.md` | Layered architecture, persistence pattern |
| `docs/DDScope_Modules.md` | Module registry — APIs, deps, testability |
| `docs/DDScope_Presentation.md` | map_* logic, layout algorithms, DI contract |
| `docs/DDScope_AI_Assistant.md` | Embedded AI assistant RFC |
| `docs/DDScope_Actions.md` | AI action vocabulary |
| `docs/DDScope_Rendering.md` | Cytoscape canvas, overlays, ghost nodes, styles |
| `docs/DDScope_UI.md` | UI implementation details |
| `docs/DDScope_UndoRedo.md` | Transaction pattern, call site inventory |
| `docs/DDScope_TestEnvironment.md` | Repo conventions, Vitest/Playwright setup, extraction workflow |

---

## 5. CommWise MCP — Operational Patterns

### Session lifecycle
Every write operation requires an open session:
```
commwise_start_session  →  write calls (pass session_id)  →  last write includes create_revision: true
```

Final write must include:
```json
{ "create_revision": true, "metadata": { "release_notes": "...", "append_release_notes": true } }
```

### Reading blocks
```
commwise_get_block  with  code_type: 'script'  +  position: <integer>
```

### Editing — preferred: `commwise_replace_text`
- `find_text` must match source **exactly** (indentation + surrounding context)
- Fails silently when `find_text` exceeds ~5000 characters → fall back to `commwise_update_block` with full `code` string
- **CRITICAL — regex and `\n`:** CommWise interprets `\n` in `replace_text` payloads as real newlines. JS regex literals containing `\n` are corrupted on write. Solution: decompose the regex or build via `new RegExp()` with `'\\n'` as a string — never a literal `\n` inside a regex pattern passed via `commwise_replace_text`.

### Fallback: `commwise_update_block`
Full code replacement only — no partial find/replace.

### Inserting blocks
`commwise_insert_block` uses a `block` dict with keys: `title`, `comment`, `code`.
Run `commwise_list_blocks` with `section_filter` before inserting to detect position conflicts.

### Disabled buttons — nav bar
The CommWise platform applies `visibility: hidden` on all disabled buttons via a high-specificity global rule. Class-level overrides (`.dds-btn-ghost:disabled`) are insufficient.
**Only reliable fix:** target by ID with `visibility: visible !important` + `display: inline-flex !important` on both normal and `:disabled` states.
Model: `#dds-btn-save` in STYLE 300. Apply this pattern to every new nav button.

---

## 6. Module Pull / Push Workflow

`src/` contains extracted CommWise modules for unit testing and local debugging. CommWise is always the source of truth for code.

### Pull (extract or refresh)

Ask: *"Extract DDS_STORE from CommWise into src/"* or *"Refresh DDS_ACTIONS"*

Steps:
1. Look up the module in `docs/DDScope_Modules.md` — get block position and testability.
2. Skip `render-dependent` and `out-of-scope` modules.
3. `commwise_get_block` with `appID: 22645`, `code_type: 'script'`, `position: <N>`.
4. Verify block title starts with `JS: DDS_` — abort if not.
5. Append `export default <GLOBAL>;` for ESM compatibility.
6. Write to `src/<MODULE>.js`.
7. Update tracking table in `src/README.md`: `PULL`, timestamp, app version, revision ID.

### Push (export corrected module to CommWise)

Ask: *"Push DDS_STORE to CommWise"*

**Eligibility:** only `pure` or `store-dependent` modules. Never push `render-dependent` modules from this repo.

Steps:
1. Look up module in `docs/DDScope_Modules.md` — confirm eligibility.
2. `commwise_get_block` — fetch current live block, confirm intended diff.
3. `commwise_start_session` — open a write session.
4. Strip `export default <GLOBAL>;` from the push payload (extraction-only line).
5. `commwise_update_block` with `create_revision: true`, `append_release_notes: true`.
6. Re-fetch and verify exact content match.
7. Update tracking table in `src/README.md`: `PUSH`, timestamp, app version, revision ID.
8. Re-extract into `src/` to confirm parity.

---

## 7. Critical Bugs and Patterns

### Bug — drag corruption after `loadMap()` / `runLayout()`
**Never call `loadMap()` or `runLayout()` inside a Cytoscape event handler** (`select`, `tap`, `dragfree`, etc.) **or via `setTimeout(0)`.**
Calling `loadMap()` (remove + add elements) during an active Cytoscape event corrupts drag state.
Safe contexts: project open, map switch only.

### Persistence — File System Access API (not DataStore)
DDScope persists to a **local JSON file** via the File System Access API. `DDS_STORE` is the in-memory layer. **CommWise DataStore is not used as a persistence layer.** Any reference to DataStore as primary storage is obsolete.

### Obsolete patterns — do not use
- `skip_in_layout` on `map_flows` — replaced by `layout_offset`
- CommWise DataStore as persistence layer
- Sequential `insert()` loops (batch inserts per table instead, using `inserted_ids` for ID remapping)

### AI proxy — CommWise secure request
Direct Anthropic API calls are CORS-blocked. Use:
```javascript
commwiseConfigClient.secureRequest('C3', 'CLAUDE', {
  method: 'POST',
  endpointSuffix: 'v1/messages',
  headers: { 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: { ... }
})
```

---

## 8. Architecture Rules (Non-Negotiable)

- **No layer may depend on a layer above it.**
- **UI writes only via helpers** (`DDS_NODES`, `DDS_PRODUCTS`, `DDS_FLOWS`, etc.) — never direct `DDS_ACTIONS.execute()` or `DDS_STORE` calls from UI modules.
- **AI writes directly via `DDS_ACTIONS.execute()`** — bypasses helpers.
- **`DDS_ACTIONS.execute()` is synchronous.** No Promise, no async/await.
- **One transaction per user interaction** — `DDS_TX_HELPER.run(label, fn, onSuccess?)`. No multiple `begin()` calls for a single user gesture.
- **Reads are unrestricted** — any module may call `DDS_STORE.query` on any table.

---

## 9. UI Conventions

### Modal pattern
Opacity/visibility + `.visible` class (not `display: none`). `overflow: hidden` on modal container. Scroll on `.modal-body` only.

### Typography
Centralized in STYLE 200 via CSS variables:
- `--dds-text-base` 16px
- `--dds-text-sm` 13px
- `--dds-text-xs` 12px
- `--dds-text-lg` 18px

---

## 10. Working Conventions

- **Validate scope before implementing.** Explain what will be built and wait for confirmation before writing any code or CommWise edit.
- **Surgical edits preferred.** Use `commwise_replace_text` over full block rewrites when possible.
- **Small patch blocks over large rewrites** when wrapping or extending existing functionality.
- **No unsolicited UI additions.** Propose first, implement only when confirmed.
- **Code in English.** Comments in English. Discussion in French.
- **Release notes in French** (CommWise revision metadata).
- **Document significant decisions** in the relevant `docs/` file — especially the *why*, not just the *what*.

---

## 11. Module Testability Classes

| Class | Condition | Test layer |
|---|---|---|
| `pure` | No DOM, no Cytoscape, no globals beyond window shim | Vitest — no setup |
| `store-dependent` | Uses `DDS_STORE` / `DDS` state, no rendering | Vitest — store + DDS shim |
| `render-dependent` | Requires Cytoscape canvas or DOM layout | Playwright |
| `out-of-scope` | File System Access API, CommWise internals | Manual only |

Before creating any test, verify whether the scenario requires a prepared project state (fixture). If so, discuss the strategy before implementing.

---

## 12. Memory Protocol

When a session produces a new pattern, bug discovery, or architectural decision worth keeping:

> "Mémorise ça dans CLAUDE.md"

Claude Desktop updates this file directly. Commit the change as part of the session.

---

*b2wise — Confidential*
