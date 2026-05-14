import express from 'express';
import type Database from 'better-sqlite3';
import { getWebDashboardData } from './dashboard/data.js';
import { Scanner } from './scanner/index.js';
import { ClaudeAdapter } from './scanner/claude.adapter.js';
import { CodexAdapter } from './scanner/codex.adapter.js';
import { OpenClawAdapter } from './scanner/openclaw.adapter.js';
import { DeepCodeAdapter } from './scanner/deepcode.adapter.js';
import { CursorAdapter } from './scanner/cursor.adapter.js';
import { GeminiAdapter } from './scanner/gemini.adapter.js';

export function createWebServer(db: Database.Database, port: number) {
  const app = express();

  // HTML template served inline
  app.get('/', (_req, res) => {
    res.type('html').send(getHTML());
  });

  // API: dashboard data
  app.get('/api/data', (_req, res) => {
    try {
      const data = getWebDashboardData(db);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // API: rescan
  app.post('/api/rescan', async (_req, res) => {
    try {
      const scanner = new Scanner();
      scanner.register(new ClaudeAdapter());
      scanner.register(new CodexAdapter());
      scanner.register(new OpenClawAdapter());
      scanner.register(new DeepCodeAdapter());
      scanner.register(new CursorAdapter());
      scanner.register(new GeminiAdapter());
      const result = await scanner.scan(db);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(port, () => {
    console.log(`Dashboard → http://localhost:${port}`);
  });

  return app;
}

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terminal Agents Usage</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  :root {
    --bg: #0f1117; --card: #1a1d27; --border: #2a2d3a;
    --text: #e2e8f0; --muted: #8892a4;
    --claude: #d97757; --codex: #4ade80; --openclaw: #a78bfa; --blue: #4f8ef7;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }
  header { background: var(--card); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  header h1 { font-size: 18px; font-weight: 600; color: var(--claude); }
  header .meta { color: var(--muted); font-size: 12px; }
  #rescan-btn { background: var(--card); border: 1px solid var(--border); color: var(--muted); padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  #rescan-btn:hover { color: var(--text); border-color: var(--claude); }
  #rescan-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  #filter-bar { background: var(--card); border-bottom: 1px solid var(--border); padding: 10px 24px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .filter-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); white-space: nowrap; }
  .filter-sep { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
  #model-checkboxes, #agent-checkboxes { display: flex; flex-wrap: wrap; gap: 6px; }
  .cb-label { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border); cursor: pointer; font-size: 12px; color: var(--muted); transition: border-color 0.15s, color 0.15s, background 0.15s; user-select: none; }
  .cb-label:hover { border-color: var(--claude); color: var(--text); }
  .cb-label.checked { background: rgba(217,119,87,0.12); border-color: var(--claude); color: var(--text); }
  .cb-label input { display: none; }
  .filter-btn { padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 11px; cursor: pointer; white-space: nowrap; }
  .filter-btn:hover { border-color: var(--claude); color: var(--text); }
  .range-group { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; flex-shrink: 0; }
  .range-btn { padding: 4px 13px; background: transparent; border: none; border-right: 1px solid var(--border); color: var(--muted); font-size: 12px; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .range-btn:last-child { border-right: none; }
  .range-btn:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .range-btn.active { background: rgba(217,119,87,0.15); color: var(--claude); font-weight: 600; }

  .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
  .stat-card .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .stat-card .value { font-size: 22px; font-weight: 700; }
  .stat-card .sub { color: var(--muted); font-size: 11px; margin-top: 4px; }

  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .chart-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
  .chart-card.wide { grid-column: 1 / -1; }
  .chart-card h2 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
  .chart-wrap { position: relative; height: 240px; }
  .chart-wrap.tall { height: 300px; }
  .chart-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .chart-header h2 { margin-bottom: 0; }
  .chart-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .chart-day-count { font-size: 11px; color: var(--muted); }
  .tz-group { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .tz-btn { padding: 3px 10px; background: transparent; border: none; border-right: 1px solid var(--border); color: var(--muted); font-size: 11px; cursor: pointer; transition: background 0.15s, color 0.15s; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .tz-btn:last-child { border-right: none; }
  .tz-btn:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .tz-btn.active { background: rgba(217,119,87,0.15); color: var(--claude); }
  .peak-legend { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
  .peak-swatch { width: 10px; height: 10px; background: rgba(248,113,113,0.8); border-radius: 2px; display: inline-block; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
  th.sortable { cursor: pointer; user-select: none; }
  th.sortable:hover { color: var(--text); }
  .sort-icon { font-size: 9px; opacity: 0.8; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .model-tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; background: rgba(79,142,247,0.15); color: var(--blue); }
  .agent-tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; }
  .agent-tag.claude { background: rgba(217,119,87,0.2); color: var(--claude); }
  .agent-tag.codex { background: rgba(74,222,128,0.2); color: var(--codex); }
  .agent-tag.openclaw { background: rgba(167,139,250,0.2); color: var(--openclaw); }
  .cost { color: var(--codex); font-family: monospace; }
  .cost-na { color: var(--muted); font-family: monospace; font-size: 11px; }
  .num { font-family: monospace; }
  .muted { color: var(--muted); }
  .section-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .section-header .section-title { margin-bottom: 0; }
  .export-btn { background: var(--card); border: 1px solid var(--border); color: var(--muted); padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; }
  .export-btn:hover { color: var(--text); border-color: var(--claude); }
  .table-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 24px; overflow-x: auto; }

  footer { border-top: 1px solid var(--border); padding: 20px 24px; margin-top: 8px; }
  .footer-content { max-width: 1400px; margin: 0 auto; }
  .footer-content p { color: var(--muted); font-size: 12px; line-height: 1.7; margin-bottom: 4px; }
  .footer-content a { color: var(--blue); text-decoration: none; }
  .footer-content a:hover { text-decoration: underline; }
  @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } .chart-card.wide { grid-column: 1; } }
</style>
</head>
<body>
<header>
  <h1>Terminal Agents Usage</h1>
  <div class="meta" id="meta">Loading...</div>
  <button id="rescan-btn" onclick="triggerRescan()">&#x21bb; Rescan</button>
</header>

<div id="filter-bar">
  <div class="filter-label">Agents</div>
  <div id="agent-checkboxes"></div>
  <div class="filter-sep"></div>
  <div class="filter-label">Models</div>
  <div id="model-checkboxes"></div>
  <button class="filter-btn" onclick="selectAllModels()">All</button>
  <button class="filter-btn" onclick="clearAllModels()">None</button>
  <div class="filter-sep"></div>
  <div class="filter-label">Range</div>
  <div class="range-group">
    <button class="range-btn" data-range="week" onclick="setRange('week')">This Week</button>
    <button class="range-btn" data-range="month" onclick="setRange('month')">This Month</button>
    <button class="range-btn" data-range="prev-month" onclick="setRange('prev-month')">Prev Month</button>
    <button class="range-btn" data-range="7d"  onclick="setRange('7d')">7d</button>
    <button class="range-btn" data-range="30d" onclick="setRange('30d')">30d</button>
    <button class="range-btn" data-range="90d" onclick="setRange('90d')">90d</button>
    <button class="range-btn" data-range="all" onclick="setRange('all')">All</button>
  </div>
</div>

<div class="container">
  <div class="stats-row" id="stats-row"></div>
  <div class="charts-grid">
    <div class="chart-card wide">
      <h2 id="daily-chart-title">Daily Token Usage</h2>
      <div class="chart-wrap tall"><canvas id="chart-daily"></canvas></div>
    </div>
    <div class="chart-card wide">
      <div class="chart-header">
        <h2 id="hourly-chart-title">Average Hourly Distribution</h2>
        <div class="chart-header-right">
          <span class="peak-legend" title="Mon–Fri 05:00–11:00 PT — Anthropic peak-hour throttling window"><span class="peak-swatch"></span>Peak hours (PT)</span>
          <span class="chart-day-count" id="hourly-day-count"></span>
          <div class="tz-group">
            <button class="tz-btn" data-tz="local" onclick="setHourlyTZ('local')">Local</button>
            <button class="tz-btn" data-tz="utc"   onclick="setHourlyTZ('utc')">UTC</button>
          </div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-hourly"></canvas></div>
    </div>
    <div class="chart-card">
      <h2>By Model</h2>
      <div class="chart-wrap"><canvas id="chart-model"></canvas></div>
    </div>
    <div class="chart-card">
      <h2>By Agent</h2>
      <div class="chart-wrap"><canvas id="chart-agent"></canvas></div>
    </div>
  </div>
  <div class="table-card">
    <div class="section-title">Cost by Model</div>
    <table>
      <thead><tr>
        <th>Model</th><th>Agent</th>
        <th class="sortable" onclick="setModelSort('turns')">Turns <span class="sort-icon" id="msort-turns"></span></th>
        <th class="sortable" onclick="setModelSort('input')">Input <span class="sort-icon" id="msort-input"></span></th>
        <th class="sortable" onclick="setModelSort('output')">Output <span class="sort-icon" id="msort-output"></span></th>
        <th class="sortable" onclick="setModelSort('cache_read')">Cache Read <span class="sort-icon" id="msort-cache_read"></span></th>
        <th class="sortable" onclick="setModelSort('cache_creation')">Cache Creation <span class="sort-icon" id="msort-cache_creation"></span></th>
        <th class="sortable" onclick="setModelSort('cost')">Est. Cost <span class="sort-icon" id="msort-cost"></span></th>
      </tr></thead>
      <tbody id="model-cost-body"></tbody>
    </table>
  </div>
  <div class="table-card">
    <div class="section-header"><div class="section-title">Recent Sessions</div><button class="export-btn" onclick="exportSessionsCSV()">&#x2913; CSV</button></div>
    <table>
      <thead><tr>
        <th>Session</th><th>Agent</th><th>Project</th>
        <th class="sortable" onclick="setSessionSort('last')">Last Active <span class="sort-icon" id="sort-icon-last"></span></th>
        <th class="sortable" onclick="setSessionSort('duration_min')">Duration <span class="sort-icon" id="sort-icon-duration_min"></span></th>
        <th>Model</th>
        <th class="sortable" onclick="setSessionSort('turns')">Turns <span class="sort-icon" id="sort-icon-turns"></span></th>
        <th class="sortable" onclick="setSessionSort('input')">Input <span class="sort-icon" id="sort-icon-input"></span></th>
        <th class="sortable" onclick="setSessionSort('output')">Output <span class="sort-icon" id="sort-icon-output"></span></th>
        <th class="sortable" onclick="setSessionSort('cost')">Est. Cost <span class="sort-icon" id="sort-icon-cost"></span></th>
      </tr></thead>
      <tbody id="sessions-body"></tbody>
    </table>
  </div>
  <div class="table-card">
    <div class="section-header"><div class="section-title">Cost by Project</div><button class="export-btn" onclick="exportProjectsCSV()">&#x2913; CSV</button></div>
    <table>
      <thead><tr>
        <th>Project</th>
        <th class="sortable" onclick="setProjectSort('sessions')">Sessions <span class="sort-icon" id="psort-sessions"></span></th>
        <th class="sortable" onclick="setProjectSort('turns')">Turns <span class="sort-icon" id="psort-turns"></span></th>
        <th class="sortable" onclick="setProjectSort('input')">Input <span class="sort-icon" id="psort-input"></span></th>
        <th class="sortable" onclick="setProjectSort('output')">Output <span class="sort-icon" id="psort-output"></span></th>
        <th class="sortable" onclick="setProjectSort('cost')">Est. Cost <span class="sort-icon" id="psort-cost"></span></th>
      </tr></thead>
      <tbody id="project-cost-body"></tbody>
    </table>
  </div>
</div>

<footer>
  <div class="footer-content">
    <p>Cost estimates based on Anthropic API pricing. Only Anthropic models (opus/sonnet/haiku) are included in cost calculations.</p>
    <p>terminal-agents-usage — unified multi-agent usage tracker</p>
  </div>
</footer>

<script>
// ── Helpers ────────────────────────────────────────────────────────────────
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
// ── State ──────────────────────────────────────────────────────────────────
let rawData = null;
let selectedModels = new Set();
let selectedAgents = new Set();
let selectedRange = '30d';
let charts = {};
let sessionSortCol = 'last';
let modelSortCol = 'cost'; let modelSortDir = 'desc';
let projectSortCol = 'cost'; let projectSortDir = 'desc';
let sessionSortDir = 'desc';
let hourlyTZ = 'local';

// ── Pricing (Anthropic API) ───────────────────────────────────────────────
const PRICING = {
  'claude-opus-4-7':   { input:  5.00, output: 25.00, cache_write:  6.25, cache_read: 0.50 },
  'claude-opus-4-6':   { input:  5.00, output: 25.00, cache_write:  6.25, cache_read: 0.50 },
  'claude-opus-4-5':   { input:  5.00, output: 25.00, cache_write:  6.25, cache_read: 0.50 },
  'claude-sonnet-4-7': { input:  3.00, output: 15.00, cache_write:  3.75, cache_read: 0.30 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cache_write:  3.75, cache_read: 0.30 },
  'claude-sonnet-4-5': { input:  3.00, output: 15.00, cache_write:  3.75, cache_read: 0.30 },
  'claude-haiku-4-7':  { input:  1.00, output:  5.00, cache_write:  1.25, cache_read: 0.10 },
  'claude-haiku-4-6':  { input:  1.00, output:  5.00, cache_write:  1.25, cache_read: 0.10 },
  'claude-haiku-4-5':  { input:  1.00, output:  5.00, cache_write:  1.25, cache_read: 0.10 },
};

function isBillable(model) {
  if (!model) return false;
  const m = model.toLowerCase();
  return m.includes('opus') || m.includes('sonnet') || m.includes('haiku');
}

function getPricing(model) {
  if (!model) return null;
  if (PRICING[model]) return PRICING[model];
  for (const key of Object.keys(PRICING))
    if (model.startsWith(key)) return PRICING[key];
  const m = model.toLowerCase();
  if (m.includes('opus'))   return PRICING['claude-opus-4-7'];
  if (m.includes('sonnet')) return PRICING['claude-sonnet-4-6'];
  if (m.includes('haiku'))  return PRICING['claude-haiku-4-5'];
  return null;
}

function calcCost(model, inp, out, cacheRead, cacheCreation) {
  if (!isBillable(model)) return 0;
  const p = getPricing(model); if (!p) return 0;
  return inp * p.input / 1e6 + out * p.output / 1e6 + cacheRead * p.cache_read / 1e6 + cacheCreation * p.cache_write / 1e6;
}

function fmt(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toLocaleString();
}
function fmtCost(c)    { return '$' + c.toFixed(4); }
function fmtCostBig(c) { return '$' + c.toFixed(2); }

const TOKEN_COLORS = {
  input: 'rgba(79,142,247,0.8)', output: 'rgba(167,139,250,0.8)',
  cache_read: 'rgba(74,222,128,0.6)', cache_creation: 'rgba(251,191,36,0.6)',
};
const MODEL_COLORS = ['#d97757','#4f8ef7','#4ade80','#a78bfa','#fbbf24','#f472b6','#34d399','#60a5fa','#fb7185','#38bdf8','#a3e635','#c084fc'];

const PEAK_HOURS_UTC = new Set([12, 13, 14, 15, 16, 17]);
function localOffsetHours() { return Math.round(-new Date().getTimezoneOffset() / 60); }
function displayHourToUTC(h, tz) { if (tz === 'utc') return h; return ((h - localOffsetHours()) % 24 + 24) % 24; }
function utcHourToDisplay(h, tz) { if (tz === 'utc') return h; return ((h + localOffsetHours()) % 24 + 24) % 24; }
function isPeakHour(h, tz) { return PEAK_HOURS_UTC.has(displayHourToUTC(h, tz)); }
function formatHourLabel(h) { return String(h).padStart(2, '0') + ':00'; }
function tzDisplayName(tz) {
  if (tz === 'utc') return 'UTC';
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'; } catch(e) { return 'Local'; }
}

const RANGE_LABELS = { 'week': 'This Week', 'month': 'This Month', 'prev-month': 'Previous Month', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'all': 'All Time' };
const RANGE_TICKS  = { 'week': 7, 'month': 15, 'prev-month': 15, '7d': 7, '30d': 15, '90d': 13, 'all': 12 };
const VALID_RANGES = Object.keys(RANGE_LABELS);

function getRangeBounds(range) {
  if (range === 'all') return { start: null, end: null };
  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  if (range === 'week') {
    const day = today.getDay();
    const diffToMon = day === 0 ? 6 : day - 1;
    const mon = new Date(today); mon.setDate(today.getDate() - diffToMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: iso(mon), end: iso(sun) };
  }
  if (range === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }
  if (range === 'prev-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: iso(start), end: iso(end) };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date(); d.setDate(d.getDate() - days);
  return { start: iso(d), end: null };
}

function setRange(range) {
  selectedRange = range;
  document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === range));
  applyFilter();
}

function setHourlyTZ(mode) {
  hourlyTZ = mode;
  document.querySelectorAll('.tz-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tz === mode));
  applyFilter();
}

function modelPriority(m) {
  const ml = m.toLowerCase();
  if (ml.includes('opus')) return 0;
  if (ml.includes('sonnet')) return 1;
  if (ml.includes('haiku')) return 2;
  return 3;
}

function buildFilterUI(allModels, allAgents) {
  const sorted = [...allModels].sort((a, b) => { const pa = modelPriority(a), pb = modelPriority(b); return pa !== pb ? pa - pb : a.localeCompare(b); });
  selectedModels = new Set(allModels.filter(m => isBillable(m)));
  selectedAgents = new Set(allAgents);

  document.getElementById('model-checkboxes').innerHTML = sorted.map(m => {
    const checked = selectedModels.has(m);
    return '<label class="cb-label' + (checked ? ' checked' : '') + '" data-model="' + esc(m) + '"><input type="checkbox" value="' + esc(m) + '" ' + (checked ? 'checked' : '') + ' onchange="onModelToggle(this)">' + esc(m) + '</label>';
  }).join('');

  document.getElementById('agent-checkboxes').innerHTML = allAgents.map(a => {
    const checked = selectedAgents.has(a);
    return '<label class="cb-label' + (checked ? ' checked' : '') + '" data-agent="' + esc(a) + '"><input type="checkbox" value="' + esc(a) + '" ' + (checked ? 'checked' : '') + ' onchange="onAgentToggle(this)">' + esc(a) + '</label>';
  }).join('');

  // Default range from URL or 30d
  const urlRange = new URLSearchParams(window.location.search).get('range');
  if (VALID_RANGES.includes(urlRange)) selectedRange = urlRange;
  document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === selectedRange));
}

function onModelToggle(cb) {
  const label = cb.closest('label');
  if (cb.checked) { selectedModels.add(cb.value); label.classList.add('checked'); }
  else { selectedModels.delete(cb.value); label.classList.remove('checked'); }
  applyFilter();
}

function onAgentToggle(cb) {
  const label = cb.closest('label');
  if (cb.checked) { selectedAgents.add(cb.value); label.classList.add('checked'); }
  else { selectedAgents.delete(cb.value); label.classList.remove('checked'); }
  applyFilter();
}

function selectAllModels() {
  document.querySelectorAll('#model-checkboxes input').forEach(cb => { cb.checked = true; selectedModels.add(cb.value); cb.closest('label').classList.add('checked'); });
  applyFilter();
}

function clearAllModels() {
  document.querySelectorAll('#model-checkboxes input').forEach(cb => { cb.checked = false; selectedModels.delete(cb.value); cb.closest('label').classList.remove('checked'); });
  applyFilter();
}

function setSessionSort(col) {
  if (sessionSortCol === col) { sessionSortDir = sessionSortDir === 'desc' ? 'asc' : 'desc'; }
  else { sessionSortCol = col; sessionSortDir = 'desc'; }
  updateSortIcons(); applyFilter();
}
function setModelSort(col) {
  if (modelSortCol === col) { modelSortDir = modelSortDir === 'desc' ? 'asc' : 'desc'; }
  else { modelSortCol = col; modelSortDir = 'desc'; }
  updateSortIcons(); applyFilter();
}
function setProjectSort(col) {
  if (projectSortCol === col) { projectSortDir = projectSortDir === 'desc' ? 'asc' : 'desc'; }
  else { projectSortCol = col; projectSortDir = 'desc'; }
  updateSortIcons(); applyFilter();
}

function updateSortIcons() {
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '');
  const icon = document.getElementById('sort-icon-' + sessionSortCol) || document.getElementById('msort-' + modelSortCol) || document.getElementById('psort-' + projectSortCol);
  const dir = (sessionSortCol !== 'last' ? modelSortDir : sessionSortDir);
  if (icon) icon.textContent = dir === 'desc' ? ' \\u25bc' : ' \\u25b2';
}

// ── Apply Filter ──────────────────────────────────────────────────────────
function applyFilter() {
  if (!rawData) return;
  const { start, end } = getRangeBounds(selectedRange);

  const filteredDaily = rawData.daily_by_model.filter(r =>
    selectedModels.has(r.model) && selectedAgents.has(r.agent) &&
    (!start || r.day >= start) && (!end || r.day <= end)
  );

  const dailyMap = {};
  for (const r of filteredDaily) {
    if (!dailyMap[r.day]) dailyMap[r.day] = { day: r.day, input: 0, output: 0, cache_read: 0, cache_creation: 0 };
    const d = dailyMap[r.day];
    d.input += r.input; d.output += r.output; d.cache_read += r.cache_read; d.cache_creation += r.cache_creation;
  }
  const daily = Object.values(dailyMap).sort((a, b) => a.day.localeCompare(b.day));

  const modelMap = {};
  for (const r of filteredDaily) {
    if (!modelMap[r.model]) modelMap[r.model] = { model: r.model, agent: r.agent, input: 0, output: 0, cache_read: 0, cache_creation: 0, turns: 0, sessions: 0 };
    const m = modelMap[r.model];
    m.input += r.input; m.output += r.output; m.cache_read += r.cache_read; m.cache_creation += r.cache_creation; m.turns += r.turns;
  }

  const filteredSessions = rawData.sessions_all.filter(s =>
    selectedModels.has(s.model) && selectedAgents.has(s.agent) &&
    (!start || s.last_date >= start) && (!end || s.last_date <= end)
  );

  for (const s of filteredSessions) { if (modelMap[s.model]) modelMap[s.model].sessions++; }
  const byModel = Object.values(modelMap).sort((a, b) => (b.input + b.output) - (a.input + a.output));

  // By agent
  const agentMap = {};
  for (const r of filteredDaily) {
    if (!agentMap[r.agent]) agentMap[r.agent] = { agent: r.agent, input: 0, output: 0, turns: 0 };
    const a = agentMap[r.agent];
    a.input += r.input; a.output += r.output; a.turns += r.turns;
  }
  const byAgent = Object.values(agentMap).sort((a, b) => (b.input + b.output) - (a.input + a.output));

  const projMap = {};
  for (const s of filteredSessions) {
    if (!projMap[s.project]) projMap[s.project] = { project: s.project, input: 0, output: 0, turns: 0, sessions: 0, cost: 0 };
    const p = projMap[s.project];
    p.input += s.input; p.output += s.output; p.turns += s.turns; p.sessions++;
    p.cost += calcCost(s.model, s.input, s.output, s.cache_read, s.cache_creation);
  }
  const byProject = Object.values(projMap).sort((a, b) => (b.input + b.output) - (a.input + a.output));

  const totals = {
    sessions: filteredSessions.length,
    turns: byModel.reduce((s, m) => s + m.turns, 0),
    input: byModel.reduce((s, m) => s + m.input, 0),
    output: byModel.reduce((s, m) => s + m.output, 0),
    cache_read: byModel.reduce((s, m) => s + m.cache_read, 0),
    cache_creation: byModel.reduce((s, m) => s + m.cache_creation, 0),
    cost: byModel.reduce((s, m) => s + calcCost(m.model, m.input, m.output, m.cache_read, m.cache_creation), 0),
  };

  const hourlySrc = (rawData.hourly_by_model || []).filter(r =>
    selectedModels.has(r.model) && selectedAgents.has(r.agent) &&
    (!start || r.day >= start) && (!end || r.day <= end)
  );
  const hourlyAgg = aggregateHourly(hourlySrc, hourlyTZ);

  document.getElementById('daily-chart-title').textContent = 'Daily Token Usage \\u2014 ' + RANGE_LABELS[selectedRange];
  document.getElementById('hourly-chart-title').textContent = 'Average Hourly Distribution \\u2014 ' + RANGE_LABELS[selectedRange];

  renderStats(totals);
  renderDailyChart(daily);
  renderHourlyChart(hourlyAgg);
  renderModelChart(byModel);
  renderAgentChart(byAgent);
  renderProjectChart(byProject);
  const sortedSessions = sortSessions(filteredSessions);
  renderSessionsTable(sortedSessions.slice(0, 20));
  renderModelCostTable(byModel);
  renderProjectCostTable(byProject.slice(0, 20));
}

function aggregateHourly(rows, tzMode) {
  const byHour = {}; for (let h = 0; h < 24; h++) byHour[h] = { turns: 0, output: 0 };
  const days = new Set();
  for (const r of rows) {
    const h = utcHourToDisplay(r.hour, tzMode);
    byHour[h].turns += r.turns || 0;
    byHour[h].output += r.output || 0;
    if (r.day) days.add(r.day);
  }
  const dayCount = days.size;
  const hours = [];
  for (let h = 0; h < 24; h++) {
    hours.push({ hour: h, avgTurns: dayCount ? byHour[h].turns / dayCount : 0, avgOutput: dayCount ? byHour[h].output / dayCount : 0, totalTurns: byHour[h].turns, peak: isPeakHour(h, tzMode) });
  }
  return { hours, dayCount };
}

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    let av, bv;
    if (sessionSortCol === 'cost') { av = calcCost(a.model, a.input, a.output, a.cache_read, a.cache_creation); bv = calcCost(b.model, b.input, b.output, b.cache_read, b.cache_creation); }
    else if (sessionSortCol === 'duration_min') { av = parseFloat(a.duration_min) || 0; bv = parseFloat(b.duration_min) || 0; }
    else { av = a[sessionSortCol] ?? 0; bv = b[sessionSortCol] ?? 0; }
    if (av < bv) return sessionSortDir === 'desc' ? 1 : -1;
    if (av > bv) return sessionSortDir === 'desc' ? -1 : 1;
    return 0;
  });
}

// ── Renderers ──────────────────────────────────────────────────────────────
function renderStats(t) {
  const rl = RANGE_LABELS[selectedRange].toLowerCase();
  const stats = [
    { label: 'Sessions', value: t.sessions.toLocaleString(), sub: rl },
    { label: 'Turns', value: fmt(t.turns), sub: rl },
    { label: 'Input Tokens', value: fmt(t.input), sub: rl },
    { label: 'Output Tokens', value: fmt(t.output), sub: rl },
    { label: 'Cache Read', value: fmt(t.cache_read), sub: 'from prompt cache' },
    { label: 'Cache Creation', value: fmt(t.cache_creation), sub: 'writes to prompt cache' },
    { label: 'Est. Cost', value: fmtCostBig(t.cost), sub: 'API pricing', color: '#4ade80' },
  ];
  document.getElementById('stats-row').innerHTML = stats.map(s =>
    '<div class="stat-card"><div class="label">' + s.label + '</div><div class="value" style="' + (s.color ? 'color:' + s.color : '') + '">' + esc(s.value) + '</div>' + (s.sub ? '<div class="sub">' + esc(s.sub) + '</div>' : '') + '</div>'
  ).join('');
}

function renderDailyChart(daily) {
  const ctx = document.getElementById('chart-daily').getContext('2d');
  if (charts.daily) charts.daily.destroy();
  charts.daily = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: daily.map(d => d.day),
      datasets: [
        { label: 'Input', data: daily.map(d => d.input), backgroundColor: TOKEN_COLORS.input, stack: 'io', yAxisID: 'y1' },
        { label: 'Output', data: daily.map(d => d.output), backgroundColor: TOKEN_COLORS.output, stack: 'io', yAxisID: 'y1' },
        { label: 'Cache Read', data: daily.map(d => d.cache_read), backgroundColor: TOKEN_COLORS.cache_read, stack: 'cache', yAxisID: 'y' },
        { label: 'Cache Creation', data: daily.map(d => d.cache_creation), backgroundColor: TOKEN_COLORS.cache_creation, stack: 'cache', yAxisID: 'y' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892a4', boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#8892a4', maxTicksLimit: RANGE_TICKS[selectedRange] }, grid: { color: '#2a2d3a' } },
        y:  { position: 'left', ticks: { color: '#74de80', callback: v => fmt(v) }, grid: { color: '#2a2d3a' }, title: { display: true, text: 'Cache', color: '#74de80' } },
        y1: { position: 'right', ticks: { color: '#4f8ef7', callback: v => fmt(v) }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Input / Output', color: '#4f8ef7' } },
      }
    }
  });
}

function renderHourlyChart(agg) {
  document.getElementById('hourly-day-count').textContent = agg.dayCount ? agg.dayCount + ' day' + (agg.dayCount === 1 ? '' : 's') + ' averaged \\u00b7 ' + tzDisplayName(hourlyTZ) : 'No data \\u00b7 ' + tzDisplayName(hourlyTZ);
  const ctx = document.getElementById('chart-hourly').getContext('2d');
  if (charts.hourly) charts.hourly.destroy();
  const labels = agg.hours.map(h => (h.peak ? '\\u26a1 ' : '') + formatHourLabel(h.hour));
  charts.hourly = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Avg turns / hour', data: agg.hours.map(h => h.avgTurns), backgroundColor: agg.hours.map(h => h.peak ? 'rgba(248,113,113,0.8)' : TOKEN_COLORS.input), yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Avg output tokens / hour', data: agg.hours.map(h => h.avgOutput), borderColor: TOKEN_COLORS.output, backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 2, pointRadius: 2, tension: 0.3, yAxisID: 'y1', order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#8892a4', boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#8892a4', maxRotation: 0, autoSkip: false, font: { size: 10 } }, grid: { color: '#2a2d3a' } },
        y:  { position: 'left', beginAtZero: true, ticks: { color: '#8892a4', callback: v => v.toFixed(1) }, grid: { color: '#2a2d3a' }, title: { display: true, text: 'Avg turns / hour', color: '#8892a4', font: { size: 11 } } },
        y1: { position: 'right', beginAtZero: true, ticks: { color: '#8892a4', callback: v => fmt(v) }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Avg output tokens / hour', color: '#8892a4', font: { size: 11 } } },
      }
    }
  });
}

function renderModelChart(byModel) {
  const ctx = document.getElementById('chart-model').getContext('2d');
  if (charts.model) charts.model.destroy();
  if (!byModel.length) return;
  charts.model = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byModel.map(m => m.model),
      datasets: [{ data: byModel.map(m => m.input + m.output), backgroundColor: MODEL_COLORS, borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' tokens' } } }
    }
  });
}

function renderAgentChart(byAgent) {
  const ctx = document.getElementById('chart-agent').getContext('2d');
  if (charts.agent) charts.agent.destroy();
  if (!byAgent.length) return;
  charts.agent = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byAgent.map(a => a.agent),
      datasets: [{ data: byAgent.map(a => a.input + a.output), backgroundColor: ['#d97757', '#4ade80', '#a78bfa'], borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' tokens' } } }
    }
  });
}

function renderProjectChart(byProject) {
  const top = byProject.slice(0, 10);
  const ctx = document.getElementById('chart-project').getContext('2d');
  if (charts.project) charts.project.destroy();
  if (!top.length) return;
  charts.project = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(p => p.project.length > 22 ? '\\u2026' + p.project.slice(-20) : p.project),
      datasets: [
        { label: 'Input', data: top.map(p => p.input), backgroundColor: TOKEN_COLORS.input },
        { label: 'Output', data: top.map(p => p.output), backgroundColor: TOKEN_COLORS.output },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892a4', boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#8892a4', callback: v => fmt(v) }, grid: { color: '#2a2d3a' } },
        y: { ticks: { color: '#8892a4', font: { size: 11 } }, grid: { color: '#2a2d3a' } },
      }
    }
  });
}

function renderSessionsTable(sessions) {
  document.getElementById('sessions-body').innerHTML = sessions.map(s => {
    const cost = calcCost(s.model, s.input, s.output, s.cache_read, s.cache_creation);
    const costCell = isBillable(s.model) ? '<td class="cost">' + fmtCost(cost) + '</td>' : '<td class="cost-na">n/a</td>';
    return '<tr>' +
      '<td class="muted" style="font-family:monospace">' + esc(s.session_id) + '&hellip;</td>' +
      '<td><span class="agent-tag ' + esc(s.agent) + '">' + esc(s.agent) + '</span></td>' +
      '<td>' + esc(s.project) + '</td>' +
      '<td class="muted">' + esc(s.last) + '</td>' +
      '<td class="muted">' + esc(s.duration_min) + 'm</td>' +
      '<td><span class="model-tag">' + esc(s.model) + '</span></td>' +
      '<td class="num">' + s.turns + '</td>' +
      '<td class="num">' + fmt(s.input) + '</td>' +
      '<td class="num">' + fmt(s.output) + '</td>' +
      costCell +
      '</tr>';
  }).join('');
}

function renderModelCostTable(byModel) {
  const sorted = [...byModel].sort((a, b) => {
    let av, bv;
    if (modelSortCol === 'cost') { av = calcCost(a.model, a.input, a.output, a.cache_read, a.cache_creation); bv = calcCost(b.model, b.input, b.output, b.cache_read, b.cache_creation); }
    else { av = a[modelSortCol] ?? 0; bv = b[modelSortCol] ?? 0; }
    if (av < bv) return modelSortDir === 'desc' ? 1 : -1;
    if (av > bv) return modelSortDir === 'desc' ? -1 : 1;
    return 0;
  });
  document.getElementById('model-cost-body').innerHTML = sorted.map(m => {
    const cost = calcCost(m.model, m.input, m.output, m.cache_read, m.cache_creation);
    return '<tr>' +
      '<td><span class="model-tag">' + esc(m.model) + '</span></td>' +
      '<td><span class="agent-tag ' + esc(m.agent) + '">' + esc(m.agent) + '</span></td>' +
      '<td class="num">' + m.turns.toLocaleString() + '</td>' +
      '<td class="num">' + fmt(m.input) + '</td>' +
      '<td class="num">' + fmt(m.output) + '</td>' +
      '<td class="num">' + fmt(m.cache_read) + '</td>' +
      '<td class="num">' + fmt(m.cache_creation) + '</td>' +
      (isBillable(m.model) ? '<td class="cost">' + fmtCost(cost) + '</td>' : '<td class="cost-na">n/a</td>') +
      '</tr>';
  }).join('');
}

function renderProjectCostTable(projects) {
  const sorted = [...projects].sort((a, b) => {
    let av, bv;
    if (projectSortCol === 'cost') { av = a.cost ?? 0; bv = b.cost ?? 0; }
    else { av = a[projectSortCol] ?? 0; bv = b[projectSortCol] ?? 0; }
    if (av < bv) return projectSortDir === 'desc' ? 1 : -1;
    if (av > bv) return projectSortDir === 'desc' ? -1 : 1;
    return 0;
  });
  document.getElementById('project-cost-body').innerHTML = sorted.map(p =>
    '<tr>' +
    '<td>' + esc(p.project) + '</td>' +
    '<td class="num">' + p.sessions + '</td>' +
    '<td class="num">' + p.turns.toLocaleString() + '</td>' +
    '<td class="num">' + fmt(p.input) + '</td>' +
    '<td class="num">' + fmt(p.output) + '</td>' +
    '<td class="cost">' + fmtCostBig(p.cost) + '</td>' +
    '</tr>'
  ).join('');
}

// ── CSV Export ─────────────────────────────────────────────────────────────
function exportSessionsCSV() {
  const rows = [['Session','Agent','Project','Branch','Last Active','Duration(min)','Model','Turns','Input','Output','Cache Read','Cache Create','Est Cost']];
  for (const s of rawData.sessions_all.filter(s => selectedModels.has(s.model) && selectedAgents.has(s.agent))) {
    const cost = calcCost(s.model, s.input, s.output, s.cache_read, s.cache_creation);
    rows.push([s.session_id, s.agent, s.project, s.branch, s.last, s.duration_min, s.model, s.turns, s.input, s.output, s.cache_read, s.cache_creation, cost.toFixed(4)]);
  }
  downloadCSV('sessions.csv', rows);
}

function exportProjectsCSV() {
  const projMap = {};
  for (const s of rawData.sessions_all.filter(s => selectedModels.has(s.model) && selectedAgents.has(s.agent))) {
    if (!projMap[s.project]) projMap[s.project] = { sessions: 0, turns: 0, input: 0, output: 0, cost: 0 };
    const p = projMap[s.project];
    p.sessions++; p.turns += s.turns; p.input += s.input; p.output += s.output;
    p.cost += calcCost(s.model, s.input, s.output, s.cache_read, s.cache_creation);
  }
  const rows = [['Project','Sessions','Turns','Input','Output','Est Cost']];
  for (const [name, p] of Object.entries(projMap))
    rows.push([name, p.sessions, p.turns, p.input, p.output, p.cost.toFixed(2)]);
  downloadCSV('projects.csv', rows);
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ── Rescan ─────────────────────────────────────────────────────────────────
async function triggerRescan() {
  const btn = document.getElementById('rescan-btn');
  btn.disabled = true; btn.textContent = 'Scanning...';
  try {
    const res = await fetch('/api/rescan', { method: 'POST' });
    const data = await res.json();
    document.getElementById('meta').textContent = 'Rescan complete: ' + data.turnsAdded + ' turns, ' + data.sessionsSeen + ' sessions';
    await loadData();
  } catch(e) {
    document.getElementById('meta').textContent = 'Rescan failed';
  } finally {
    btn.disabled = false; btn.textContent = '\\u21bb Rescan';
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('/api/data');
    rawData = await res.json();
    document.getElementById('meta').textContent = rawData.sessions_all.length + ' sessions \\u00b7 updated ' + rawData.generated_at;
    buildFilterUI(rawData.all_models, rawData.all_agents);
    // Replace project chart with agent chart
    applyFilter();
  } catch(e) {
    document.getElementById('meta').textContent = 'Failed to load data. Run "usage scan" first.';
  }
}

loadData();
</script>
</body>
</html>`;
}
