# DDScope — UI Test Viewer Auto-Watcher

*Documents the background pipeline that automatically regenerates `DDScope_TestUI_viewer.html` when the SQLite database is updated.*

---

## Overview

A VS Code background task watches `tests/.db-updated` (a sentinel file) and re-runs `tests/generate_viewer.js` automatically when it changes. After every DB update in a session, Claude writes a timestamp to the sentinel — the watcher picks it up and regenerates the viewer instantly.

---

## Workflow

1. Claude updates `tests/ddscope_tests.db` via MCP SQLite.
2. Claude writes a timestamp to `tests/.db-updated` via filesystem MCP.
3. The watcher detects the sentinel change and re-runs `generate_viewer.js`.
4. `DDScope_TestUI_viewer.html` is up to date.

No manual command needed during a session.

---

## When to regenerate `generate_viewer.js`

The script itself must be updated (by asking Claude) when:

- A new **status value** is added (new badge, filter button, or stat counter needed)
- A new **column** is added to `test_scenarios` or `test_issues`
- The **HTML template** changes (layout, CSS, new section)
- The **SQLite schema** changes (renamed column, new table)

In all other cases — adding scenarios, updating statuses, linking issues — the sentinel touch is sufficient.

---

## Files

| File | Role |
|---|---|
| `tests/ddscope_tests.db` | Data source — updated via MCP SQLite |
| `tests/.db-updated` | Sentinel — touched by Claude after every DB update |
| `tests/generate_viewer.js` | SQLite reader + HTML generator |
| `tests/DDScope_TestUI_viewer.html` | Generated output — do not edit manually |
| `.vscode/tasks.json` | VS Code background task configuration |

---

## Manual Execution

To regenerate the viewer once without the watcher:

```bash
node tests/generate_viewer.js
```

---

## Background Watcher

### VS Code task configuration

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto-Watch DB Sentinel",
      "type": "shell",
      "command": "node --watch --watch-path=tests/.db-updated tests/generate_viewer.js",
      "runOptions": {
        "runOn": "folderOpen"
      },
      "presentation": {
        "reveal": "silent",
        "panel": "shared"
      }
    }
  ]
}
```

### Key configuration points

| Option | Value | Why |
|---|---|---|
| `--watch` | (flag) | Enables Node.js native file watcher |
| `--watch-path` | `tests/.db-updated` | Sentinel file — Node.js only watches JS/TS by default; `.db` binary changes are not reliably detected |
| `runOn` | `folderOpen` | Task starts automatically when the workspace is opened |
| `reveal` | `silent` | Terminal panel stays hidden — no popup on startup |

### Prerequisites

- Node.js 18 or later (native `--watch` support)
- VS Code with the workspace opened at the repo root
- **ESM context:** `package.json` declares `"type": "module"` — the script uses `import`, not `require`.

### First-time activation

VS Code may prompt "Allow automatic tasks" the first time. Accept to enable the watcher. Subsequent openings start it silently.

---

*b2wise — Confidential*
