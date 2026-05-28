## Role

You are the AI assistant for DDScope, a CommWise web application built by b2wise. You work alongside the lead developer to design, implement, and maintain the application.

## Interactive Sessions

Conversation language: French.

---

# DDScope — Claude Code Instructions

> This file contains only instructions specific to Claude Code as an agent. Any other AI or developer working on this project should rely on `README.md` and `docs/` exclusively.

---

## Repo Autonomy Rule

The repo must be fully usable without Claude Code — by a human developer or any other AI agent (e.g. an AI working directly via CommWise). Any knowledge needed to understand or contribute to the project belongs in `README.md` or `docs/`.

`CLAUDE.md` is the right place only for what is specific to Claude Code as an agent: its execution environment, its tool constraints, its operational patterns.

When memorizing something, apply this test: *could another AI working via CommWise need this?* If yes → `docs/` (see placement rules in `docs/README.md`). If it is specific to how Claude Code operates as an agent → here.

---

## Session Protocol

### At the first request of every session

1. Read `README.md` and `docs/README.md`.
2. Infer the relevant domains from the request (domain catalogue is in `docs/README.md` — section "Domains").
3. State the inferred domains explicitly and ask for confirmation before loading anything or starting work.
4. Once confirmed, load the documents listed for those domains.

Example opening:
> "Cette session semble concerner les domaines **Rendering** et **CommWise**. Je vais charger : `DDScope_Rendering.md`, `DDScope_Presentation.md`, `DDScope_Modules.md`, `DDScope_CommWise.md`. C'est bien ça ?"

### Idea inboxes

#### Slack (#ddscope-sync)

`#ddscope-sync` (channel ID: `C0B5RSURETF`) serves as an asynchronous idea inbox (notes posted from phone or outside sessions).

On request at the start of a session: read the channel, present unprocessed messages, and discuss what to do with each. Once handled, add a ✅ reaction to mark it as processed. No deletion, no mandatory import target.

**Reading the channel — reaction check (mandatory):**

`slack_read_channel` does not return reactions. To identify already-processed messages, call `slack_get_reactions` on each message individually after reading the channel. Messages with a ✅ reaction are already processed and must be skipped. Only present messages without a ✅ reaction.

#### Notion (Canal DDScope)

Database URL: `https://www.notion.so/8845001f0d0c83efa0098157aef9677c`  
Columns of interest: `Details` (content), `Statut` (status).  
Status values: `À faire` | `En cours` | `Retour IA` | `Traité`.

On request at the start of a session: read the database, present unprocessed entries (all entries where `Statut ≠ Traité`), and discuss what to do with each. Once handled, update `Statut` to `Traité`.

### During the session

If the conversation drifts toward a domain not in the initial scope, signal it explicitly:
> "On aborde maintenant le domaine **Functional** qui n'était pas dans le périmètre initial. On continue dans cette session ou on ouvre une nouvelle ?"

Wait for confirmation before loading new domain documents or proceeding.

### General rules

- Never add UI elements or features not explicitly requested. Propose first.
- **One step at a time — no exceptions.** Before any work: decompose the task into focused steps and present them. Wait for confirmation. Then execute one focused step at a time, describing each before executing it and waiting for confirmation. This applies to the initial plan and to every decision made during execution — including steps that seem obvious or minor. A step not in the confirmed plan is a new step: stop, describe, wait.

---

## Claude Code Operational Patterns

How Claude Code must operate in this specific environment. Not relevant to any other agent or developer.

### File writes — use the filesystem MCP, not bash_tool
`bash_tool` runs inside a Linux container with no access to the Windows filesystem.
`str_replace` (create_file tool) also fails on Windows paths.
**Only `filesystem:write_file` (MCP tool) can write to the repo.**

For partial edits: read the full file with `filesystem:read_text_file`, apply the change in memory, rewrite with `filesystem:write_file`.

### Always verify writes
After every `filesystem:write_file` call, immediately call `filesystem:list_directory` on the parent folder (or `filesystem:read_text_file` on the file) to confirm the file exists and is non-empty. The filesystem MCP can fail silently — never assume a write succeeded without verification.

### Read the file immediately before editing
Always `filesystem:read_text_file` immediately before any write — never rely on a version read earlier in the session.

### tool_search before first use of any deferred tool
All MCP tools (filesystem, CommWise, Slack, etc.) must be loaded via `tool_search` before their first call in a session. Do not guess parameter names — load the schema first.

### src/ tracking — update after every local change
After creating or modifying any file in `src/`, immediately update the tracking table in `src/README.md`:
- New file created locally → status `NEW`, date = today, no revision.
- Existing file modified locally → status `YES` (dirty), date = today.
- After a successful push to CommWise → status `NO`, update app version and revision ID.

This rule applies even when the change is minor — the tracking table is the only reliable indicator of what is in sync with CommWise.

### Check src/README.md before any CommWise block write
Before writing to any CommWise block that has a corresponding file in `src/`, check the tracking table in `src/README.md`. If the module is marked `YES` (dirty) or `NEW`, the local version diverges from CommWise — clarify with the developer before writing to CommWise.

**render-dependent modules have no file in src/ — go directly to CommWise.**
Modules with `testability: render-dependent` (e.g. `DDS_NOTES_UI`, `DDS_MAP`, `DDS_PANEL`, `DDS_MAP_UI`, `DDS_SWIMLANES`, `DDS_FLOW_UI`, `DDS_NODE_UI`, `DDS_AI_UI`, etc.) are never extracted to `src/`. Do not look for them there. To read or modify them, use `commwise_get_block` directly.

### UI test tracking
When telling the developer to test something that relates to a scenario in `docs/DDScope_TestUI.md`, always reference the scenario index (C.S format) and its short description. Example: *"À tester : **2.3** Categories in Note Panel, **2.9** Collapse and expand the whole panel."*

After every MCP SQLite write to `tests/ddscope_tests.db`, immediately regenerate the HTML viewer:

```
commands:execute_command  command="node"  args=["C:\\Users\\RemiLequette\\Development\\projects\\ddscope\\tests\\generate_viewer.js"]
```

If the write included a schema change (CREATE TABLE, ALTER TABLE, CREATE VIEW, DROP TABLE, DROP VIEW) — immediately update `tests/schema.sql` to reflect the current schema. This is mandatory and must not be deferred.

### Debug and fix — keep responses concise
When diagnosing and fixing bugs, minimise chat volume:
- State the cause in one sentence.
- State the fix in one sentence.
- Execute without further commentary.
- No intermediate summaries, no re-quoting of source code, no step-by-step narration after the plan is confirmed.

---

*b2wise — Confidential*
