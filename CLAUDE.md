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

### During the session

If the conversation drifts toward a domain not in the initial scope, signal it explicitly:
> "On aborde maintenant le domaine **Functional** qui n'était pas dans le périmètre initial. On continue dans cette session ou on ouvre une nouvelle ?"

Wait for confirmation before loading new domain documents or proceeding.

### General rules

- Never add UI elements or features not explicitly requested. Propose first.
- Explain the plan and wait for explicit confirmation before writing any code or CommWise edit.
- Break tasks in focused steps and describe them before executing sequentially to avoid long work between interactions, unless the user confirms to execute in one pass.

---

## Claude Code Operational Patterns

How Claude Code must operate in this specific environment. Not relevant to any other agent or developer.

### File writes — use the filesystem MCP, not bash_tool
`bash_tool` runs inside a Linux container with no access to the Windows filesystem.
`str_replace` (create_file tool) also fails on Windows paths.
**Only `filesystem:write_file` (MCP tool) can write to the repo.**

For partial edits: read the full file with `filesystem:read_text_file`, apply the change in memory, rewrite with `filesystem:write_file`.

### Read the file immediately before editing
Always `filesystem:read_text_file` immediately before any write — never rely on a version read earlier in the session.

### tool_search before first use of any deferred tool
All MCP tools (filesystem, CommWise, Slack, etc.) must be loaded via `tool_search` before their first call in a session. Do not guess parameter names — load the schema first.

---

*b2wise — Confidential*
