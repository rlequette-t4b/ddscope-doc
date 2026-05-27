# DDScope — Test Environment
*v0.10 — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial bootstrap reference |
| 0.2 | May 2026 | DDScope_Modules.md introduced as module registry; module table and testability classification moved there; this doc references it |
| 0.3 | May 2026 | Module extraction moved to AI-assisted workflow (Claude + CommWise MCP); scripts/ folder removed |
| 0.4 | May 2026 | Test mode and Playwright loading backdoor documented (Axe 2) |
| 0.5 | May 2026 | DDS_ACTIONS added to module boundaries; DDS_AI_EXECUTOR removed |
| 0.6 | May 2026 | Unified environment: DEV/TEST split removed; Claude Desktop replaces VS Code extension and Copilot; Slack removed from scope |
| 0.7 | May 2026 | Pull/Push workflow consolidated here (was split between CLAUDE.md and Module Extraction Workflow); CLAUDE.md now points here |
| 0.8 | May 2026 | src/README.md tracking rule made mandatory for all agents — update after every local change to src/ |
| 0.9 | May 2026 | Manual UI test tracker added — docs/DDScope_TestUI.md |
| 0.10 | May 2026 | DDScope_TestUI.md and DDScope_TestUI_watcher.md moved from tests/ to docs/ |

---

## Purpose

This document defines the architecture and conventions for the DDScope test environment. It serves as the bootstrap reference for the GitHub repository and the working agreement for the AI assistant (Claude Desktop).

The environment covers three concerns:
- **Functional testing** — unit and integration tests on extracted DDScope JS modules, running locally in Node.js
- **UI testing** — browser-based end-to-end tests against the live CommWise app URL, replayed via Playwright
- **Manual UI testing** — scenario-by-scenario records of UI tests performed during development sessions, tracked in `docs/DDScope_TestUI.md`
- **Ticket integration** — future link between failing tests and issue tracker (Jira or Linear), non-blocking for now

---

## Repository Structure

```
ddscope/
│
├── src/                        ← DDScope modules extracted from CommWise
│   ├── DDS_STORE.js
│   ├── DDS_DURATION.js
│   ├── DDS_ACTIONS.js
│   ├── DDS_AI_CONTEXT.js
│   └── ...
│
├── shims/                      ← Minimal stubs for CommWise/browser globals
│   └── window.js               ← window, document stubs for Node.js compat
│
├── tests/
│   ├── ddscope_tests.db        ← Manual UI test data (SQLite, gitignored)
│   ├── schema.sql              ← DB schema versioned in Git
│   ├── generate_viewer.js      ← Reads DB, generates HTML viewer
│   ├── DDScope_TestUI_viewer.html ← Generated, never edited manually
│   ├── unit/                   ← Pure logic, no DOM, no Cytoscape
│   │   ├── store/
│   │   │   ├── crud.test.js
│   │   │   ├── cascades.test.js
│   │   │   └── dirty-flag.test.js
│   │   ├── duration/
│   │   │   └── duration.test.js
│   │   └── actions/
│   │       ├── execute.test.js
│   │       ├── describe.test.js
│   │       ├── new-id-resolution.test.js
│   │       └── vocabulary.test.js
│   │
│   └── ui/                     ← Playwright, targets CommWise URL
│       ├── map/
│       │   ├── node-drag.spec.js
│       │   └── flow-creation.spec.js
│       ├── panels/
│       │   └── node-panel.spec.js
│       └── auth/
│           └── .auth/          ← Playwright storageState (gitignored)
│
├── docs/                       ← DDScope design documentation (source of truth)
│   ├── DDScope_TestUI.md       ← Manual UI test tracker protocol
│   ├── DDScope_TestUI_watcher.md ← Auto-watcher VS Code task
│   └── ...
│
├── fixtures/                   ← JSON inputs for automated tests (Vitest + Playwright)
│   ├── README.md
│   ├── project-empty.json
│   ├── project-minimal.json
│   ├── project-full.json
│   ├── project-partial-fields.json
│   └── project-edge-cases.json
│
├── samples/                    ← DDScope project catalogue
│   ├── README.md
│   └── ...
│
├── CLAUDE.md                   ← Behavioral instructions for Claude Desktop
├── .env.example
├── playwright.config.js
├── vitest.config.js
└── package.json
```

---

## Manual UI Test Tracker

Manual UI tests are tracked via **`tests/ddscope_tests.db`** (SQLite). The protocol document is **`docs/DDScope_TestUI.md`**. Each scenario has linked issues (bugs or improvements) — the scenario status is calculated automatically from the issue statuses. The tracker serves as:

- A non-regression reference — before shipping a feature, re-run the scenarios listed for that area.
- An input for Playwright authoring — scenarios with no Playwright coverage are candidates for automation.

When completing a development session that includes manual UI testing, update the SQLite DB and regenerate the HTML viewer (`node tests/generate_viewer.js`).

---

## Documentation (`docs/`)

`docs/` contains the DDScope design documents. It is the single source of truth for all specifications. All documents are flat in `docs/` — no sub-folders.

When a spec document is updated, commit it to `docs/` immediately. Claude Desktop reads these files directly via the filesystem MCP.

---

## Module Registry

**[DDScope_Modules.md](DDScope_Modules.md) is the authoritative source** for all `DDS_*` module definitions. It records:

- CommWise block address (`code_type` + `position`) for extraction
- Public API surface
- Runtime dependencies
- Testability classification
- Extraction contract status (`met` / `partial` / `unverified` / `not-met`)

After extracting and testing a module, update its entry to reflect actual dependencies found and current test coverage status.

### Testability classification

| Class | Condition | Test layer |
|---|---|---|
| `pure` | No DOM, no Cytoscape, no globals beyond window shim | Vitest — no setup |
| `store-dependent` | Uses `DDS_STORE` / `DDS` state, no rendering | Vitest — store + DDS shim required |
| `render-dependent` | Requires Cytoscape canvas or DOM layout | Playwright |
| `out-of-scope` | File System Access API, IndexedDB, CommWise internals | Manual only |

### Store-dependent test setup

```javascript
// shims/window.js loaded first, then:
import '../src/DDS_STORE.js'; // loads DDS_STORE on globalThis
// DDS.state.project must be initialised before each test
```

> **Prerequisite:** `DDS_STORE` must complete the DOM isolation refactor (see `DDScope_Modules.md` — Refactor Notes) before store-dependent tests can run without a DOM shim.

---

## Module Pull/Push Workflow

Module synchronisation between CommWise (source of truth) and `src/` is AI-assisted via Claude Desktop.

### Module organisation conventions

- JS global: `DDS_<MODULE>` (e.g. `DDS_STORE`, `DDS_DURATION`)
- CommWise block title: `JS: DDS_<MODULE> — <one-line description>`
- Extracted file: `src/DDS_<MODULE>.js`

### Pull — extract or refresh a module

Ask Claude Desktop: *"Extract DDS_STORE from CommWise into src/"* or *"Refresh DDS_ACTIONS"*

Steps:
1. Look up the module in `DDScope_Modules.md` — get block position and testability class.
2. Skip `render-dependent` and `out-of-scope` modules.
3. Call `commwise_get_block` with `appID: 22645`, `code_type: 'script'`, `position: <N>`.
4. Verify the block title starts with `JS: DDS_` — abort if not.
5. Append `export default <GLOBAL>;` for ESM compatibility.
6. Write to `src/<MODULE>.js`.
7. Update tracking table in `src/README.md`: direction `PULL`, timestamp, app version, revision ID.

### Push — export a corrected module to CommWise

Ask Claude Desktop: *"Push DDS_STORE to CommWise"*

**Eligibility:** only `pure` or `store-dependent` modules. Never push `render-dependent` modules from this repo.

Steps:
1. Look up module in `DDScope_Modules.md` — confirm eligibility.
2. `commwise_get_block` — fetch current live block, confirm the intended diff.
3. `commwise_start_session` — open a write session.
4. Strip `export default <GLOBAL>;` from the payload (extraction-only line).
5. `commwise_update_block` with `create_revision: true`, `append_release_notes: true`.
6. Re-fetch and verify exact content match.
7. Update tracking table in `src/README.md`: direction `PUSH`, timestamp, app version, revision ID.
8. Re-extract into `src/` to confirm parity.

### Mandatory tracking rule — applies to all agents

**After any local change to a file in `src/`** (creation, modification, or deletion), immediately update the tracking table in `src/README.md`:

| Situation | Dirty status | Action |
|---|---|---|
| New file created locally, not yet in CommWise | `NEW` | Set date = today, leave revision blank |
| Existing file modified locally | `YES` | Set date = today |
| File successfully pushed to CommWise | `NO` | Set app version and revision ID |
| File pulled from CommWise | `NO` | Set app version and revision ID |

This rule applies regardless of how minor the change is. The tracking table in `src/README.md` is the only reliable indicator of what is in sync with CommWise — an outdated table misleads any agent starting a new session.

### Module boundaries

| Module | Responsibility | Testability |
|---|---|---|
| `DDS_STORE` | In-memory CRUD, dirty flag, ID counters, file persistence | store-dependent (after DOM refactor) |
| `DDS_DURATION` | Duration arithmetic and formatting | pure |
| `DDS_ACTIONS` | Action execution + new_* resolution + vocabulary | store-dependent |
| `DDS_AI_CONTEXT` | Project → Claude context JSON serialisation | store-dependent |
| `DDS_JSON` | Project import with copy modes + ID remapping | store-dependent |
| `DDS_PRODUCTS` | Product CRUD + SKU cascade | store-dependent |
| `DDS_BOMS` | BOM CRUD + cascade | store-dependent |
| `DDS_DEMANDS` | Demand CRUD + map_demands + cascade | store-dependent |
| `DDS_TX` | Transaction label catalogue | pure |
| `DDS_CMD` | Unified command layer — notes domain | store-dependent |

Render-dependent modules (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_LAYOUT`, all `*_UI` modules) are out of scope for unit testing.

---

## Axe 1 — Functional Tests (Vitest + Node.js)

### Principle

DDScope logic modules (store, duration, actions) are extracted from CommWise SCRIPT blocks and run as plain JS in Node.js. Vitest is the test runner — fast, native ESM, with a first-class VS Code extension.

### Module extraction

CommWise SCRIPT blocks expose modules as browser globals:

```javascript
window.DDS_STORE = (function () { ... })();
```

To make these modules runnable in Node.js, a minimal `shims/window.js` stub is imported at the top of each test file:

```javascript
// shims/window.js
globalThis.window = globalThis;
globalThis.document = { ... }; // only what DDS_STORE actually touches
```

Modules that depend heavily on Cytoscape or the DOM are out of scope for unit testing — they belong in the UI test layer.

### What to test

Prioritisation follows the testability classification in `DDScope_Modules.md`. Modules with `pure` or `store-dependent` classification and `contract: met` are the first extraction targets.

| Module | Test scope |
|---|---|
| `DDS_STORE` | CRUD operations, ID auto-increment, cascade rules (node → flows → SKUs → demands → BOMs), dirty flag, counter seeding on load |
| `DDS_DURATION` | `toHours`, `compare`, `toDisplay` for all unit combinations |
| `DDS_ACTIONS` | `execute`: empty plan, unknown action rejection, `new_*` resolution across action fields, mid-plan failure reporting. `describe`: `new_*` label from plan, real ID from store, unknown action fallback. `ACTIONS`: all known actions present, required/optional fields match spec. `getVocabularyText`: non-empty, contains all action names |
| `DDS_CMD` | Note categories and notes CRUD, map_notes cascade, MAP_DELETE cascade, undo/redo |
| Serialization | Round-trip: `buildProjectJson` → `importProjectFromJson` → state equality; partial files; ID remapping on duplicate |

### Fixture files

`fixtures/` contains `.json` project files consumed by automated tests (Vitest and Playwright). Each file is named after the scenario it covers. Naming convention: `project-{scenario}.json`. Fixtures are committed and versioned — they are the regression baseline.

### Sample projects

`samples/` is a centralised catalogue of realistic DDScope projects for demos, manual feature testing, and onboarding. Each file is described in `samples/README.md`.

### Running tests

```bash
npx vitest          # watch mode
npx vitest run      # single pass (CI)
npx vitest --ui     # browser UI (Vitest UI)
```

---

## Axe 2 — UI Tests (Playwright)

### Principle

Playwright tests target the live CommWise DDScope URL directly. No mock server, no local rendering. The browser is Chrome.

Authentication state is saved once via `playwright/auth/setup.spec.js` and reused across all tests via `storageState` — no re-login per test run.

### Configuration

```javascript
// playwright.config.js
export default {
  use: {
    baseURL: process.env.DDSCOPE_URL,
    storageState: 'tests/ui/auth/.auth/user.json',
    channel: 'chrome',
  },
  projects: [
    { name: 'setup', testMatch: '**/auth/setup.spec.js' },
    {
      name: 'ddscope',
      dependencies: ['setup'],
      testDir: 'tests/ui',
    },
  ],
};
```

### Test mode and loading backdoor

Playwright tests cannot use the Open button (File System Access API — native browser dialog, blocked by the browser driver). DDScope exposes a backdoor activated by a query parameter instead.

**Activation:** launch the app with `?dds_test=1` in the URL.

**Exposed function:** `window.__playwright_load_project__(jsonString)` — receives a JSON string, loads the project into memory, resets the AI assistant, and opens the project exactly as the Open button would.

**Usage pattern in Playwright specs:**

```javascript
const url = process.env.DDSCOPE_URL + '?dds_test=1';
await page.goto(url);

await page.waitForFunction(() => typeof window.__playwright_load_project__ === 'function');

const json = fs.readFileSync('fixtures/project-minimal.json', 'utf-8');
await page.evaluate((j) => window.__playwright_load_project__(j), json);
```

**Security:** the backdoor is only instantiated when `?dds_test=1` is present in the URL at load time. In normal production use, neither function exists.

### Actions backdoor — `__playwright_run_actions__`

A second function is exposed in test mode to exercise `DDS_ACTIONS.execute()` directly without going through the AI assistant flow.

```javascript
const result = await page.evaluate(
  actions => window.__playwright_run_actions__(actions),
  [
    { type: 'add_node', id: 'new_node_1', name: 'Fournisseur A' },
    { type: 'add_swim_lane', id: 'new_lane_1', name: 'Sourcing' },
    { type: 'assign_node_to_lane', node_id: 'new_node_1', swim_lane_id: 'new_lane_1' }
  ]
);
// result.applied → array of applied actions
// result.failed  → null on success, or the action that failed
```

### What to test

Priority is on interactions that are difficult to cover with unit tests:

- Node creation, drag, and position persistence
- Flow creation by drag handle
- Flow rerouting (blue/purple endpoint handles)
- Waypoint handle drag and reset
- Swim-lane drag, snap, and grouping
- Side panel: tag edit → immediate color update on canvas
- Remove modal: map-only vs full delete
- Auto-layout and fit-to-canvas
- Map tab switch and canvas state reload
- Save button state (enabled / disabled)

### Auth setup (one-time)

```bash
npx playwright test --project=setup
```

This writes `tests/ui/auth/.auth/user.json` (gitignored). Subsequent runs reuse it.

---

## Axe 3 — Ticket Integration (Future)

Non-blocking. Placeholder convention for now — annotate tests with a ticket reference in the test title:

```javascript
test('[DDS-42] cascade: delete_node removes all dependent flows', () => { ... });
```

---

## Environment Variables

```bash
# .env (gitignored)
DDSCOPE_URL=https://...   # full CommWise app URL
```

`.env.example` is committed with placeholder values.

---

*b2wise — Confidential*
