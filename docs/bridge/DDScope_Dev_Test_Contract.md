# DDScope - DEV / TEST Contract
*v0.1 - Draft - May 2026*

---

## Purpose

This document defines the shared bridge contract between DEV and TEST for DDScope.
It is visible in both environments and is the only place where the shared protocol is described.

Local implementation details are out of scope here and belong to the environment that implements them.

---

## Terminology

| Name | What it is |
|---|---|
| **DEV** | The Claude project used for primary development of the CommWise App |
| **TEST** | This repository - test code, debug and development of functional non-UI-related code, extracted functional module sources, fixtures, Playwright specs, running in VS Code |

TEST is the working environment for extracted modules, fixtures, and tests. It may modify functional module sources locally and push those changes back to CommWise through the documented bridge workflow.

**Note**

The name TEST is somewhat misleading because this environment also covers part of the development of functional non-UI-related code. This naming is historical.

---

## Responsibilities

TEST GitHub is the source of truth for all documentation. It can be modified in both DEV and TEST following the workflow below.

CommWise is the source of truth for all application code. It can be modified by DEV for all UI and functional code, or by TEST for functional code only. The workflow is described below.

---

## Workflow

### 1. Documentation

All DDScope documentation is kept by TEST under four categories:

| Category | Visibility | Purpose |
|---|---|---|
| `shared` | Visible in DEV and TEST | Common DDScope specifications shared by both environments |
| `bridge` | Visible in DEV and TEST | Shared workflow and contract documents connecting DEV and TEST |
| `test-local` | TEST only | Local TEST procedures and implementation notes |
| `dev-local` | DEV only | Local DEV procedures and implementation notes |

When DEV needs to update a document in `bridge`, `shared`, or `dev-local`, it may emit a Markdown patch describing the intended changes clearly.

The developer then performs the update manually:

1. Download the patch file.
2. Move it into the `docs/` folder.
3. Ask the assistant to apply the patch to the correct canonical document in the subfolder matching its category.
4. Commit and sync to GitHub.
5. Refresh from GitHub in DEV.

TEST-local documentation is managed directly in TEST and is not part of the DEV patch workflow.

### 2. Code

**UI Code** is only changed by DEV using CommWise MCP.

**Functional Modules** code can be changed by both sides using CommWise MCP. DEV does not maintain a separate code base.

TEST has a process to synchronise its workspace with CommWise.

It is the developer's responsibility to avoid parallel overwrites. CommWise revisions and GitHub can help restore accidental conflicts.

---

*b2wise - Confidential*