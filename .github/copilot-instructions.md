# Copilot Instructions for DDScope

## Project context
- DDScope is a modular JavaScript app extracted from CommWise blocks into `src/DDS_*.js` files.
- This repository is docs-first: functional expectations are defined in `docs/` and tests should align with those specs.
- Test stack:
  - Unit tests: Vitest in Node (`tests/unit/**`)
  - UI tests: Playwright (`tests/ui/**`)

## Engineering priorities
- This repository priority is testing, not feature development.
- Do not modify modules in `src/` without explicit user instruction.
- It is not your role in this repository to align specification and implementation.
- Spec/code alignment and implementation changes are primarily owned by the DEV project.
- Prioritize reliability and regression safety for core logic modules.
- Prefer unit tests for data/model/store logic before adding UI tests.
- Keep changes minimal, focused, and backwards-compatible unless a deliberate refactor is requested.
- Do not mix unrelated refactors with functional fixes.
- For CommWise refresh/sync work, prefer selective sync of only test-relevant modules.

## Module and architecture rules
- Preserve the `DDS_*` module naming convention and file layout in `src/`.
- Keep public module APIs stable; if an API must change, update docs and tests in the same change.
- Separate core logic from browser/DOM side effects whenever possible.
- For store behavior, keep in-memory CRUD testable in Node and isolate browser persistence concerns.

## Testing expectations
- Every behavior change should include or update unit tests.
- For pure/store-dependent modules, write Vitest tests first.
- Do not run tests unless the user explicitly asks to run them in the current conversation.
- Use Playwright only for rendering/interaction paths that cannot be validated in Node.
- Keep test cases deterministic and fixture-driven where possible (`fixtures/`, `samples/`).
- For Playwright tests that load project JSON from `fixtures/` or `samples/`, always use `tests/ui/helpers/open-project.js` and never automate the UI Open/filechooser flow directly.
- Follow the policy documented in `tests/ui/README.md` (section: "Fixture and sample loading policy") for all new or modified UI fixture-loading tests.
- Do not proactively explore the live app UI or CommWise blocks to discover HTML IDs/selectors unless the user explicitly asks for that investigation.
- Playwright failure handling: when a UI test fails, do not start repeated automatic DOM inspection or probing loops. Stop after the first failure summary and discuss with the user to agree on the debugging strategy before running extra inspection commands.
- Playwright visual debugging: prefer running the failing test in headed mode first so the user can inspect the UI state directly, then agree on next actions.

## Documentation expectations
- Update relevant docs when behavior or contracts change:
  - `docs/DDScope_Modules.md` for API/module responsibility or testability updates.
  - `docs/DDScope_DataModel.md` for schema/relationship changes.
  - `README.md` when developer workflows/scripts change.
- Write all comments and documentation in English.

## Practical workflow for Copilot
1. Inspect relevant module(s) and matching docs before editing.
2. Implement the smallest correct change.
3. Add or update tests.
4. Run tests only when the user explicitly requests execution.
5. Update documentation references if contracts changed.

## Allowed actions in this repo
- Preferred actions:
  - Add and update tests in `tests/unit/**` and `tests/ui/**`.
  - Add and update test data in `fixtures/**` and `samples/**`.
  - Update documentation in `docs/**` and testing guidance in `README.md`.
  - Improve test shims and test configuration when needed for reliability.
- Disallowed by default:
  - Do not modify production modules in `src/**` unless the user explicitly requests it.
  - Do not perform spec/code alignment work as part of normal test tasks in this repo.
  - Do not introduce feature development changes under the guise of test maintenance.

## Upstream refresh intent
- Interpret refresh requests with flexible natural language.
- When the user asks to refresh, reconcile, sync, pull latest, or update a module from upstream, treat it as the same workflow.
- Require an explicit module name for refresh requests.

Reference process:
- Always follow the refresh process described in `src/README`.
- Treat `src/README` as the source of truth for extraction/injection and revision-check steps.

Expected behavior for module refresh intent:
1. Determine target module from user message.
2. Compare upstream module revision (CommWise) against the local extracted revision marker.
3. If revision is unchanged, report that no refresh is needed.
4. If revision changed, refresh local extracted code from upstream by following `src/README` process.
5. Report revision before/after and files touched.
6. Keep scope strict: sync/refresh only, no extra refactor unless explicitly requested.
