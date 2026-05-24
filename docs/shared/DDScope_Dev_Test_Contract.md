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
| **TEST** | The VS Code workspace - test code, debug and development of functional non-UI-related code, extracted functional module sources, fixtures, Playwright specs |

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

All DDScope documentation is kept by TEST in md format a GitHub workspace under three folders:

| Category | Visibility | Purpose |
|---|---|---|
| `shared` | Visible in DEV and TEST | Common DDScope specifications shared by both environments |
| `test-local` | TEST only | Local TEST procedures and implementation notes |
| `dev-local` | DEV only | Local DEV procedures and implementation notes |

The documents in shared and dev-local are imported from GitHub in the Claude project context of DEV.
When DEV needs to update a document it creates a full new version.

The developer then performs the update manually:

1. Download the file.
2. Move it into the `docs/xxx` folder.
3. Commit and sync to GitHub.
4. Refresh from GitHub in DEV.

## Slack Channel

A shared Slack channel is used for lightweight coordination between DEV, TEST, and the developer.

| Property | Value |
|---|---|
| Channel name | `#ddscope-sync` |
| Channel ID | `C0B5RSURETF` |
| Workspace | tech4best |

When the AI sssistants are talking to this channel they must precede all messages by:
[DEV-AI] for the DEV AI assistant (Claude.ai)
[TEST-AI] for the TEST AI assistant (in VS Code)
Please know well who you are it should be in your instructions.

The user will ask you to publish / broadcast / tell to the channel or to slack or to the other party (DEV, TEST), or use similar wording in english or french. This could be also part of a workflow described in a document or insructions.

Be concise, factual and precise on the channel it is designed for synchronisation and short exchange of information between bots.
