# DDScope Docs

This folder contains the DDScope documentation set used by TEST and re-imported into DEV.

The GitHub repository for TEST is the working reference for these files. When a document changes here, it is copied back into the DEV project context so both environments stay aligned.

---

## Document Types

### 1. Shared docs

These are the common DDScope specifications used in both environments. They define the product behavior, model, and contracts that DEV and TEST must share.

| Document | Status | Notes |
|---|---|---|
| [DDScope_Overview.md](shared/DDScope_Overview.md) | Active | Core product overview |
| [DDScope_DataModel.md](shared/DDScope_DataModel.md) | Active | Functional data model and cascades |
| [DDScope_Architecture.md](shared/DDScope_Architecture.md) | Active | Architecture and module structure |
| [DDScope_UI.md](shared/DDScope_UI.md) | Active | UI behavior and interaction model |
| [DDScope_AI_Assistant.md](shared/DDScope_AI_Assistant.md) | Active | AI contract and action vocabulary pointer |
| [DDScope_Actions.md](shared/DDScope_Actions.md) | Active | Action vocabulary and execution rules |
| [DDScope_Modules.md](shared/DDScope_Modules.md) | Active | Module registry and testability |

### 2. TEST-local docs

These documents describe the TEST repository itself: its structure, conventions, and how extracted modules and tests are managed here.

| Document | Status | Notes |
|---|---|---|
| [DDScope_TestEnvironment.md](test-local/DDScope_TestEnvironment.md) | Active | TEST repository conventions and workflow |
| [DDScope_CommWise_Push_Workflow.md](test-local/DDScope_CommWise_Push_Workflow.md) | Active | Push workflow for extracted modules |

### 3. Bridge docs

These are shared operational documents that connect the DEV and TEST workflows. They are visible in both environments and should stay synchronized.

| Document | Status | Notes |
|---|---|---|
| [README.md](README.md) | Active | Docs index for both environments |
| [DDScope_Dev_Test_Contract.md](bridge/DDScope_Dev_Test_Contract.md) | Draft | Shared DEV/TEST contract |

---

### 4. DEV-local docs

These documents are placeholders for DEV-only notes that live here because the GitHub flow mirrors the docs folder into DEV.

| Document | Status | Notes |
|---|---|---|
| No example yet | None yet | Placeholder only; add entries when DEV-local docs exist |

---

## Working Rule

When you update a document in this folder:

1. Keep the content consistent with the DEV project context.
2. Re-import the updated file into DEV.
3. Preserve the distinction between shared specs and TEST-local guidance.

---

## Reading Order

If you are new to the project, start here:

1. [DDScope_Overview.md](shared/DDScope_Overview.md)
2. [DDScope_DataModel.md](shared/DDScope_DataModel.md)
3. [DDScope_Architecture.md](shared/DDScope_Architecture.md)
4. [DDScope_Modules.md](shared/DDScope_Modules.md)
5. [DDScope_Dev_Test_Contract.md](bridge/DDScope_Dev_Test_Contract.md)
6. [DDScope_TestEnvironment.md](test-local/DDScope_TestEnvironment.md)

---

*b2wise - Confidential*