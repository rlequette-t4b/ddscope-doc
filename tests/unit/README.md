# DDScope - Unit Tests

This folder contains Vitest suites for DDScope core modules.

## Contract-First Rule

Unit tests must respect module contracts.

- Outside `actions/*.test.js` and `store/*.test.js`, do not create business data by calling `DDS_ACTIONS.execute` or `DDS_STORE.insert/update/remove` in test setup.
- In helper-module tests, create entities through helper APIs (`DDS_NODES`, `DDS_PRODUCTS`, `DDS_FLOWS`, `DDS_SKUS`, `DDS_BOMS`, `DDS_DEMANDS`).
- Keep `DDS_STORE` usage focused on:
  - project bootstrap (`DDS_STORE.newProject`, `DDS_STORE.setProject`),
  - read/assertions (`DDS_STORE.query`),
  - explicit contract tests of `DDS_STORE` itself.

## Why

Using helpers/APIs in setup validates real integration paths and avoids tests that pass while bypassing business rules.

## Exception Policy

If a helper does not exist yet for a required setup path (for example `map_*`, `swim_lanes`, or `node_types` fixtures), document the temporary exception in the test with a short English comment and keep the direct write minimal.

When using an exception:
- Prefer `DDS_STORE.insert` over `DDS_ACTIONS.execute` for fixture-only rows not covered by helpers.
- Keep the exception local to a single test when possible.
- Add a short `No helper/API exists yet ...` comment above the write.

## Target State

Current and future unit tests should default to helper-based setup.

Action-level setup is reserved for `actions/*.test.js` only.

Example: once `DDS_NODES` helper APIs are available and stable, tests should create/update/delete nodes through `DDS_NODES` instead of `DDS_ACTIONS.execute`.