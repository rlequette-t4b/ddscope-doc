# DDScope — Manual UI Test Tracker

*Living document. Records manual UI tests performed during development sessions. Serves as a non-regression reference and future input for Playwright test authoring.*

---

## For AI Assistants — Maintenance Rules

This file has three sections that must stay in sync:

1. **Summary table** — one row per test scenario, with a link to the detail entry.
2. **Test plan** — groups of scenarios per feature, listing what still needs testing.
3. **Test detail entries** — full step-by-step records below the `---` separator.

**When adding a new test result:**
1. Add a row in the Summary table (Status, Date, Playwright coverage).
2. Find the matching scenario in the Test plan and mark it `tested`.
3. Add the full detail entry at the bottom of the file.
4. Update the Version History.
5. **Regenerate the HTML viewer** — run `node tests/generate_viewer.js` from the repo root. The script parses this file automatically.

**When a Playwright test is added for a scenario:**
- Update the `Playwright` column in the Summary table.
- Update the detail entry's `Playwright:` field.

**Anchor convention:** each detail entry heading must have a unique lowercase kebab-case anchor matching the `#link` in the Summary table. Example: `### Settings — Note category create` → link is `#settings--note-category-create`.

**Index convention:** the `#` column uses the format `C.S` where C = category number and S = scenario number within that category. Categories are defined below. When adding a new scenario, use the next available S within the appropriate category. Never renumber existing entries.

**Categories:**
- **C1** — Settings
- **C2** — Notes panel

**Status values:** `pass` | `fail` | `partial` | `pending` (planned but not yet tested) | `ready` (created or fixed by Claude, awaiting manual test)

**Regenerate the HTML viewer:** run `node tests/generate_viewer.js` from the repo root. The script parses this file and regenerates `DDScope_TestUI_viewer.html` automatically — no manual data entry in the viewer.

---

## Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | May 2026 | Initial document — FEAT-002 note categories (Settings tab) |
| 0.2 | May 2026 | Summary table + test plan added; FEAT-002 notes panel plan added |
| 0.3 | May 2026 | Test results recorded for 5–16; bugs and improvements logged |
| 0.4 | May 2026 | 16 corrected to fail (B5), 17 corrected to pass |
| 0.5 | May 2026 | Index renumbered to C.S format (C1=Settings, C2=Notes panel) |
| 0.6 | May 2026 | Status `ready` added; generate_viewer.js script created |
| 0.7 | May 2026 | 2.3, 2.4, 2.6, 2.7, 2.9, 2.10, 2.11, 2.12 → ready (B1–B5, I1–I4 fixed) |

---

## Summary Table

| # | Area | Scenario | Feature | Status | Date | Playwright |
|---|---|---|---|---|---|---|
| 1.1 | Settings | [Note category create](#settings--note-category-create) | FEAT-002 | pass | 2026-05-26 | — |
| 1.2 | Settings | [Note category edit](#settings--note-category-edit) | FEAT-002 | pass | 2026-05-26 | — |
| 1.3 | Settings | [Note category delete](#settings--note-category-delete) | FEAT-002 | pass | 2026-05-26 | — |
| 1.4 | Settings | [Note category reorder](#settings--note-category-reorder) | FEAT-002 | pass | 2026-05-26 | — |
| 2.1 | Notes panel | [Panel visible on project open](#notes-panel--panel-visible-on-project-open) | FEAT-002 | pass | 2026-05-26 | — |
| 2.2 | Notes panel | [Panel hidden when no project open](#notes-panel--panel-hidden-when-no-project-open) | FEAT-002 | partial | 2026-05-26 | — |
| 2.3 | Notes panel | [Categories from Settings appear](#notes-panel--categories-from-settings-appear) | FEAT-002 | ready | — | — |
| 2.4 | Notes panel | [Add note in a category](#notes-panel--add-note-in-a-category) | FEAT-002 | ready | — | — |
| 2.5 | Notes panel | [Edit note inline](#notes-panel--edit-note-inline) | FEAT-002 | pass | 2026-05-26 | — |
| 2.6 | Notes panel | [Delete note](#notes-panel--delete-note) | FEAT-002 | ready | — | — |
| 2.7 | Notes panel | [Reorder notes](#notes-panel--reorder-notes) | FEAT-002 | ready | — | — |
| 2.8 | Notes panel | [Collapse and expand a category](#notes-panel--collapse-and-expand-a-category) | FEAT-002 | pass | 2026-05-26 | — |
| 2.9 | Notes panel | [Collapse and expand the whole panel](#notes-panel--collapse-and-expand-the-whole-panel) | FEAT-002 | ready | — | — |
| 2.10 | Notes panel | [Resize the panel by dragging](#notes-panel--resize-the-panel-by-dragging) | FEAT-002 | ready | — | — |
| 2.11 | Notes panel | [Notes persist on map switch](#notes-panel--notes-persist-on-map-switch) | FEAT-002 | ready | — | — |
| 2.12 | Notes panel | [Undo note create](#notes-panel--undo-note-create) | FEAT-002 | ready | — | — |
| 2.13 | Notes panel | [Undo note delete](#notes-panel--undo-note-delete) | FEAT-002 | pass | 2026-05-26 | — |

---

## Bugs & Improvements Logged

Issues found during testing on 2026-05-26. Each item links to the backlog or is tracked here until triaged.

| # | Type | Description | Scenario | Priority |
|---|---|---|---|---|
| B1 | Bug | New category created in Settings does not appear in notes panel without reload | 2.3 | high |
| B2 | Bug | Empty note created when clicking outside after "+ note" with no text | 2.4 | medium |
| B3 | Bug | Empty categories (no notes on active map) shown in panel — should be hidden | 2.11 | medium |
| B4 | Bug | No way to re-expand the panel once collapsed (no button or gesture) | 2.9 | high |
| B5 | Bug | Undo on note create only clears the content — note record not removed | 2.12 | high |
| I1 | Improvement | Note action buttons (↑↓×) appear far right — hard to reach, especially on wide notes | 2.6, 2.7 | medium |
| I2 | Improvement | Category label needs stronger visual treatment (bold + underline or separator) | — | low |
| I3 | Improvement | "+ note" button not distinct enough from note bullets | — | low |
| I4 | Improvement | Panel collapse/expand state should persist across map switches | — | medium |
| I5 | Improvement | Add a "Close project" button (note for backlog) | 2.2 | low |

---

## Test Plan

### FEAT-002 — Settings tab: Note categories (C1)

| Scenario | Status |
|---|---|
| Create a category | tested |
| Edit a category label | tested |
| Delete a category | tested |
| Reorder categories with ↑↓ | tested |

### FEAT-002 — Notes panel (C2)

| Scenario | Status |
|---|---|
| Panel is visible after opening a project | tested |
| Panel is hidden when no project is open | tested (partial — no close project button) |
| Categories defined in Settings appear as sections | tested (partial — B1) |
| Add a note in a category (click "+ note") | tested (partial — B2) |
| Edit a note inline (click text, type, blur or Enter) | tested |
| Delete a note (× button) | tested (partial — I1) |
| Reorder notes within a category (↑↓ buttons) | tested (partial — I1) |
| Collapse / expand an individual category | tested |
| Collapse / expand the whole panel (header button) | tested (partial — B4) |
| Resize panel by dragging the top handle | tested |
| Notes are still visible after switching maps | tested (partial — B3) |
| Undo note create (Ctrl+Z) | tested (fail — B5) |
| Undo note delete (Ctrl+Z) | tested |

---

## Test Detail Entries

---

### Settings — Note category create

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Open Settings tab.
2. Click "+ Add" in Note categories section.
3. Type a label in the modal.
4. Click "Save and Close".

Result: Category appears in the table. Modal closes correctly.
Notes: Bug found and fixed during this session — `_validateModal` was blocking "Save and Close" because `notecat` was not excluded from the `needsCode` check.

---

### Settings — Note category edit

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Open Settings tab.
2. Click "Edit" on an existing note category.
3. Change the label.
4. Click "Save".

Result: Label updated in the table.

---

### Settings — Note category delete

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Open Settings tab.
2. Click "Delete" on a note category.
3. Confirm the prompt.

Result: Category removed from the table.

---

### Settings — Note category reorder

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Open Settings tab with at least 2 note categories.
2. Click ↑ or ↓ on a category.

Result: Category moves up or down in the list.

---

### Notes panel — Panel visible on project open

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Open the app with no project loaded — confirm notes panel is not visible.
2. Open or create a project.
3. Switch to the Map tab.

Result: Notes panel appears below the canvas.

---

### Notes panel — Panel hidden when no project open

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Open a project — confirm notes panel is visible.
2. Attempt to close the project.

Result: Partially tested. No "Close project" button exists — tested by reloading without opening a project. Panel correctly hidden in that state.
Notes: I5 logged — backlog item to add a Close project button.

---

### Notes panel — Categories from Settings appear

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. In Settings, create two note categories.
2. Switch to the Map tab.

Result: Categories created before opening the panel appear correctly. However, a category created in Settings while the panel is already open does not appear without a page interaction.
Notes: B1 logged — panel does not react to category changes made in Settings without a manual reload trigger.

---

### Notes panel — Add note in a category

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Click "+ note" under a category.
2. Type content.
3. Press Enter or click elsewhere.

Result: Note created and saved correctly when text is entered. However, clicking elsewhere with an empty text field creates an empty note.
Notes: B2 logged — empty note should be discarded on blur if content is empty.

---

### Notes panel — Edit note inline

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Click on an existing note's text.
2. Change the content.
3. Press Enter or click elsewhere.

Result: Note content updated correctly.

---

### Notes panel — Delete note

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Hover over a note to reveal action buttons.
2. Click ×.

Result: Note deleted correctly. However, action buttons appear far to the right of the note text, making them hard to reach on wide notes.
Notes: I1 logged — action buttons positioning needs improvement.

---

### Notes panel — Reorder notes

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Create at least 2 notes in the same category.
2. Hover over a note and click ↑ or ↓.

Result: Notes reorder correctly. Same UX issue as 2.6 — buttons appear too far right.
Notes: I1 logged.

---

### Notes panel — Collapse and expand a category

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Click on a category header.
2. Click again.

Result: Category collapses and expands correctly.

---

### Notes panel — Collapse and expand the whole panel

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Click the collapse button (∨) in the notes panel header.
2. Attempt to re-expand.

Result: Panel collapses to header height correctly. Re-expanding is not possible — the collapse button becomes inaccessible or non-functional when panel is collapsed.
Notes: B4 logged — need a visible way to re-expand the collapsed panel (e.g. clicking the header itself expands it).

---

### Notes panel — Resize the panel by dragging

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Hover over the top edge of the notes panel.
2. Drag upward to increase height, downward to decrease.

Result: Panel resizes correctly in real time.

---

### Notes panel — Notes persist on map switch

Date: 2026-05-26
Feature: FEAT-002
Status: partial
Playwright: —

Steps:
1. Add a note on Map 1.
2. Switch to Map 2.
3. Switch back to Map 1.

Result: Note persists on Map 1. However, empty categories (categories with no notes on the active map) are still visible in the panel — they should be hidden.
Notes: B3 logged — filter out categories with no visible notes on the active map.

---

### Notes panel — Undo note create

Date: 2026-05-26
Feature: FEAT-002
Status: fail
Playwright: —

Steps:
1. Add a note in the notes panel.
2. Press Ctrl+Z.

Result: Undo only clears the note content (empty text) — the note record itself is not removed from the panel.
Notes: B5 logged. Root cause: the `blur` event fires before the undo snapshot is committed, writing the empty string back to the store. The note record survives undo.

---

### Notes panel — Undo note delete

Date: 2026-05-26
Feature: FEAT-002
Status: pass
Playwright: —

Steps:
1. Delete a note (× button).
2. Press Ctrl+Z.

Result: Note reappears correctly.

---

*b2wise — Confidential*
