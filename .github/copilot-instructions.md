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

## Module and architecture rules
- Preserve the `DDS_*` module naming convention and file layout in `src/`.
- Keep public module APIs stable; if an API must change, update docs and tests in the same change.
- Separate core logic from browser/DOM side effects whenever possible.
- For store behavior, keep in-memory CRUD testable in Node and isolate browser persistence concerns.

## Testing expectations
- Every behavior change should include or update unit tests.
- For pure/store-dependent modules, write Vitest tests first.
- Use Playwright only for rendering/interaction paths that cannot be validated in Node.
- Keep test cases deterministic and fixture-driven where possible (`fixtures/`, `samples/`).

## Documentation expectations
- Update relevant docs when behavior or contracts change:
  - `docs/DDScope_Modules.md` for API/module responsibility or testability updates.
  - `docs/DDScope_DataModel.md` for schema/relationship changes.
  - `README.md` when developer workflows/scripts change.
- Write all comments and documentation in English.

## Code style and safety
- Use clear, explicit names and small focused functions.
- Add brief comments only for non-obvious logic.
- Handle error paths explicitly; do not swallow errors unless there is a documented reason.
- Avoid introducing new dependencies unless necessary and justified.

## Practical workflow for Copilot
1. Inspect relevant module(s) and matching docs before editing.
2. Implement the smallest correct change.
3. Add or update tests.
4. Run targeted tests first (`npm run test:unit` or selected files).
5. Update documentation references if contracts changed.
