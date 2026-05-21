# DDScope — Test Environment
*v0.2 — Draft — May 2026*

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial bootstrap reference |
| 0.2 | May 2026 | DDScope_Modules.md introduced as module registry; module table and testability classification moved there; this doc references it |

---

## Purpose

This document defines the architecture and conventions for the DDScope test environment. It serves as the bootstrap reference for the GitHub repository and the shared working agreement between the developer and the AI assistant (Claude in VS Code).

The environment covers three concerns:
- **Functional testing** — unit and integration tests on extracted DDScope JS modules, running locally in Node.js
- **UI testing** — browser-based end-to-end tests against the live CommWise app URL, replayed via Playwright
- **Ticket integration** — future link between failing tests and issue tracker (Jira or Linear), non-blocking for now

---

## Repository Structure

```
ddscope-tests/
│
├── src/                        ← DDScope modules extracted from CommWise
│   ├── DDS_STORE.js
│   ├── DDS_DURATION.js
│   ├── DDS_AI_EXECUTOR.js
│   └── ...
│
├── shims/                      ← Minimal stubs for CommWise/browser globals
│   └── window.js               ← window, document stubs for Node.js compat
│
├── tests/
│   ├── unit/                   ← Pure logic, no DOM, no Cytoscape
│   │   ├── store/
│   │   │   ├── crud.test.js
│   │   │   ├── cascades.test.js
│   │   │   └── dirty-flag.test.js
│   │   ├── duration/
│   │   │   └── duration.test.js
│   │   └── ai-executor/
│   │       ├── new-id-resolution.test.js
│   │       └── unknown-action.test.js
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
│   ├── DDScope_Overview.md
│   ├── DDScope_DataModel.md
│   ├── DDScope_Architecture.md
│   ├── DDScope_UI.md
│   ├── DDScope_AI_Assistant.md
│   ├── DDScope_Backlog.md
│   ├── DDScope_Modules.md          ← JavaScript module registry
│   └── DDScope_TestEnvironment.md  ← this file
│
├── fixtures/                        ← JSON inputs for automated tests (Vitest + Playwright)
│   ├── README.md
│   ├── project-empty.json
│   ├── project-minimal.json         ← 2 nodes, 1 flow, 1 map
│   ├── project-full.json            ← all entity types, multi-map, BOMs, demands
│   ├── project-partial-fields.json  ← absent fields → default value handling
│   └── project-edge-cases.json      ← orphan SKUs, empty lanes, null fields
│
├── samples/                         ← DDScope project catalogue
│   ├── README.md                    ← index: name, description, entities, recommended use
│   ├── demo-discrete-manufacturing.json
│   ├── demo-distribution.json
│   └── ...
│
├── scripts/
│   ├── extract.js              ← Pull SCRIPT blocks from CommWise → src/
│   └── inject.js               ← Push src/ file → CommWise block (update)
│
├── .env.example                ← COMMWISE_APP_ID, DDSCOPE_URL, etc.
├── playwright.config.js
├── vitest.config.js
└── package.json
```

---

## Documentation (`docs/`)

`docs/` contains the DDScope design documents. It serves two purposes:

- **Repository reference** — all test decisions (scope, module boundaries, fixture design) are grounded in the spec files here rather than in implicit knowledge.
- **Claude project context** — the same files are imported into the Claude project used for AI-assisted development. This ensures the AI assistant and the developer share the same source of truth at all times.

When a spec document is updated, it should be committed to `docs/` and re-imported into the Claude project context in the same step. The two copies are kept in sync manually.

| File | Content |
|---|---|
| `DDScope_Overview.md` | Purpose, scope, v1 feature list, open questions |
| `DDScope_DataModel.md` | All entities, fields, cascade rules |
| `DDScope_Architecture.md` | Stack, module structure, persistence, key implementation details |
| `DDScope_UI.md` | Interaction model, panels, views |
| `DDScope_AI_Assistant.md` | Action vocabulary, context format, system prompt contract |
| `DDScope_Backlog.md` | Pre-backlog ideas by theme |
| `DDScope_Modules.md` | **JavaScript module registry** — CommWise addresses, APIs, dependencies, testability, extraction status |
| `DDScope_TestEnvironment.md` | This file |

---

## Module Registry

**[DDScope_Modules.md](DDScope_Modules.md) is the authoritative source** for all `DDS_*` module definitions. It records:

- CommWise block address (`code_type` + `position`) for extraction
- Public API surface
- Runtime dependencies
- Testability classification (see below)
- Extraction contract status (`met` / `partial` / `unverified` / `not-met`)

The TEST context is a co-owner of this file: after extracting and testing a module, update its entry to reflect actual dependencies found and current test coverage status.

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

## Axe 1 — Functional Tests (Vitest + Node.js)

### Principle

DDScope logic modules (store, duration, AI executor) are extracted from CommWise SCRIPT blocks and run as plain JS in Node.js. Vitest is the test runner — fast, native ESM, with a first-class VS Code extension.

### Module extraction

CommWise SCRIPT blocks expose modules as browser globals:

```javascript
window.DDS_STORE = (function () { ... })();
```

The `scripts/extract.js` script pulls target blocks from CommWise via the MCP API and writes them to `src/`. No manual copy-paste. The selector used to identify DDScope module blocks is the `JS:` prefix in the block title (see `DDScope_Modules.md` — Naming Conventions).

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
| `DDS_AI_EXECUTOR` | `new_*` ID resolution across a multi-action plan, unknown action rejection, cascade action listing |
| Serialization | Round-trip: `buildProjectJson` → `importProjectFromJson` → state equality; partial files; ID remapping on duplicate |

### Fixture files

`fixtures/` contains `.json` project files consumed by automated tests (Vitest and Playwright). Each file is named after the scenario it covers, not after a real project. Naming convention: `project-{scenario}.json`. Fixtures are committed and versioned — they are the regression baseline.

### Sample projects

`samples/` is a centralised catalogue of realistic DDScope projects. Its purpose is distinct from `fixtures/`: these files are not consumed by automated tests but serve as shared resources for demos, client presentations, manual feature testing, and onboarding.

Each file is described in `samples/README.md`: project name, supply chain type, notable entities and configurations, and recommended use cases.

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

The CommWise app is accessible at a public URL. Authentication state is saved once via `playwright/auth/setup.spec.js` and reused across all tests via `storageState` — no re-login per test run.

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

### Replaying tests in VS Code

The Playwright VS Code extension (`ms-playwright.playwright`) provides:
- A test explorer sidebar
- One-click run / debug per test
- Step-through with browser open side by side
- Record new tests from the browser

### Auth setup (one-time)

```bash
npx playwright test --project=setup
```

This writes `tests/ui/auth/.auth/user.json` (gitignored). Subsequent runs reuse it.

---

## Axe 3 — Ticket Integration (Future)

Non-blocking. To be addressed when the test suite reaches a stable baseline.

Candidate approach: a failing test annotated with a ticket ID emits a comment or status update via the issue tracker API (Jira or Linear MCP). This would be implemented as a Vitest/Playwright reporter plugin.

Placeholder convention for now — annotate tests with a ticket reference in the test title:

```javascript
test('[DDS-42] cascade: delete_node removes all dependent flows', () => { ... });
```

---

## Scripts

### `scripts/extract.js`

Calls the CommWise MCP API to fetch target SCRIPT blocks by position or title and writes them to `src/`. Driven by the module registry in `DDScope_Modules.md` — the `block` field (e.g. `SCRIPT 150`) provides the exact `code_type` + `position` for each module. Only blocks whose title starts with `JS:` are considered DDScope modules.

Parameters: `COMMWISE_APP_ID` from `.env`.

Intended use: run before a test session to ensure `src/` is in sync with the live app.

### `scripts/inject.js`

Takes a modified file in `src/` and calls `commwise_update_block` to replace the corresponding CommWise block. Requires an active CommWise session ID.

Intended use: local debug loop — edit in VS Code, run unit tests, inject fix back to CommWise.

> Both scripts are designed to be driven by Claude in VS Code via the CommWise MCP. The developer does not need to call the CommWise API manually.

---

## Module Organisation Principles

*This section is a shared working document — maintained collaboratively between the developer and the AI assistant.*

### Naming conventions

See `DDScope_Modules.md` §Naming Conventions for the full specification. Summary:

- JS global: `DDS_<MODULE>` (e.g. `DDS_STORE`, `DDS_DURATION`)
- CommWise block title: `JS: DDS_<MODULE> — <one-line description>`
- Extracted file: `src/DDS_<MODULE>.js`

### Module boundaries

Each module has a single stated responsibility. The full dependency graph is maintained in `DDScope_Modules.md`. The table below is a quick reference for the modules relevant to unit testing.

| Module | Responsibility | Testability |
|---|---|---|
| `DDS_STORE` | In-memory CRUD, dirty flag, ID counters, file persistence | store-dependent (after DOM refactor) |
| `DDS_DURATION` | Duration arithmetic and formatting | pure |
| `DDS_AI_CONTEXT` | Project → Claude context JSON serialisation | store-dependent |
| `DDS_AI_EXECUTOR` | Execute Claude action plans on the store | store-dependent |
| `DDS_JSON` | Project import with copy modes + ID remapping | store-dependent |
| `DDS_PRODUCTS` | Product CRUD + SKU cascade | store-dependent |
| `DDS_BOMS` | BOM CRUD + cascade | store-dependent |
| `DDS_DEMANDS` | Demand CRUD + map_demands + cascade | store-dependent |

Render-dependent modules (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_LAYOUT`, all `*_UI` modules) are out of scope for unit testing.

### Testability classification

Defined in `DDScope_Modules.md` and reproduced above for convenience.

---

## Environment Variables

```bash
# .env (gitignored)
COMMWISE_APP_ID=22645
DDSCOPE_URL=https://...   # full CommWise app URL
```

`.env.example` is committed with placeholder values.

---

## VS Code Setup

Recommended extensions:
- `vitest.vitest` — Vitest test explorer
- `ms-playwright.playwright` — Playwright test runner and recorder

Recommended workspace settings (`.vscode/settings.json`):
```json
{
  "vitest.enable": true,
  "playwright.reuseBrowser": true
}
```

---

*b2wise — Confidential*
