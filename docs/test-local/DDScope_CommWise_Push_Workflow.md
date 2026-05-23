# DDScope — CommWise Push Workflow (TEST + Claude Extension)
*Draft — May 2026*

---

## Purpose

This document defines the push workflow from this TEST repository to CommWise.
In this workflow, extracted modules are edited in TEST first, then pushed back to the live CommWise block and re-extracted to confirm parity.

As of May 2026, push operations requiring `commwise_start_session` must be executed through the Claude extension in VS Code because this tool is deferred and not yet reliably handled by Copilot.

The workflow is split:
- Copilot: prepare the module payload and the push package.
- Claude extension: execute the CommWise write session and verification.

This capability is restricted to **non-UI modules only** (see Eligibility below).

---

## Eligibility

Only modules with the following profile in `DDScope_Modules.md` may be pushed from TEST after local edits in the extracted `src/` working copy:

| Field | Required value |
|---|---|
| `testability` | `pure` or `store-dependent` |
| `contract` | `met` |

Modules with `testability: render-dependent` must never be pushed from TEST. They belong to the DEV workflow exclusively.

**Current eligible modules (v0.9):** `DDS_COLORS`, `DDS_ICONS`, `DDS_STORE`, `DDS_DURATION`, `DDS_MODEL`, `DDS_ACTIONS`, `DDS_JSON`, `DDS_AI_CONTEXT`, and all helper layer modules (`DDS_NODES`, `DDS_PRODUCTS`, `DDS_FLOWS`, `DDS_SKUS`, `DDS_BOMS`, `DDS_DEMANDS`, `DDS_ANNOTATIONS`, `DDS_LANES`).

---

## CommWise App Reference

| Field | Value |
|---|---|
| App ID | `22645` |
| App identifier | `mcp-c3-ddscope` |

All MCP calls use `appID: 22645`.

---

## Mandatory Claude Scope Limits

When handing off a push task to Claude extension, enforce a strict read scope.

Claude must **not** scan or re-read the entire workspace. Claude must only open the minimum relevant files listed below.

Allowed files only:
- `docs/test-local/DDScope_CommWise_Push_Workflow.md`
- `docs/shared/DDScope_Modules.md`
- `src/<MODULE>.js`
- `src/README.md`

Allowed folders for these files:
- `docs/test-local/`
- `docs/shared/`
- `src/`

If required information is missing from these files, Claude must stop and ask for clarification instead of broadening scope.

---

## Technical Process — Step by Step

### Step 1 — Look up the block address and eligibility

Before any write, look up the target module in `DDScope_Modules.md` to get its CommWise block address:

```
global:    DDS_COLORS
block:     SCRIPT 105
code_type: script
position:  105
```

Confirm the module is still `pure` or `store-dependent`.

### Step 2 — Prepare a push-ready module payload

Start from the local `src/<MODULE>.js` TEST working copy, then prepare the exact code to push.

**Important:** push code must be raw CommWise block content. Ignore/remove anything added by extraction tooling.

At minimum, remove:
- `export default <GLOBAL>;` (always extraction-added for ESM/Vitest compatibility)

Also remove if present:
- extraction-only markers or trace comments added outside the original block body
- any local test scaffolding not meant for CommWise runtime

Keep unchanged:
- module global name (`var DDS_... = (function () { ... }());`)
- IIFE structure and runtime behavior

The prepared payload must be exactly what should live inside the CommWise SCRIPT block.

### Step 3 — Ask Claude extension to execute the push session

Provide Claude extension with:
- module name
- `appID` (`22645`)
- `code_type` and `position`
- push-ready code payload (from step 2)
- one-line objective
- release notes text

Use this handoff template:

```
Push module <MODULE> to CommWise.

Workspace scope rules (mandatory):
- Do not read the full workspace.
- Read only these files: docs/test-local/DDScope_CommWise_Push_Workflow.md, docs/shared/DDScope_Modules.md, src/<MODULE>.js, src/README.md.
- Restrict file access to docs/ and src/ folders.

Address:
- appID: 22645
- code_type: script
- position: <POSITION>

Objective:
- <one-line summary>

Release notes:
- <release note text>

Code to push (raw CommWise block content, no export default):
<PASTE CODE>

Execution requirements:
1) Fetch current block first and validate intended diff.
2) Start session (load deferred commwise_start_session tool if required).
3) Update block with create_revision=true and append_release_notes=true.
4) Re-fetch updated block and confirm exact content match.
5) Report sessionId, revision created, and verification status.
```

### Step 4 — Claude verification responsibilities

Claude extension must perform verification, not just write:
- pre-push verification: fetch live block and confirm intended delta
- write verification: successful `commwise_update_block` with revision metadata
- post-push verification: re-fetch and compare with pushed payload
- audit output: return `sessionId`, target address, release notes used, and resulting revision info

If verification fails at any point, Claude must stop and report the mismatch instead of forcing additional writes.

### Step 5 — Re-extract in TEST and confirm local parity

After Claude confirms successful push, re-extract the module into `src/` and verify parity with the pushed code.

This confirms:
- CommWise state is correct
- local extracted baseline is synchronized for future tests

---

## Worked Example — DDS_COLORS (SCRIPT 105)

`DDS_COLORS` is the reference module for validating this workflow. It is `pure`, compact, and dependency-free.

**Scenario:** a comment has been added locally to `src/DDS_COLORS.js` and needs to be pushed to CommWise.

```
1. Look up DDScope_Modules.md → SCRIPT 105, code_type: script, position: 105, testability: pure
2. Prepare payload from src/DDS_COLORS.js and remove extraction-added line:
  export default DDS_COLORS;
3. Send the handoff package to Claude extension with objective + release note.
4. Claude executes: fetch current block, start session, update block with revision, re-fetch and verify.
5. Re-extract DDS_COLORS in TEST and confirm parity.
```

---

## Guard Rails

- **Never push render-dependent modules** (`DDS_MAP`, `DDS_SWIMLANES`, `DDS_LAYOUT`, all `*_UI` modules). These are DEV-only.
- **Always strip extraction-only content** before handoff (especially `export default ...`).
- **Claude must always fetch before push.** Never overwrite blindly.
- **Claude must always verify after push.** No write without post-check.
- **Always re-extract after successful push** and confirm the TEST working copy stays in sync.
- **One module per session.** Do not bundle multiple module updates into a single session.

---

*b2wise — Confidential*
