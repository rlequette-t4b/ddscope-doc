#!/usr/bin/env node
// generate_viewer.js
// Reads tests/ddscope_tests.db (SQLite) and regenerates tests/DDScope_TestUI_viewer.html.
// Usage (from repo root): node tests/generate_viewer.js
//
// IMPORTANT — ESM only: package.json declares "type": "module".
// Use import/export, not require(). __dirname is not available natively —
// use: const __dirname = dirname(fileURLToPath(import.meta.url))
//
// Data sources:
//   view  v_scenario_status     → SCENARIOS (id, area, scenario, feature, status [calculated],
//                                             playwright, instructions, open_count, fixed_count, wontfix_count)
//   table test_issues           → ISSUES (id, type, description, priority, status)
//   table test_scenario_issues  → join table (scenario_id, issue_id)
//
// When regenerating this script (e.g. to add a new status or change the HTML template):
//   1. Read this file to understand the data loading logic and the HTML template.
//   2. Preserve the ESM imports and the __dirname shim at the top.
//   3. Update only the section(s) that changed.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const DB_PATH  = join(__dirname, 'ddscope_tests.db');
const OUT_PATH = join(__dirname, 'DDScope_TestUI_viewer.html');

// ── Load from SQLite ───────────────────────────────────────────────────────

const db = new Database(DB_PATH, { readonly: true });

const SCENARIOS = db.prepare('SELECT * FROM v_scenario_status ORDER BY id').all().map(function(r) {
  return {
    id:           r.id,
    area:         r.area,
    scenario:     r.scenario,
    feature:      r.feature,
    status:       r.status,           // calculated: pass | fail | empty
    playwright:   r.playwright || '—',
    instructions: r.instructions || '',
    issue_count:  r.issue_count  || 0,
    open_count:   r.open_count   || 0,
    fixed_count:  r.fixed_count  || 0,
    wontfix_count:r.wontfix_count|| 0
  };
});

const ISSUES = db.prepare('SELECT * FROM test_issues ORDER BY id').all().map(function(r) {
  return {
    id:          r.id,
    type:        r.type,
    description: r.description,
    priority:    r.priority,
    status:      r.status || 'open',  // open | fixed | wontfix
    notes:       r.notes || ''
  };
});

// join: scenario_id → [issue_id, ...]
const SCENARIO_ISSUES = {};
db.prepare('SELECT scenario_id, issue_id FROM test_scenario_issues').all().forEach(function(r) {
  if (!SCENARIO_ISSUES[r.scenario_id]) SCENARIO_ISSUES[r.scenario_id] = [];
  SCENARIO_ISSUES[r.scenario_id].push(r.issue_id);
});

// join: issue_id → [scenario_id, ...]
const ISSUE_SCENARIOS = {};
db.prepare('SELECT scenario_id, issue_id FROM test_scenario_issues').all().forEach(function(r) {
  if (!ISSUE_SCENARIOS[r.issue_id]) ISSUE_SCENARIOS[r.issue_id] = [];
  ISSUE_SCENARIOS[r.issue_id].push(r.scenario_id);
});

// lookup maps
const SCENARIO_MAP = {};
SCENARIOS.forEach(function(s) { SCENARIO_MAP[s.id] = s; });
const ISSUE_MAP = {};
ISSUES.forEach(function(i) { ISSUE_MAP[i.id] = i; });

db.close();

// ── JSON serialisation helpers ─────────────────────────────────────────────

function jsStr(s)  { return JSON.stringify(String(s || '')); }
function jsNum(n)  { return JSON.stringify(Number(n || 0)); }
function jsArr(a)  { return JSON.stringify(a || []); }

function scenariosJson() {
  return '[\n' + SCENARIOS.map(function(s) {
    return '  {id:' + jsStr(s.id) + ',area:' + jsStr(s.area) + ',scenario:' + jsStr(s.scenario) +
      ',feature:' + jsStr(s.feature) + ',status:' + jsStr(s.status) +
      ',playwright:' + jsStr(s.playwright) + ',instructions:' + jsStr(s.instructions) +
      ',issue_count:' + jsNum(s.issue_count) + ',open_count:' + jsNum(s.open_count) +
      ',fixed_count:' + jsNum(s.fixed_count) + ',wontfix_count:' + jsNum(s.wontfix_count) + '}';
  }).join(',\n') + '\n]';
}

function issuesJson() {
  return '[\n' + ISSUES.map(function(i) {
    return '  {id:' + jsStr(i.id) + ',type:' + jsStr(i.type) + ',description:' + jsStr(i.description) +
      ',priority:' + jsStr(i.priority) + ',status:' + jsStr(i.status) + ',notes:' + jsStr(i.notes) + '}';
  }).join(',\n') + '\n]';
}

function scenarioIssuesJson() {
  var entries = Object.keys(SCENARIO_ISSUES).map(function(sid) {
    return '  ' + jsStr(sid) + ':' + jsArr(SCENARIO_ISSUES[sid]);
  });
  return '{\n' + entries.join(',\n') + '\n}';
}

function issueScenariosJson() {
  var entries = Object.keys(ISSUE_SCENARIOS).map(function(iid) {
    return '  ' + jsStr(iid) + ':' + jsArr(ISSUE_SCENARIOS[iid]);
  });
  return '{\n' + entries.join(',\n') + '\n}';
}

var today = new Date().toISOString().slice(0, 10);

// ── HTML ───────────────────────────────────────────────────────────────────

var html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DDScope \u2014 UI Test Tracker</title>
<!-- Generated by tests/generate_viewer.js on ${today} \u2014 do not edit manually -->
<style>
  :root {
    --bg:#f5f6f8; --surface:#fff; --border:#e2e5eb; --text:#1a2130; --muted:#6b7280; --subtle:#9ca3af;
    --pass:#16a34a;    --pass-bg:#f0fdf4;   --pass-bd:#bbf7d0;
    --fail:#dc2626;    --fail-bg:#fef2f2;   --fail-bd:#fecaca;
    --empty:#9ca3af;   --empty-bg:#f8f9fb;  --empty-bd:#e5e7eb;
    --fixed:#16a34a;   --fixed-bg:#f0fdf4;  --fixed-bd:#bbf7d0;
    --open:#dc2626;    --open-bg:#fef2f2;   --open-bd:#fecaca;
    --wontfix:#6b7280; --wontfix-bg:#f8f9fb;--wontfix-bd:#e5e7eb;
    --accent:#2563eb;  --accent-bg:#eff6ff; --accent-bd:#bfdbfe;
    --partial:#d97706; --partial-bg:#fffbeb;--partial-bd:#fde68a;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;padding:28px 24px}
  header{display:flex;align-items:baseline;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--text)}
  header h1{font-size:19px;font-weight:700;letter-spacing:-.01em}
  header .subtitle{font-size:12px;color:var(--muted)}
  header .version{margin-left:auto;font-size:11px;color:var(--subtle);font-family:monospace}

  /* View switch */
  .view-switch{display:flex;gap:0;margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;width:fit-content}
  .view-btn{font-size:13px;font-family:inherit;font-weight:600;padding:8px 24px;border:none;background:transparent;color:var(--muted);cursor:pointer;transition:all .12s;border-right:1px solid var(--border)}
  .view-btn:last-child{border-right:none}
  .view-btn:hover{background:var(--bg);color:var(--text)}
  .view-btn.active{background:var(--accent);color:#fff}

  /* Stats bar */
  .stats{display:flex;margin-bottom:18px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden}
  .stat{flex:1;padding:11px 16px;border-right:1px solid var(--border)}
  .stat:last-child{border-right:none;flex:none}
  .stat-num{font-size:20px;font-weight:700;line-height:1}
  .stat-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:1px}
  .stat-pass    .stat-num{color:var(--pass)}
  .stat-fail    .stat-num{color:var(--fail)}
  .stat-empty   .stat-num{color:var(--empty)}
  .stat-open    .stat-num{color:var(--open)}
  .stat-fixed   .stat-num{color:var(--fixed)}
  .stat-wontfix .stat-num{color:var(--wontfix)}

  /* Filters */
  .filters{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
  .filter-group{display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px}
  .filter-label{font-size:10px;color:var(--muted);padding:0 6px;text-transform:uppercase;letter-spacing:.08em}
  .filter-btn{font-size:12px;font-family:inherit;padding:3px 10px;border-radius:4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:500;transition:all .1s}
  .filter-btn:hover{background:var(--bg);color:var(--text)}
  .filter-btn.active{background:var(--accent);color:#fff}
  .search-wrap{margin-left:auto}
  .search-input{font-family:inherit;font-size:13px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 11px;width:220px;outline:none;transition:border-color .12s}
  .search-input:focus{border-color:var(--accent)}
  .search-input::placeholder{color:var(--subtle)}

  /* Table */
  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}
  thead tr{border-bottom:1px solid var(--border)}
  th{padding:9px 13px;text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;cursor:pointer;user-select:none;white-space:nowrap;background:var(--bg)}
  th:hover{color:var(--text)} th.sorted{color:var(--accent)}
  th .sa{opacity:.35;margin-left:3px;font-size:9px} th.sorted .sa{opacity:1}
  tbody tr{border-bottom:1px solid var(--border);transition:background .08s;cursor:pointer}
  tbody tr:last-child{border-bottom:none}
  tbody tr:hover{background:#f0f4ff}
  tbody tr.hidden{display:none}
  tbody tr.selected{background:var(--accent-bg)}
  td{padding:8px 13px;vertical-align:middle}
  .cell-id{color:var(--subtle);font-size:11px;font-family:monospace;white-space:nowrap}
  .cell-area{color:var(--muted);white-space:nowrap;font-size:12px}
  .cell-scenario{color:var(--text);font-weight:500}
  .cell-feature{color:var(--subtle);font-size:11px;font-family:monospace}
  .cell-date,.cell-pw{color:var(--subtle);font-size:11px;white-space:nowrap}
  .cell-desc{color:var(--text);max-width:420px}
  .cell-count{color:var(--muted);font-size:12px;text-align:center}
  .empty-row{padding:36px;text-align:center;color:var(--muted)}

  /* Badges */
  .badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
  .badge-pass    {background:var(--pass-bg);    color:var(--pass);    border:1px solid var(--pass-bd)}
  .badge-fail    {background:var(--fail-bg);    color:var(--fail);    border:1px solid var(--fail-bd)}
  .badge-empty   {background:var(--empty-bg);   color:var(--empty);   border:1px solid var(--empty-bd)}
  .badge-open    {background:var(--open-bg);    color:var(--open);    border:1px solid var(--open-bd)}
  .badge-fixed   {background:var(--fixed-bg);   color:var(--fixed);   border:1px solid var(--fixed-bd)}
  .badge-wontfix {background:var(--wontfix-bg); color:var(--wontfix); border:1px solid var(--wontfix-bd)}
  .badge-bug     {background:var(--fail-bg);    color:var(--fail);    border:1px solid var(--fail-bd)}
  .badge-improvement{background:var(--accent-bg);color:var(--accent); border:1px solid var(--accent-bd)}
  .badge-test    {background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe}
  .prio-high  {color:var(--fail);   font-weight:700;font-size:11px}
  .prio-medium{color:var(--partial);font-weight:700;font-size:11px}
  .prio-low   {color:var(--subtle); font-weight:600;font-size:11px}

  /* Detail panel */
  .detail-hint{font-size:11px;color:var(--subtle);margin-bottom:12px}
  .detail-panel{background:var(--surface);border:1px solid var(--accent-bd);border-radius:8px;padding:20px 24px;margin-bottom:24px;display:none}
  .detail-panel.visible{display:block}
  .detail-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
  .detail-id{font-family:monospace;font-size:12px;color:var(--subtle);padding-top:2px;flex-shrink:0}
  .detail-title{font-size:15px;font-weight:700;color:var(--text);flex:1}
  .detail-close{background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;line-height:1;padding:0 2px}
  .detail-close:hover{color:var(--text)}
  .detail-meta{display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap}
  .detail-meta-item{font-size:11px;color:var(--muted)}
  .detail-meta-item strong{color:var(--text)}
  .detail-section{margin-bottom:12px}
  .detail-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px}
  .detail-list{display:flex;flex-direction:column;gap:6px}
  .detail-row{font-size:12px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
  .detail-row-id{font-family:monospace;font-size:11px;color:var(--subtle);flex-shrink:0;min-width:32px}
  .detail-empty{font-size:12px;color:var(--subtle);font-style:italic}
  .detail-instructions{font-size:12px;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 14px;white-space:pre-wrap;line-height:1.6}

  footer{margin-top:28px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--subtle)}
</style>
</head>
<body>
<header>
  <h1>DDScope \u2014 UI Test Tracker</h1>
  <span class="subtitle">Manual test results &amp; non-regression reference</span>
  <span class="version">${today}</span>
</header>

<div class="view-switch">
  <button class="view-btn active" id="btn-view-scenarios">Scenarios</button>
  <button class="view-btn" id="btn-view-issues">Issues</button>
</div>

<!-- ═══════════════ SCENARIOS VIEW ═══════════════ -->
<div id="view-scenarios">
  <div class="stats" id="stats-scenarios"></div>
  <div class="filters" id="filters-scenarios">
    <div class="filter-group">
      <span class="filter-label">Area</span>
      <button class="filter-btn active" data-sf="area" data-value="all">All</button>
      <button class="filter-btn" data-sf="area" data-value="Settings">C1 Settings</button>
      <button class="filter-btn" data-sf="area" data-value="Notes panel">C2 Notes panel</button>
    </div>
    <div class="filter-group">
      <span class="filter-label">Status</span>
      <button class="filter-btn active" data-sf="status" data-value="all">All</button>
      <button class="filter-btn" data-sf="status" data-value="pass">Pass</button>
      <button class="filter-btn" data-sf="status" data-value="fail">Fail</button>
      <button class="filter-btn" data-sf="status" data-value="empty">Empty</button>
    </div>
    <div class="search-wrap"><input class="search-input" id="search-scenarios" type="text" placeholder="Search scenarios\u2026"></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th data-sc="id">#<span class="sa">\u2195</span></th>
        <th data-sc="area">Area<span class="sa">\u2195</span></th>
        <th data-sc="scenario">Scenario<span class="sa">\u2195</span></th>
        <th data-sc="feature">Feature<span class="sa">\u2195</span></th>
        <th data-sc="status">Status<span class="sa">\u2195</span></th>
        <th data-sc="playwright">Playwright<span class="sa">\u2195</span></th>
        <th data-sc="issue_count" style="text-align:center">Issues<span class="sa">\u2195</span></th>
      </tr></thead>
      <tbody id="tbody-scenarios"></tbody>
    </table>
    <div class="empty-row" id="empty-scenarios" style="display:none">No matching scenarios.</div>
  </div>
  <p class="detail-hint">Click a row to see linked issues.</p>
  <div class="detail-panel" id="detail-scenario">
    <div class="detail-header">
      <span class="detail-id" id="ds-id"></span>
      <span class="detail-title" id="ds-title"></span>
      <button class="detail-close" id="ds-close">&times;</button>
    </div>
    <div class="detail-meta" id="ds-meta"></div>
    <div class="detail-section" id="ds-instructions-section" style="display:none">
      <div class="detail-section-title">Instructions</div>
      <div class="detail-instructions" id="ds-instructions"></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Linked issues</div>
      <div class="detail-list" id="ds-issues"></div>
    </div>
  </div>
</div>

<!-- ═══════════════ ISSUES VIEW ═══════════════ -->
<div id="view-issues" style="display:none">
  <div class="stats" id="stats-issues"></div>
  <div class="filters" id="filters-issues">
    <div class="filter-group">
      <span class="filter-label">Type</span>
      <button class="filter-btn active" data-if="type" data-value="all">All</button>
      <button class="filter-btn" data-if="type" data-value="Bug">Bug</button>
      <button class="filter-btn" data-if="type" data-value="Improvement">Improvement</button>
      <button class="filter-btn" data-if="type" data-value="Test">Test</button>
    </div>
    <div class="filter-group">
      <span class="filter-label">Status</span>
      <button class="filter-btn active" data-if="status" data-value="all">All</button>
      <button class="filter-btn" data-if="status" data-value="open">Open</button>
      <button class="filter-btn" data-if="status" data-value="fixed">Fixed</button>
      <button class="filter-btn" data-if="status" data-value="wontfix">Wontfix</button>
    </div>
    <div class="filter-group">
      <span class="filter-label">Priority</span>
      <button class="filter-btn active" data-if="priority" data-value="all">All</button>
      <button class="filter-btn" data-if="priority" data-value="high">High</button>
      <button class="filter-btn" data-if="priority" data-value="medium">Medium</button>
      <button class="filter-btn" data-if="priority" data-value="low">Low</button>
    </div>
    <div class="search-wrap"><input class="search-input" id="search-issues" type="text" placeholder="Search issues\u2026"></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th data-ic="id">#<span class="sa">\u2195</span></th>
        <th data-ic="type">Type<span class="sa">\u2195</span></th>
        <th data-ic="description">Description<span class="sa">\u2195</span></th>
        <th data-ic="status">Status<span class="sa">\u2195</span></th>
        <th data-ic="priority">Priority<span class="sa">\u2195</span></th>
        <th style="text-align:center">Scenarios</th>
      </tr></thead>
      <tbody id="tbody-issues"></tbody>
    </table>
    <div class="empty-row" id="empty-issues" style="display:none">No matching issues.</div>
  </div>
  <p class="detail-hint">Click a row to see linked scenarios.</p>
  <div class="detail-panel" id="detail-issue">
    <div class="detail-header">
      <span class="detail-id" id="di-id"></span>
      <span class="detail-title" id="di-title"></span>
      <button class="detail-close" id="di-close">&times;</button>
    </div>
    <div class="detail-meta" id="di-meta"></div>
    <div class="detail-section" id="di-notes-section" style="display:none">
      <div class="detail-section-title">Notes</div>
      <div class="detail-instructions" id="di-notes"></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Linked scenarios</div>
      <div class="detail-list" id="di-scenarios"></div>
    </div>
  </div>
</div>

<footer>b2wise \u2014 Confidential &nbsp;&middot;&nbsp; Regenerate: <code>node tests/generate_viewer.js</code></footer>

<script>
var SCENARIOS      = ${scenariosJson()};
var ISSUES         = ${issuesJson()};
var SCENARIO_ISSUES = ${scenarioIssuesJson()};
var ISSUE_SCENARIOS = ${issueScenariosJson()};
var SCENARIO_MAP   = {};
SCENARIOS.forEach(function(s){ SCENARIO_MAP[s.id]=s; });
var ISSUE_MAP = {};
ISSUES.forEach(function(i){ ISSUE_MAP[i.id]=i; });

// ── Shared ─────────────────────────────────────────────────────────────────

function badge(cls, label) {
  return '<span class="badge badge-'+cls+'">'+label+'</span>';
}
function statusBadge(s) { return badge(s, s); }
function typeBadge(t)   { return badge(t==='Bug'?'bug':t==='Improvement'?'improvement':'test', t); }
function prioBadge(p)   { return '<span class="prio-'+p+'">'+p+'</span>'; }

// ── View switch ────────────────────────────────────────────────────────────

var _view = 'scenarios';
document.getElementById('btn-view-scenarios').addEventListener('click', function() { switchView('scenarios'); });
document.getElementById('btn-view-issues').addEventListener('click',    function() { switchView('issues'); });

function switchView(v) {
  _view = v;
  document.getElementById('btn-view-scenarios').classList.toggle('active', v==='scenarios');
  document.getElementById('btn-view-issues').classList.toggle('active',    v==='issues');
  document.getElementById('view-scenarios').style.display = v==='scenarios'?'':'none';
  document.getElementById('view-issues').style.display    = v==='issues'?'':'none';
  _selS = null; _selI = null;
  document.getElementById('detail-scenario').classList.remove('visible');
  document.getElementById('detail-issue').classList.remove('visible');
  if (v==='scenarios') renderScenarios();
  else renderIssues();
}

// ── SCENARIOS VIEW ─────────────────────────────────────────────────────────

var _sfa='all', _sfs='all', _sq='', _ssc='id', _ssd=1, _selS=null;

function renderScenarios() {
  var rows = SCENARIOS.slice().sort(function(a,b){
    if (_ssc==='id') {
      var ap=a.id.split('.').map(Number), bp=b.id.split('.').map(Number);
      return _ssd*((ap[0]-bp[0])||((ap[1]||0)-(bp[1]||0)));
    }
    if (_ssc==='issue_count') return _ssd*(a.issue_count - b.issue_count);
    return _ssd*(String(a[_ssc]||'')).localeCompare(String(b[_ssc]||''));
  });

  var tbody = document.getElementById('tbody-scenarios');
  tbody.innerHTML = '';
  var vis = 0;

  rows.forEach(function(s) {
    var match = (_sfa==='all'||s.area===_sfa)
      && (_sfs==='all'||s.status===_sfs)
      && (!_sq || s.scenario.toLowerCase().includes(_sq) || s.id.includes(_sq));
    var tr = document.createElement('tr');
    if (!match) { tr.classList.add('hidden'); } else { vis++; }
    if (s.id===_selS) tr.classList.add('selected');
    // issue count display
    var countHtml = s.issue_count===0
      ? '<span style="color:var(--subtle)">—</span>'
      : '<span style="font-size:11px">'+(s.open_count>0?'<span style="color:var(--open)">'+s.open_count+' open</span>':'')
        +(s.open_count>0&&s.fixed_count>0?' · ':'')
        +(s.fixed_count>0?'<span style="color:var(--fixed)">'+s.fixed_count+' fixed</span>':'')
        +(s.wontfix_count>0?' · <span style="color:var(--wontfix)">'+s.wontfix_count+' wontfix</span>':'')
        +'</span>';
    tr.innerHTML = '<td class="cell-id">'+s.id+'</td>'
      +'<td class="cell-area">'+s.area+'</td>'
      +'<td class="cell-scenario">'+s.scenario+'</td>'
      +'<td class="cell-feature">'+s.feature+'</td>'
      +'<td>'+statusBadge(s.status)+'</td>'
      +'<td class="cell-pw">'+s.playwright+'</td>'
      +'<td class="cell-count">'+countHtml+'</td>';
    tr.addEventListener('click', function(){ selectScenario(s.id); });
    tbody.appendChild(tr);
  });

  document.getElementById('empty-scenarios').style.display = vis===0 ? '' : 'none';
  renderStatsScenarios(vis);
}

function renderStatsScenarios(vis) {
  var c = {pass:0, fail:0, empty:0};
  SCENARIOS.forEach(function(s){
    if ((_sfa==='all'||s.area===_sfa) && (_sfs==='all'||s.status===_sfs) && (!_sq||s.scenario.toLowerCase().includes(_sq)))
      c[s.status] = (c[s.status]||0)+1;
  });
  document.getElementById('stats-scenarios').innerHTML =
    '<div class="stat stat-pass"><div class="stat-num">'+c.pass+'</div><div class="stat-label">Pass</div></div>'+
    '<div class="stat stat-fail"><div class="stat-num">'+c.fail+'</div><div class="stat-label">Fail</div></div>'+
    '<div class="stat stat-empty"><div class="stat-num">'+c.empty+'</div><div class="stat-label">Empty</div></div>'+
    '<div class="stat"><div class="stat-num" style="color:var(--muted)">'+vis+' / '+SCENARIOS.length+'</div><div class="stat-label">Showing</div></div>';
}

function selectScenario(id) {
  if (_selS===id) {
    _selS=null;
    document.getElementById('detail-scenario').classList.remove('visible');
    renderScenarios(); return;
  }
  _selS=id; renderScenarios();
  var s = SCENARIO_MAP[id]; if (!s) return;
  document.getElementById('ds-id').textContent    = s.id;
  document.getElementById('ds-title').textContent = s.scenario;
  document.getElementById('ds-meta').innerHTML =
    '<span class="detail-meta-item"><strong>Area</strong> '+s.area+'</span>'+
    '<span class="detail-meta-item"><strong>Feature</strong> '+s.feature+'</span>'+
    '<span class="detail-meta-item"><strong>Status</strong> '+statusBadge(s.status)+'</span>'+
    '<span class="detail-meta-item"><strong>Playwright</strong> '+s.playwright+'</span>';

  // Instructions
  var instrSection = document.getElementById('ds-instructions-section');
  var instrEl = document.getElementById('ds-instructions');
  if (s.instructions) {
    instrEl.textContent = s.instructions;
    instrSection.style.display = '';
  } else {
    instrSection.style.display = 'none';
  }

  // Linked issues
  var issuesEl = document.getElementById('ds-issues');
  issuesEl.innerHTML = '';
  var issueIds = SCENARIO_ISSUES[id] || [];
  if (issueIds.length===0) {
    issuesEl.innerHTML = '<span class="detail-empty">No linked issues.</span>';
  } else {
    issueIds.forEach(function(iid) {
      var issue = ISSUE_MAP[iid]; if (!issue) return;
      var div = document.createElement('div'); div.className='detail-row';
      div.innerHTML = '<span class="detail-row-id">'+iid+'</span>'
        +typeBadge(issue.type)
        +'<span>'+issue.description+'</span>'
        +statusBadge(issue.status)
        +prioBadge(issue.priority);
      issuesEl.appendChild(div);
    });
  }
  var panel = document.getElementById('detail-scenario');
  panel.classList.add('visible');
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}

// Scenario filters
document.querySelectorAll('[data-sf]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var f=btn.dataset.sf, v=btn.dataset.value;
    document.querySelectorAll('[data-sf="'+f+'"]').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    if(f==='area') _sfa=v; else if(f==='status') _sfs=v;
    renderScenarios();
  });
});
document.getElementById('search-scenarios').addEventListener('input', function(){
  _sq=this.value.trim().toLowerCase(); renderScenarios();
});
document.querySelectorAll('th[data-sc]').forEach(function(th){
  th.addEventListener('click', function(){
    var col=th.dataset.sc;
    _ssd=(_ssc===col)?_ssd*-1:1; _ssc=col;
    document.querySelectorAll('th[data-sc]').forEach(function(h){
      h.classList.remove('sorted'); h.querySelector('.sa').textContent='\u2195';
    });
    th.classList.add('sorted'); th.querySelector('.sa').textContent=_ssd===1?'\u2191':'\u2193';
    renderScenarios();
  });
});
document.getElementById('ds-close').addEventListener('click', function(){
  _selS=null; document.getElementById('detail-scenario').classList.remove('visible'); renderScenarios();
});

// ── ISSUES VIEW ────────────────────────────────────────────────────────────

var _ift='all', _ifs='all', _ifp='all', _iq='', _isc='id', _isd=1, _selI=null;

function renderIssues() {
  var rows = ISSUES.slice().sort(function(a,b){
    if (_isc==='id') {
      // sort B before I, then numeric
      var ap=a.id.match(/([A-Z]+)(\\d+)/), bp=b.id.match(/([A-Z]+)(\\d+)/);
      if (!ap||!bp) return 0;
      return _isd*((ap[1]<bp[1]?-1:ap[1]>bp[1]?1:0) || (parseInt(ap[2])-parseInt(bp[2])));
    }
    return _isd*String(a[_isc]||'').localeCompare(String(b[_isc]||''));
  });

  var tbody = document.getElementById('tbody-issues');
  tbody.innerHTML = '';
  var vis = 0;

  rows.forEach(function(i) {
    var match = (_ift==='all'||i.type===_ift)
      && (_ifs==='all'||i.status===_ifs)
      && (_ifp==='all'||i.priority===_ifp)
      && (!_iq || i.description.toLowerCase().includes(_iq) || i.id.toLowerCase().includes(_iq));
    var tr = document.createElement('tr');
    if (!match) { tr.classList.add('hidden'); } else { vis++; }
    if (i.id===_selI) tr.classList.add('selected');
    var scenIds = ISSUE_SCENARIOS[i.id] || [];
    var scenCount = scenIds.length===0
      ? '<span style="color:var(--subtle)">—</span>'
      : '<span style="font-size:11px;color:var(--muted)">'+scenIds.length+'</span>';
    tr.innerHTML = '<td class="cell-id">'+i.id+'</td>'
      +'<td>'+typeBadge(i.type)+'</td>'
      +'<td class="cell-desc">'+i.description+'</td>'
      +'<td>'+statusBadge(i.status)+'</td>'
      +'<td>'+prioBadge(i.priority)+'</td>'
      +'<td class="cell-count">'+scenCount+'</td>';
    tr.addEventListener('click', function(){ selectIssue(i.id); });
    tbody.appendChild(tr);
  });

  document.getElementById('empty-issues').style.display = vis===0 ? '' : 'none';
  renderStatsIssues(vis);
}

function renderStatsIssues(vis) {
  var c = {open:0, fixed:0, wontfix:0};
  ISSUES.forEach(function(i){
    if ((_ift==='all'||i.type===_ift) && (_ifs==='all'||i.status===_ifs) && (_ifp==='all'||i.priority===_ifp)
        && (!_iq||i.description.toLowerCase().includes(_iq)))
      c[i.status]=(c[i.status]||0)+1;
  });
  document.getElementById('stats-issues').innerHTML =
    '<div class="stat stat-open"><div class="stat-num">'+c.open+'</div><div class="stat-label">Open</div></div>'+
    '<div class="stat stat-fixed"><div class="stat-num">'+c.fixed+'</div><div class="stat-label">Fixed</div></div>'+
    '<div class="stat stat-wontfix"><div class="stat-num">'+c.wontfix+'</div><div class="stat-label">Wontfix</div></div>'+
    '<div class="stat"><div class="stat-num" style="color:var(--muted)">'+vis+' / '+ISSUES.length+'</div><div class="stat-label">Showing</div></div>';
}

function selectIssue(id) {
  if (_selI===id) {
    _selI=null; document.getElementById('detail-issue').classList.remove('visible');
    renderIssues(); return;
  }
  _selI=id; renderIssues();
  var issue = ISSUE_MAP[id]; if (!issue) return;
  document.getElementById('di-id').textContent    = issue.id;
  document.getElementById('di-title').textContent = issue.description;
  document.getElementById('di-meta').innerHTML =
    '<span class="detail-meta-item"><strong>Type</strong> '+typeBadge(issue.type)+'</span>'+
    '<span class="detail-meta-item"><strong>Status</strong> '+statusBadge(issue.status)+'</span>'+
    '<span class="detail-meta-item"><strong>Priority</strong> '+prioBadge(issue.priority)+'</span>';

  // Notes
  var diNotesSection = document.getElementById('di-notes-section');
  var diNotesEl = document.getElementById('di-notes');
  if (issue.notes) {
    diNotesEl.textContent = issue.notes;
    diNotesSection.style.display = '';
  } else {
    diNotesSection.style.display = 'none';
  }

  var scenEl = document.getElementById('di-scenarios');
  scenEl.innerHTML = '';
  var scenIds = ISSUE_SCENARIOS[id] || [];
  if (scenIds.length===0) {
    scenEl.innerHTML = '<span class="detail-empty">No linked scenarios.</span>';
  } else {
    scenIds.forEach(function(sid) {
      var s = SCENARIO_MAP[sid]; if (!s) return;
      var div = document.createElement('div'); div.className='detail-row';
      div.innerHTML = '<span class="detail-row-id">'+sid+'</span>'
        +statusBadge(s.status)
        +'<span>'+s.scenario+'</span>'
        +'<span style="color:var(--muted);font-size:11px">'+s.area+'</span>';
      scenEl.appendChild(div);
    });
  }
  var panel = document.getElementById('detail-issue');
  panel.classList.add('visible');
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}

// Issue filters
document.querySelectorAll('[data-if]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var f=btn.dataset.if, v=btn.dataset.value;
    document.querySelectorAll('[data-if="'+f+'"]').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    if(f==='type') _ift=v; else if(f==='status') _ifs=v; else if(f==='priority') _ifp=v;
    renderIssues();
  });
});
document.getElementById('search-issues').addEventListener('input', function(){
  _iq=this.value.trim().toLowerCase(); renderIssues();
});
document.querySelectorAll('th[data-ic]').forEach(function(th){
  th.addEventListener('click', function(){
    var col=th.dataset.ic;
    _isd=(_isc===col)?_isd*-1:1; _isc=col;
    document.querySelectorAll('th[data-ic]').forEach(function(h){
      h.classList.remove('sorted'); h.querySelector('.sa').textContent='\u2195';
    });
    th.classList.add('sorted'); th.querySelector('.sa').textContent=_isd===1?'\u2191':'\u2193';
    renderIssues();
  });
});
document.getElementById('di-close').addEventListener('click', function(){
  _selI=null; document.getElementById('detail-issue').classList.remove('visible'); renderIssues();
});

// ── Boot ───────────────────────────────────────────────────────────────────
renderScenarios();
</script>
</body>
</html>`;

writeFileSync(OUT_PATH, html, 'utf8');
console.log('\u2713 Generated: ' + OUT_PATH);
console.log('  ' + SCENARIOS.length + ' scenarios, ' + ISSUES.length + ' issues');
