# DDScope - Unit Tests

This folder contains Vitest suites for DDScope core modules.

## Contract-First Rule

Unit tests must respect module contracts.

- Do not create business data by calling `DDS_STORE.insert` directly in test setup.
- Use the public helper/API under test (or `DDS_ACTIONS.execute` when appropriate) to create domain entities.
- Keep `DDS_STORE` usage focused on:
  - project bootstrap (`DDS_STORE.newProject`, `DDS_STORE.setProject`),
  - read/assertions (`DDS_STORE.query`),
  - explicit contract tests of `DDS_STORE` itself.

## Why

Using helpers/APIs in setup validates real integration paths and avoids tests that pass while bypassing business rules.

## Exception Policy

If a helper does not exist yet for a required setup path, document the temporary exception in the test with a short English comment and keep the direct store write minimal.

## Target State

Current migrations may use `DDS_ACTIONS.execute` as an interim setup path when no dedicated helper exists.

Long term, unit tests should also phase out those action-level setup calls and use domain helpers directly as they are extracted.

Example: once `DDS_NODES` helper APIs are available and stable, tests should create/update/delete nodes through `DDS_NODES` instead of `DDS_ACTIONS.execute`.