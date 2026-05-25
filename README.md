# ddscope

Working environment for the DDScope application — design, documentation, code, and tests.

**This repo must be self-sufficient.** A developer or an AI Assistant should be able to understand and contribute to the project by reading this file and `docs/` alone.

---

## Language Convention

All contributions to this repo must be in English: code, comments, documentation, commit messages, and release notes.

---

## Project Identity

**DDScope** is a CommWise web application built by b2wise. It supports DDMRP scoping workshops — consultants use it to build supply chain maps capturing current-state structure before buffer design begins.

| Item | Value |
|---|---|
| CommWise app ID | 22645 |
| CommWise connector | C3 |
| URL slug | `mcp-c3-ddscope` |
| Platform | CommWise Web App (single-page) |
| Domain | b2wise / DDMRP |

---

## Repository Structure

```
docs/       # All documentation — flat, no sub-folders
src/        # Extracted functional modules (mirror of CommWise SCRIPT blocks)
tests/      # Vitest unit tests + Playwright e2e specs
fixtures/   # JSON project files for automated tests
samples/    # Realistic DDScope projects for demos and manual testing
shims/      # Minimal stubs for CommWise/browser globals (Node.js compat)
```

**Sources of truth:**
- Documentation → `docs/` in this repo
- Application code → CommWise (app ID 22645)

---

## Documentation

See [`docs/README.md`](docs/README.md) for the full document index with descriptions and reading order.

For extracted modules and sync tracking, see [`src/README.md`](src/README.md).

---

## Test Creation Rule

Before creating any new test, first verify whether the scenario references existing entities and therefore requires a prepared project state.

If preparation is needed, discuss the strategy before implementing:

1. Load an existing JSON fixture/sample.
2. Create the required entities directly in the test setup.

---

## Note for AI Assistants

You should have a specific instruction file (e.g. Claude.md) to bootstrap any session, it should refer to the REAME. It contains operational instructions specific to the AI model (file write patterns, tool usage rules, session protocol).

---

*b2wise — Confidential*
