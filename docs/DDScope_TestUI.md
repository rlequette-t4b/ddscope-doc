# DDScope — Manual UI Test Tracker

*Protocol document. Test data (scenarios, issues) is stored in `tests/ddscope_tests.db` (SQLite, MCP-queryable). This file contains conventions and maintenance rules only — no data.*

---

## For AI Assistants — Maintenance Rules

### Data source

All test data lives in `tests/ddscope_tests.db`. Load `docs/DDScope_SQLite_Setup.md` for the schema and query patterns.

Do NOT look for data in this file — it contains protocol only.

### Schema overview

| Table / View | Role |
|---|---|
| `test_scenarios` | Scenario definitions — `id`, `area`, `scenario`, `feature`, `playwright`, `instructions`, `notes` |
| `test_issues` | Bugs and improvements — `id`, `type`, `description`, `priority`, `status` |
| `test_scenario_issues` | Join table — `scenario_id`, `issue_id` |
| `v_scenario_status` | View — scenarios with calculated `status`, issue counts (`open_count`, `fixed_count`, `wontfix_count`) |

`test_scenarios.status` is legacy and no longer the source of truth. Always read status from `v_scenario_status`.

### Scenario status — calculated from linked issues

| Linked issues | Calculated status |
|---|---|
| None | `empty` |
| At least one `open` | `fail` |
| All `fixed` or `wontfix` | `pass` |

### Adding a test result

1. If new bugs or improvements were found, insert rows in `test_issues` (status `open`).
2. Link them to the scenario via `test_scenario_issues`.
3. The scenario status updates automatically via `v_scenario_status`.
4. Regenerate the HTML viewer.

### Closing an issue (bug fixed or improvement implemented)

1. `UPDATE test_issues SET status = 'fixed' WHERE id = '...'` (or `wontfix`).
2. The linked scenario status recalculates automatically.
3. Regenerate the viewer.

### Adding a new scenario

1. Insert a row in `test_scenarios` with the next available `C.S` id in the appropriate category. Leave `status` at its default — it is ignored by the viewer.
2. Link any known issues via `test_scenario_issues`.
3. Regenerate the viewer.

### Updating a scenario

1. Run `UPDATE test_scenarios SET ... WHERE id = '...'` via MCP SQLite (e.g. `instructions`, `playwright`, `notes`).
2. Regenerate the viewer.

### When a Playwright test is added

- `UPDATE test_scenarios SET playwright = '...' WHERE id = '...'`
- Regenerate the viewer.

### Regenerating the viewer

```bash
node tests/generate_viewer.js
```

Reads `ddscope_tests.db` directly and rewrites `DDScope_TestUI_viewer.html`. Never edit the viewer manually.

---

## Conventions

### Index format

`C.S` where C = category number, S = scenario number within that category. Never renumber existing entries.

### Categories

- **C1** — Settings
- **C2** — Notes panel
- **C3** — Workspace & Projects

### Issue id format

- `B` prefix — Bug (e.g. `B2`, `B3`)
- `I` prefix — Improvement (e.g. `I1`, `I2`)

### Issue status values

| Value | Meaning |
|---|---|
| `open` | Known issue, not yet resolved |
| `fixed` | Resolved — linked scenarios will recalculate to `pass` if no other open issues remain |
| `wontfix` | Acknowledged but not planned for resolution |

### Scenario `instructions` field

Free-text field for describing how to manually test the scenario. Displayed in the viewer detail panel when populated. No structured format required.

### Scenario `notes` field

Free-text reference field. May hold informal cross-references or context. Not used for issue linking — use `test_scenario_issues` for that.

---

*b2wise — Confidential*
