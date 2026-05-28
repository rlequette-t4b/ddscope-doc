-- DDScope UI Test Tracker — SQLite schema
-- Versioned in Git. The .db file is excluded via .gitignore.
-- Last updated: 2026-05-28

-- UI test scenarios
CREATE TABLE IF NOT EXISTS test_scenarios (
  id           TEXT PRIMARY KEY,  -- format C.S (e.g. "2.9")
  area         TEXT NOT NULL,     -- e.g. "Notes panel"
  scenario     TEXT NOT NULL,     -- short description
  feature      TEXT NOT NULL,     -- e.g. "FEAT-002"
  status       TEXT NOT NULL,     -- legacy field — ignored by viewer; status is calculated via v_scenario_status
  date         TEXT,              -- ISO date or NULL if not tested
  playwright   TEXT DEFAULT '—', -- Playwright coverage
  notes        TEXT,              -- informal cross-references or context
  instructions TEXT               -- free-text instructions for manual testing
);

-- Bugs and improvements
CREATE TABLE IF NOT EXISTS test_issues (
  id          TEXT PRIMARY KEY,   -- e.g. "B4", "I1"
  type        TEXT NOT NULL,      -- Bug | Improvement
  description TEXT NOT NULL,
  scenarios   TEXT,               -- legacy field — superseded by test_scenario_issues join table
  priority    TEXT NOT NULL,      -- high | medium | low
  status      TEXT NOT NULL DEFAULT 'open', -- open | fixed | wontfix
  notes       TEXT                           -- free-text annotations (context, repro steps, decisions)
);

-- Scenario ↔ issue join table (replaces test_issues.scenarios)
CREATE TABLE IF NOT EXISTS test_scenario_issues (
  scenario_id TEXT NOT NULL,
  issue_id    TEXT NOT NULL,
  PRIMARY KEY (scenario_id, issue_id),
  FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id),
  FOREIGN KEY (issue_id)    REFERENCES test_issues(id)
);

-- Calculated scenario status view
-- status rules:
--   no linked issues          → 'empty'
--   at least one issue 'open' → 'fail'
--   all issues 'fixed' or 'wontfix' → 'pass'
CREATE VIEW IF NOT EXISTS v_scenario_status AS
SELECT
  s.id,
  s.area,
  s.scenario,
  s.feature,
  s.playwright,
  s.instructions,
  s.notes,
  CASE
    WHEN COUNT(si.issue_id) = 0 THEN 'empty'
    WHEN SUM(CASE WHEN i.status = 'open' THEN 1 ELSE 0 END) > 0 THEN 'fail'
    ELSE 'pass'
  END AS status,
  COUNT(si.issue_id)                                          AS issue_count,
  SUM(CASE WHEN i.status = 'open'    THEN 1 ELSE 0 END)      AS open_count,
  SUM(CASE WHEN i.status = 'fixed'   THEN 1 ELSE 0 END)      AS fixed_count,
  SUM(CASE WHEN i.status = 'wontfix' THEN 1 ELSE 0 END)      AS wontfix_count
FROM test_scenarios s
LEFT JOIN test_scenario_issues si ON si.scenario_id = s.id
LEFT JOIN test_issues i ON i.id = si.issue_id
GROUP BY s.id;
