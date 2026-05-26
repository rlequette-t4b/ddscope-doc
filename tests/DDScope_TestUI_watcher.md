# DDScope — UI Test Viewer Auto-Watcher

*Documents the background pipeline that automatically regenerates `DDScope_TestUI_viewer.html` when `DDScope_TestUI.md` is saved.*

---

## Overview

A VS Code background task watches `tests/DDScope_TestUI.md` and re-runs `tests/generate_viewer.js` automatically on every save. No manual command needed — the viewer stays in sync with the tracker at all times.

---

## When to regenerate `generate_viewer.js`

The script itself must be regenerated (by asking Claude to update it) when:

- A new **status value** is added to the tracker (e.g. a new badge, filter button, or stat counter is needed in the viewer)
- A new **column** is added to the Summary table or Bugs table
- The **HTML template** of the viewer changes (layout, CSS, new section)
- The **Markdown structure** of `DDScope_TestUI.md` changes (new section heading, renamed section, changed column order)

In all other cases — adding scenarios, updating statuses, editing results — simply run `node tests/generate_viewer.js`. No script changes needed.

---

## Files

| File | Role |
|---|---|
| `tests/DDScope_TestUI.md` | Source of truth — edit this file |
| `tests/generate_viewer.js` | Parser + HTML generator |
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

### How it works

The native `node --watch` feature (Node.js 18+) is used to restart the script when a watched file changes. The `--watch-path` option is required because Node.js does not natively track non-JS/TS dependencies such as `.md` files — without it, changes to the Markdown file would not trigger a restart.

### VS Code task configuration

The watcher is configured as a VS Code background task in `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto-Watch Markdown Source",
      "type": "shell",
      "command": "node --watch --watch-path=tests/DDScope_TestUI.md tests/generate_viewer.js",
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
| `--watch-path` | `tests/DDScope_TestUI.md` | Required to watch a `.md` file — Node.js only watches JS/TS by default |
| `runOn` | `folderOpen` | Task starts automatically when the workspace is opened in VS Code |
| `reveal` | `silent` | Terminal panel stays hidden — no popup on startup |
| Process lifecycle | — | The Node.js process is safely killed by VS Code when the workspace or window is closed |

### Prerequisites

- Node.js 18 or later (for native `--watch` support)
- VS Code with the workspace opened at the repo root
- **ESM context:** `package.json` declares `"type": "module"` — the script uses `import`, not `require`. Any modification to `generate_viewer.js` must preserve this.

### First-time activation

VS Code may prompt "Allow automatic tasks" the first time the workspace is opened after adding `tasks.json`. Accept to enable the watcher. Subsequent openings start it silently.

---

*b2wise — Confidential*
