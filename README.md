# ddscope

Working environment for the DDScope application — design, documentation, code, and tests.

## Context

Read [`CLAUDE.md`](CLAUDE.md) before starting any task.

For documentation, see [`docs/README.md`](docs/README.md).

For extracted modules and sync tracking, see [`src/README.md`](src/README.md).

## Test creation rule

Before creating any new test, first verify whether the scenario references existing entities and therefore requires a prepared project state.

If preparation is needed, discuss the strategy before implementing:

1. Load an existing JSON fixture/sample.
2. Create the required entities directly in the test setup.

---

*b2wise - Confidential*
