#!/usr/bin/env node
// generate_viewer.js
// Parses tests/DDScope_TestUI.md and regenerates tests/DDScope_TestUI_viewer.html.
// Usage (from repo root): node tests/generate_viewer.js
// No dependencies — plain Node.js (ESM).
//
// IMPORTANT — ESM only: package.json declares "type": "module".
// Use import/export, not require(). __dirname is not available natively —
// use: const __dirname = dirname(fileURLToPath(import.meta.url))
//
// Sections parsed from DDScope_TestUI.md:
//   ## Summary Table     → TESTS array  (columns: # | Area | Scenario | Feature | Status | Date | Playwright)
//   ## Bugs & Improvements Logged → BUGS array   (columns: # | Type | Description | Scenario | Priority)
//   ### Area — Scenario  → DETAILS object (Steps / Result or Expected / Notes)
//
// When regenerating this script (e.g. to add a new status or change the HTML template):
//   1. Read this file to understand the parsing logic and the HTML template.
//   2. Preserve the ESM imports and the __dirname shim at the top.
//   3. Update only the section(s) that changed (CSS, JS, new filter button, etc.).

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const MD_PATH  = join(__dirname, 'DDScope_TestUI.md');
const OUT_PATH = join(__dirname, 'DDScope_TestUI_viewer.html');

// ── Parse ──────────────────────────────────────────────────────────────────

var src   = readFileSync(MD_PATH, 'utf8');
var lines = src.split('\n');

// --- Summary table ---
// Columns: # | Area | Scenario | Feature | Status | Date | Playwright
var TESTS = [];
var inSummary = false;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (line === '## Summary Table') { inSummary = true; continue; }
  if (inSummary && /^## /.test(line) && line !== '## Summary Table') { inSummary = false; }
  if (!inSummary || !line.startsWith('|')) continue;
  var cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });
  if (cells.length < 7) continue;
  if (cells[0] === '#' || /^-+$/.test(cells[0])) continue;
  var scenario = cells[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  TESTS.push({ id: cells[0], area: cells[1], scenario: scenario, feature: cells[3], status: cells[4], date: cells[5], playwright: cells[6] });
}

// --- Bugs & Improvements table ---
// Columns: # | Type | Description | Scenario | Priority
var BUGS = [];
var inBugs = false;

for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (line === '## Bugs & Improvements Logged') { inBugs = true; continue; }
  if (inBugs && /^## /.test(line) && line !== '## Bugs & Improvements Logged') { inBugs = false; }
  if (!inBugs || !line.startsWith('|')) continue;
  var cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });
  if (cells.length < 5) continue;
  if (cells[0] === '#' || /^-+$/.test(cells[0])) continue;
  BUGS.push({ id: cells[0], type: cells[1], description: cells[2], scenario: cells[3], priority: cells[4] });
}

// --- Detail entries ---
// ### Area — Scenario title
// Date: ... Feature: ... Status: ... Playwright: ...
// Steps:
// 1. step
// Result: text  OR  Expected: text
// Notes: text (optional)
var DETAILS = {};

// Build lookup: scenario title (lowercase) -> id
var scenarioToId = {};
TESTS.forEach(function(t) { scenarioToId[t.scenario.toLowerCase()] = t.id; });

var j = 0;
while (j < lines.length) {
  if (/^### /.test(lines[j])) {
    var heading = lines[j].replace(/^### /, '').trim();
    var dashIdx = heading.indexOf(' \u2014 ');
    if (dashIdx === -1) dashIdx = heading.indexOf(' - ');
    var scenarioTitle = dashIdx !== -1 ? heading.slice(dashIdx + 3).trim() : heading;
    var id = scenarioToId[scenarioTitle.toLowerCase()];

    if (id) {
      var detail = { steps: [], result: '', notes: '' };
      j++;
      // Skip metadata lines until Steps: or separator
      while (j < lines.length && !/^Steps:/.test(lines[j].trim()) && !/^---/.test(lines[j].trim()) && !/^### /.test(lines[j])) {
        j++;
      }
      // Parse Steps
      if (j < lines.length && /^Steps:/.test(lines[j].trim())) {
        j++;
        while (j < lines.length && /^\d+\./.test(lines[j].trim())) {
          detail.steps.push(lines[j].trim().replace(/^\d+\.\s*/, ''));
          j++;
        }
      }
      // Parse Result / Expected / Notes (may be multi-line — we grab the first occurrence)
      while (j < lines.length && !/^---/.test(lines[j].trim()) && !/^### /.test(lines[j])) {
        var l = lines[j].trim();
        if (/^Result:/.test(l))   detail.result = l.replace(/^Result:\s*/, '');
        if (/^Expected:/.test(l)) detail.result = l.replace(/^Expected:\s*/, '');
        if (/^Notes:/.test(l))    detail.notes  = l.replace(/^Notes:\s*/, '');
        j++;
      }
      DETAILS[id] = detail;
      continue;
    }
  }
  j++;
}

// --- Version (last entry in Version History table) ---
var version = '';
var inVH = false;
for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (line === '## Version History') { inVH = true; continue; }
  if (inVH && /^## /.test(line)) { inVH = false; }
  if (!inVH || !line.startsWith('|')) continue;
  var cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });
  if (cells.length >= 1 && /^\d+\.\d+$/.test(cells[0])) version = cells[0];
}

// ── HTML generation ────────────────────────────────────────────────────────

function jsStr(s) { return JSON.stringify(String(s || '')); }

function testsJson() {
  return '[\n' + TESTS.map(function(t) {
    return '  { id:' + jsStr(t.id) + ', area:' + jsStr(t.area) + ', scenario:' + jsStr(t.scenario) +
      ', feature:' + jsStr(t.feature) + ', status:' + jsStr(t.status) +
      ', date:' + jsStr(t.date) + ', playwright:' + jsStr(t.playwright) + ' }';
  }).join(',\n') + '\n]';
}

function bugsJson() {
  return '[\n' + BUGS.map(function(b) {
    return '  { id:' + jsStr(b.id) + ', type:' + jsStr(b.type) + ', description:' + jsStr(b.description) +
      ', scenario:' + jsStr(b.scenario) + ', priority:' + jsStr(b.priority) + ' }';
  }).join(',\n') + '\n]';
}

function detailsJson() {
  var entries = Object.keys(DETAILS).map(function(id) {
    var d = DETAILS[id];
    return '  ' + jsStr(id) + ': { steps: [' + d.steps.map(jsStr).join(', ') +
      '], result: ' + jsStr(d.result) + ', notes: ' + jsStr(d.notes) + ' }';
  });
  return '{\n' + entries.join(',\n') + '\n}';
}

var today = new Date().toISOString().slice(0, 10);

var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>DDScope \u2014 UI Test Tracker</title>\n' +
'<!-- Generated by tests/generate_viewer.js on ' + today + ' \u2014 do not edit manually -->\n' +
'<style>\n' +
'  :root {\n' +
'    --bg:#f5f6f8; --surface:#fff; --border:#e2e5eb; --text:#1a2130; --muted:#6b7280; --subtle:#9ca3af;\n' +
'    --pass:#16a34a; --pass-bg:#f0fdf4; --pass-bd:#bbf7d0;\n' +
'    --fail:#dc2626; --fail-bg:#fef2f2; --fail-bd:#fecaca;\n' +
'    --partial:#d97706; --partial-bg:#fffbeb; --partial-bd:#fde68a;\n' +
'    --ready:#7c3aed; --ready-bg:#f5f3ff; --ready-bd:#ddd6fe;\n' +
'    --pending-bg:#f8f9fb;\n' +
'    --accent:#2563eb; --accent-bg:#eff6ff; --accent-bd:#bfdbfe;\n' +
'  }\n' +
'  *{box-sizing:border-box;margin:0;padding:0}\n' +
'  body{background:var(--bg);color:var(--text);font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;padding:28px 24px}\n' +
'  header{display:flex;align-items:baseline;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--text)}\n' +
'  header h1{font-size:19px;font-weight:700;letter-spacing:-.01em}\n' +
'  header .subtitle{font-size:12px;color:var(--muted)}\n' +
'  header .version{margin-left:auto;font-size:11px;color:var(--subtle);font-family:monospace}\n' +
'  .stats{display:flex;margin-bottom:18px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden}\n' +
'  .stat{flex:1;padding:11px 16px;border-right:1px solid var(--border)}\n' +
'  .stat:last-child{border-right:none;flex:none}\n' +
'  .stat-num{font-size:20px;font-weight:700;line-height:1}\n' +
'  .stat-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:1px}\n' +
'  .stat-pass .stat-num{color:var(--pass)} .stat-partial .stat-num{color:var(--partial)}\n' +
'  .stat-fail .stat-num{color:var(--fail)} .stat-pending .stat-num{color:var(--subtle)}\n' +
'  .stat-ready .stat-num{color:var(--ready)}\n' +
'  .filters{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;align-items:center}\n' +
'  .filter-group{display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px}\n' +
'  .filter-label{font-size:10px;color:var(--muted);padding:0 6px;text-transform:uppercase;letter-spacing:.08em}\n' +
'  .filter-btn{font-size:12px;font-family:inherit;padding:3px 10px;border-radius:4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:500;transition:all .1s}\n' +
'  .filter-btn:hover{background:var(--bg);color:var(--text)} .filter-btn.active{background:var(--accent);color:#fff}\n' +
'  .search-wrap{margin-left:auto}\n' +
'  .search-input{font-family:inherit;font-size:13px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 11px;width:210px;outline:none;transition:border-color .12s}\n' +
'  .search-input:focus{border-color:var(--accent)} .search-input::placeholder{color:var(--subtle)}\n' +
'  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:8px}\n' +
'  table{width:100%;border-collapse:collapse}\n' +
'  thead tr{border-bottom:1px solid var(--border)}\n' +
'  th{padding:9px 13px;text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;cursor:pointer;user-select:none;white-space:nowrap;background:var(--bg)}\n' +
'  th:hover{color:var(--text)} th.sorted{color:var(--accent)}\n' +
'  th .sa{opacity:.35;margin-left:3px;font-size:9px} th.sorted .sa{opacity:1}\n' +
'  tbody tr{border-bottom:1px solid var(--border);transition:background .08s;cursor:pointer}\n' +
'  tbody tr:last-child{border-bottom:none} tbody tr:hover{background:#f0f4ff}\n' +
'  tbody tr.hidden{display:none} tbody tr.selected{background:var(--accent-bg)}\n' +
'  td{padding:8px 13px;vertical-align:middle}\n' +
'  .cell-id{color:var(--subtle);font-size:11px;font-family:monospace;white-space:nowrap}\n' +
'  .cell-area{color:var(--muted);white-space:nowrap;font-size:12px}\n' +
'  .cell-scenario{color:var(--text);font-weight:500}\n' +
'  .cell-feature{color:var(--subtle);font-size:11px;font-family:monospace}\n' +
'  .cell-date,.cell-pw{color:var(--subtle);font-size:11px;white-space:nowrap}\n' +
'  .badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}\n' +
'  .badge-pass   {background:var(--pass-bg);   color:var(--pass);   border:1px solid var(--pass-bd)}\n' +
'  .badge-fail   {background:var(--fail-bg);   color:var(--fail);   border:1px solid var(--fail-bd)}\n' +
'  .badge-partial{background:var(--partial-bg);color:var(--partial);border:1px solid var(--partial-bd)}\n' +
'  .badge-ready  {background:var(--ready-bg);  color:var(--ready);  border:1px solid var(--ready-bd)}\n' +
'  .badge-pending{background:var(--pending-bg);color:var(--subtle); border:1px solid var(--border)}\n' +
'  .empty{padding:36px;text-align:center;color:var(--muted)}\n' +
'  .detail-hint{font-size:11px;color:var(--subtle);margin-bottom:20px}\n' +
'  .detail-panel{background:var(--surface);border:1px solid var(--accent-bd);border-radius:8px;padding:20px 24px;margin-bottom:28px;display:none}\n' +
'  .detail-panel.visible{display:block}\n' +
'  .detail-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px}\n' +
'  .detail-id{font-family:monospace;font-size:12px;color:var(--subtle);padding-top:2px}\n' +
'  .detail-title{font-size:15px;font-weight:700;color:var(--text);flex:1}\n' +
'  .detail-close{background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;line-height:1;padding:0 2px}\n' +
'  .detail-close:hover{color:var(--text)}\n' +
'  .detail-meta{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}\n' +
'  .detail-meta-item{font-size:11px;color:var(--muted)}\n' +
'  .detail-meta-item strong{color:var(--text)}\n' +
'  .detail-section{margin-bottom:14px}\n' +
'  .detail-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:6px}\n' +
'  .detail-steps{padding-left:0;list-style:none;display:flex;flex-direction:column;gap:4px}\n' +
'  .detail-steps li{display:flex;gap:10px;font-size:12px}\n' +
'  .detail-step-num{font-family:monospace;font-size:11px;color:var(--subtle);flex-shrink:0;width:18px}\n' +
'  .detail-result{font-size:12px;line-height:1.6;color:var(--text)}\n' +
'  .detail-notes{font-size:12px;color:var(--muted);font-style:italic;background:var(--bg);border-radius:4px;padding:8px 12px;border-left:3px solid var(--border)}\n' +
'  .section-header{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;margin-top:28px}\n' +
'  .section-title{font-size:13px;font-weight:700;color:var(--text)}\n' +
'  .section-count{font-size:11px;color:var(--muted)}\n' +
'  .badge-bug        {background:var(--fail-bg);  color:var(--fail);  border:1px solid var(--fail-bd)}\n' +
'  .badge-improvement{background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-bd)}\n' +
'  .prio-high  {color:var(--fail);   font-weight:700;font-size:11px}\n' +
'  .prio-medium{color:var(--partial);font-weight:700;font-size:11px}\n' +
'  .prio-low   {color:var(--subtle); font-weight:600;font-size:11px}\n' +
'  footer{margin-top:28px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--subtle)}\n' +
'</style>\n' +
'</head>\n<body>\n' +
'<header>\n' +
'  <h1>DDScope \u2014 UI Test Tracker</h1>\n' +
'  <span class="subtitle">Manual test results &amp; non-regression reference</span>\n' +
'  <span class="version">v' + version + ' \u00b7 ' + today + '</span>\n' +
'</header>\n' +
'<div class="stats" id="stats"></div>\n' +
'<div class="filters">\n' +
'  <div class="filter-group">\n' +
'    <span class="filter-label">Area</span>\n' +
'    <button class="filter-btn active" data-filter="area" data-value="all">All</button>\n' +
'    <button class="filter-btn" data-filter="area" data-value="Settings">C1 Settings</button>\n' +
'    <button class="filter-btn" data-filter="area" data-value="Notes panel">C2 Notes panel</button>\n' +
'  </div>\n' +
'  <div class="filter-group">\n' +
'    <span class="filter-label">Status</span>\n' +
'    <button class="filter-btn active" data-filter="status" data-value="all">All</button>\n' +
'    <button class="filter-btn" data-filter="status" data-value="pass">Pass</button>\n' +
'    <button class="filter-btn" data-filter="status" data-value="ready">Ready</button>\n' +
'    <button class="filter-btn" data-filter="status" data-value="partial">Partial</button>\n' +
'    <button class="filter-btn" data-filter="status" data-value="fail">Fail</button>\n' +
'    <button class="filter-btn" data-filter="status" data-value="pending">Pending</button>\n' +
'  </div>\n' +
'  <div class="search-wrap"><input class="search-input" id="search" type="text" placeholder="Search scenarios\u2026"></div>\n' +
'</div>\n' +
'<div class="table-wrap">\n' +
'  <table id="test-table">\n' +
'    <thead><tr>\n' +
'      <th data-col="id">#<span class="sa">\u2195</span></th>\n' +
'      <th data-col="area">Area<span class="sa">\u2195</span></th>\n' +
'      <th data-col="scenario">Scenario<span class="sa">\u2195</span></th>\n' +
'      <th data-col="feature">Feature<span class="sa">\u2195</span></th>\n' +
'      <th data-col="status">Status<span class="sa">\u2195</span></th>\n' +
'      <th data-col="date">Date<span class="sa">\u2195</span></th>\n' +
'      <th data-col="playwright">Playwright<span class="sa">\u2195</span></th>\n' +
'    </tr></thead>\n' +
'    <tbody id="test-tbody"></tbody>\n' +
'  </table>\n' +
'  <div class="empty" id="empty" style="display:none">No matching scenarios.</div>\n' +
'</div>\n' +
'<p class="detail-hint">Click a row to see test details.</p>\n' +
'<div class="detail-panel" id="detail-panel">\n' +
'  <div class="detail-header">\n' +
'    <span class="detail-id" id="d-id"></span>\n' +
'    <span class="detail-title" id="d-title"></span>\n' +
'    <button class="detail-close" id="detail-close">\xd7</button>\n' +
'  </div>\n' +
'  <div class="detail-meta" id="d-meta"></div>\n' +
'  <div class="detail-section">\n' +
'    <div class="detail-section-title">Steps</div>\n' +
'    <ol class="detail-steps" id="d-steps"></ol>\n' +
'  </div>\n' +
'  <div class="detail-section">\n' +
'    <div class="detail-section-title" id="d-result-label">Result</div>\n' +
'    <div class="detail-result" id="d-result"></div>\n' +
'  </div>\n' +
'  <div class="detail-section" id="d-notes-section" style="display:none">\n' +
'    <div class="detail-section-title">Notes</div>\n' +
'    <div class="detail-notes" id="d-notes"></div>\n' +
'  </div>\n' +
'</div>\n' +
'<div class="section-header">\n' +
'  <span class="section-title">Bugs &amp; Improvements</span>\n' +
'  <span class="section-count" id="bugs-count"></span>\n' +
'</div>\n' +
'<div class="table-wrap">\n' +
'  <table><thead><tr><th>#</th><th>Type</th><th>Description</th><th>Scenario</th><th>Priority</th></tr></thead>\n' +
'  <tbody id="bugs-tbody"></tbody></table>\n' +
'</div>\n' +
'<footer>b2wise \u2014 Confidential &nbsp;\u00b7&nbsp; Regenerate: <code>node tests/generate_viewer.js</code></footer>\n' +
'<script>\n' +
'var TESTS   = ' + testsJson() + ';\n' +
'var BUGS    = ' + bugsJson() + ';\n' +
'var DETAILS = ' + detailsJson() + ';\n' +
'\nvar _fa="all",_fs="all",_q="",_sc="id",_sd=1,_sel=null;\n' +
'function badge(s){return \'<span class="badge badge-\'+s+\'">\'+s+\'</span>\';}\n' +
'function renderTests(){\n' +
'  var rows=TESTS.slice().sort(function(a,b){\n' +
'    if(_sc==="id"){var ap=a.id.split(".").map(Number),bp=b.id.split(".").map(Number);return _sd*((ap[0]-bp[0])||((ap[1]||0)-(bp[1]||0)));}\n' +
'    return _sd*(a[_sc]||"").localeCompare(b[_sc]||"");\n' +
'  });\n' +
'  var tbody=document.getElementById("test-tbody");tbody.innerHTML="";\n' +
'  var vis=0;\n' +
'  rows.forEach(function(t){\n' +
'    var m=(_fa==="all"||t.area===_fa)&&(_fs==="all"||t.status===_fs)&&(!_q||t.scenario.toLowerCase().includes(_q)||t.id.includes(_q));\n' +
'    var tr=document.createElement("tr");\n' +
'    if(!m){tr.classList.add("hidden");}else{vis++;}\n' +
'    if(t.id===_sel)tr.classList.add("selected");\n' +
'    tr.innerHTML=\'<td class="cell-id">\'+t.id+\'</td><td class="cell-area">\'+t.area+\'</td><td class="cell-scenario">\'+t.scenario+\'</td><td class="cell-feature">\'+t.feature+\'</td><td>\'+badge(t.status)+\'</td><td class="cell-date">\'+(t.date||"\u2014")+\'</td><td class="cell-pw">\'+t.playwright+\'</td>\';\n' +
'    tr.addEventListener("click",function(){selectTest(t.id);});\n' +
'    tbody.appendChild(tr);\n' +
'  });\n' +
'  document.getElementById("empty").style.display=vis===0?"":"none";\n' +
'  renderStats(vis);\n' +
'}\n' +
'function renderStats(vis){\n' +
'  var c={pass:0,partial:0,fail:0,pending:0,ready:0};\n' +
'  TESTS.forEach(function(t){\n' +
'    if((_fa==="all"||t.area===_fa)&&(_fs==="all"||t.status===_fs)&&(!_q||t.scenario.toLowerCase().includes(_q)))c[t.status]=(c[t.status]||0)+1;\n' +
'  });\n' +
'  document.getElementById("stats").innerHTML=\n' +
'    \'<div class="stat stat-pass"><div class="stat-num">\'+c.pass+\'</div><div class="stat-label">Pass</div></div>\'+\n' +
'    \'<div class="stat stat-ready"><div class="stat-num">\'+(c.ready||0)+\'</div><div class="stat-label">Ready</div></div>\'+\n' +
'    \'<div class="stat stat-partial"><div class="stat-num">\'+c.partial+\'</div><div class="stat-label">Partial</div></div>\'+\n' +
'    \'<div class="stat stat-fail"><div class="stat-num">\'+c.fail+\'</div><div class="stat-label">Fail</div></div>\'+\n' +
'    \'<div class="stat stat-pending"><div class="stat-num">\'+c.pending+\'</div><div class="stat-label">Pending</div></div>\'+\n' +
'    \'<div class="stat"><div class="stat-num" style="color:var(--muted)">\'+vis+\' / \'+TESTS.length+\'</div><div class="stat-label">Showing</div></div>\';\n' +
'}\n' +
'function selectTest(id){\n' +
'  if(_sel===id){_sel=null;document.getElementById("detail-panel").classList.remove("visible");renderTests();return;}\n' +
'  _sel=id;renderTests();\n' +
'  var t=TESTS.find(function(x){return x.id===id;});\n' +
'  var d=DETAILS[id];\n' +
'  if(!t||!d)return;\n' +
'  document.getElementById("d-id").textContent=t.id;\n' +
'  document.getElementById("d-title").textContent=t.scenario;\n' +
'  document.getElementById("d-meta").innerHTML=\'<span class="detail-meta-item"><strong>Area</strong> \'+t.area+\'</span><span class="detail-meta-item"><strong>Feature</strong> \'+t.feature+\'</span><span class="detail-meta-item"><strong>Status</strong> \'+badge(t.status)+\'</span><span class="detail-meta-item"><strong>Date</strong> \'+(t.date||"\u2014")+\'</span><span class="detail-meta-item"><strong>Playwright</strong> \'+t.playwright+\'</span>\';\n' +
'  var stepsEl=document.getElementById("d-steps");stepsEl.innerHTML="";\n' +
'  (d.steps||[]).forEach(function(s,i){var li=document.createElement("li");li.innerHTML=\'<span class="detail-step-num">\'+(i+1)+\'.</span><span>\'+s+\'</span>\';stepsEl.appendChild(li);});\n' +
'  document.getElementById("d-result-label").textContent=t.status==="pending"?"Expected":"Result";\n' +
'  document.getElementById("d-result").textContent=d.result||"";\n' +
'  var ns=document.getElementById("d-notes-section");\n' +
'  if(d.notes){document.getElementById("d-notes").textContent=d.notes;ns.style.display="";}else{ns.style.display="none";}\n' +
'  var panel=document.getElementById("detail-panel");panel.classList.add("visible");panel.scrollIntoView({behavior:"smooth",block:"nearest"});\n' +
'}\n' +
'function renderBugs(){\n' +
'  var bugs=BUGS.filter(function(b){return b.type==="Bug";});\n' +
'  var impr=BUGS.filter(function(b){return b.type==="Improvement";});\n' +
'  document.getElementById("bugs-count").textContent=bugs.length+" bugs \u00b7 "+impr.length+" improvements";\n' +
'  var tbody=document.getElementById("bugs-tbody");tbody.innerHTML="";\n' +
'  BUGS.forEach(function(b){\n' +
'    var tr=document.createElement("tr");\n' +
'    tr.innerHTML=\'<td class="cell-id">\'+b.id+\'</td><td><span class="badge badge-\'+(b.type==="Bug"?"bug":"improvement")+\'">\'+b.type+\'</span></td><td>\'+b.description+\'</td><td class="cell-id">\'+b.scenario+\'</td><td><span class="prio-\'+b.priority+\'">\'+b.priority+\'</span></td>\';\n' +
'    tbody.appendChild(tr);\n' +
'  });\n' +
'}\n' +
'document.querySelectorAll("[data-filter]").forEach(function(btn){\n' +
'  btn.addEventListener("click",function(){\n' +
'    var f=btn.dataset.filter,v=btn.dataset.value;\n' +
'    document.querySelectorAll(\'[data-filter="\'+f+\'"]\').forEach(function(b){b.classList.remove("active");});\n' +
'    btn.classList.add("active");\n' +
'    if(f==="area")_fa=v; if(f==="status")_fs=v;\n' +
'    renderTests();\n' +
'  });\n' +
'});\n' +
'document.getElementById("search").addEventListener("input",function(){_q=this.value.trim().toLowerCase();renderTests();});\n' +
'document.querySelectorAll("th[data-col]").forEach(function(th){\n' +
'  th.addEventListener("click",function(){\n' +
'    var col=th.dataset.col;\n' +
'    _sd=(_sc===col)?_sd*-1:1;_sc=col;\n' +
'    document.querySelectorAll("th").forEach(function(h){h.classList.remove("sorted");h.querySelector(".sa").textContent="\u2195";});\n' +
'    th.classList.add("sorted");th.querySelector(".sa").textContent=_sd===1?"\u2191":"\u2193";\n' +
'    renderTests();\n' +
'  });\n' +
'});\n' +
'document.getElementById("detail-close").addEventListener("click",function(){_sel=null;document.getElementById("detail-panel").classList.remove("visible");renderTests();});\n' +
'renderTests();renderBugs();\n' +
'</script>\n</body>\n</html>';

writeFileSync(OUT_PATH, html, 'utf8');
console.log('\u2713 Generated: ' + OUT_PATH);
console.log('  ' + TESTS.length + ' scenarios, ' + BUGS.length + ' bugs/improvements, ' + Object.keys(DETAILS).length + ' detail entries');
