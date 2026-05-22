# ddscope-tests

Test environment for the DDScope application.

## Test creation rule (read first)

Before creating any new test, first verify whether the scenario references existing entities and therefore requires a prepared project state.

If preparation is needed, discuss the strategy with the user before implementing the test:

1. Load an existing JSON fixture/sample.
2. Create the required entities directly in the test setup.

For full architecture, test scope, and repository structure, see [`docs/DDScope_TestEnvironment.md`](docs/DDScope_TestEnvironment.md).

---

## Terminology

Two distinct projects are involved in DDScope development. This document uses the following names consistently:

| Name | What it is |
|---|---|
| **DEV** | The Claude project used for application development — CommWise blocks, spec documents, design decisions |
| **TEST** | This repository — test code, extracted modules, fixtures, Playwright specs, running in VS Code |

These are two separate environments. They do not share files automatically.

---

## How DEV and TEST relate

```
DEV (Claude project)                    TEST (this repo / VS Code)
────────────────────────────────────    ──────────────────────────────────────
CommWise blocks (live app)
Spec documents (docs/)              →   docs/         ← source of truth for tests
                                        src/          ← modules extracted from CommWise
                                        tests/        ← unit + UI tests
                                        fixtures/     ← JSON project files
```

DEV is the source of truth for application code and design documents.
TEST consumes outputs from DEV — it never pushes code back to the CommWise app directly.

---

## Workflow

### Mandatory steps — no exceptions

All file transfers between DEV and TEST are **manual**. There is no automatic synchronisation.

#### 1. Spec documents: DEV → TEST

When a spec document (`DDScope_*.md`) is updated in DEV:

1. Download the updated file from the Claude project context.
2. Copy it to `docs/` in this repository.
3. Commit and push to GitHub.

The `docs/` folder in TEST is kept in sync with the DEV project context manually. They must represent the same version at all times.

#### 2. Application modules: CommWise → TEST

When a CommWise SCRIPT block needs to be tested:

1. Ask Claude in VS Code to extract it: *"Extract DDS_DURATION from CommWise into src/"*. Claude uses `commwise_get_block` via the CommWise MCP and writes the result to `src/` with an ESM export appended.
2. Alternatively, copy the block content manually into the corresponding `src/` file and add `export default <GLOBAL>;` at the end.
3. Do not edit `src/` files directly for production fixes — see step 4.

#### 3. Fixes found in TEST → DEV

When a bug is identified and fixed in a `src/` file during a test session:

1. Copy the corrected content from `src/` back into the Claude DEV project (paste into the relevant conversation).
2. Apply the fix to the CommWise block via the DEV workflow (CommWise MCP session).
3. Re-extract the block into `src/` to confirm the live version matches.

#### 4. Spec updates: TEST → DEV

When a test session reveals a gap or error in the spec:

1. Update the relevant `docs/DDScope_*.md` file in this repository.
2. Push to GitHub.
3. Re-import the updated file into the Claude DEV project context manually.

---

## Summary

```
Spec updated in DEV
  → download → copy to docs/ → commit                         (DEV → TEST)

CommWise block updated in DEV
  → ask Claude in VS Code to extract → src/                   (CommWise → TEST)

Fix identified in TEST
  → paste corrected src/ into DEV → apply via MCP → re-extract  (TEST → DEV)

Spec gap found in TEST
  → update docs/ → push → re-import into DEV project context  (TEST → DEV)
```

> Until a more efficient pipeline is in place (e.g. automated extract/inject on commit), all transfers follow these manual steps. Skipping them will cause DEV and TEST to diverge silently.

---

*b2wise — Confidential*
