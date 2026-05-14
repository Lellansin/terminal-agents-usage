export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terminal Agents Usage</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  :root {
    --bg: #f3f4ef;
    --panel: #fbfbf8;
    --panel-2: #ffffff;
    --line: #d8ddd2;
    --line-strong: #bcc6b5;
    --text: #1d2620;
    --muted: #5e6a60;
    --soft: #8a958b;
    --blue: #2f6df6;
    --green: #4ea95e;
    --amber: #f8c548;
    --red: #ea5455;
    --shadow: 0 14px 34px rgba(25, 37, 26, 0.06);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background:
      radial-gradient(circle at 8% -20%, #d8eedf 0%, transparent 42%),
      radial-gradient(circle at 92% -30%, #e9f0d5 0%, transparent 34%),
      linear-gradient(180deg, #f7f9f3 0%, var(--bg) 48%);
    color: var(--text);
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 14px;
  }
  header {
    min-height: 68px;
    background: rgba(251, 251, 248, 0.86);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  header h1 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #203125;
  }
  header .meta {
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    white-space: nowrap;
  }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .date-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #cad4c6;
    border-radius: 12px;
    color: #24332a;
    background: #fff;
    font-size: 14px;
    padding: 6px 8px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8);
  }
  .date-input {
    border: none;
    outline: none;
    color: #24332a;
    font-size: 14px;
    background: transparent;
    width: 134px;
    font-family: 'IBM Plex Mono', monospace;
  }
  .date-apply {
    height: 28px;
    border: 1px solid #cfd8cb;
    background: #f4f7f2;
    color: var(--muted);
    border-radius: 8px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  .date-apply:hover { border-color: var(--blue); color: var(--blue); background: #eef4ff; }
  .date-arrow { color: #9aa3b2; }
  #rescan-btn {
    background: #fff;
    border: 1px solid #cad4c6;
    color: var(--muted);
    padding: 7px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.16s ease;
  }
  #rescan-btn:hover { color: var(--blue); border-color: var(--blue); transform: translateY(-1px); }
  #rescan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  #lang-btn {
    background: #fff;
    border: 1px solid #cad4c6;
    color: var(--muted);
    padding: 7px 10px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    min-width: 64px;
    transition: all 0.16s ease;
  }
  #lang-btn:hover { color: var(--blue); border-color: var(--blue); transform: translateY(-1px); }
  #settings-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid #cad4c6;
    background: #fff;
    color: var(--muted);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.16s ease;
  }
  #settings-btn:hover { color: var(--blue); border-color: var(--blue); transform: translateY(-1px); }

  #filter-bar {
    background: linear-gradient(180deg, rgba(249,251,245,0.92) 0%, rgba(246,248,241,0.9) 100%);
    border: 1px solid #d6ddd2;
    border-radius: 14px;
    margin: 10px 10px 12px;
    padding: 10px;
    box-shadow: var(--shadow);
  }
  .filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 0;
  }
  .filter-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .filter-row:last-child { margin-bottom: 0; }
  .filter-label {
    font-size: 12px;
    font-weight: 800;
    color: #4d5b4f;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .filter-sep { width: 1px; height: 22px; background: var(--line); flex-shrink: 0; }
  .filter-dropdown { position: relative; width: 110px; min-width: 0; }
  .dropdown-trigger {
    width: 110px;
    padding: 7px 10px;
    border-radius: 9px;
    border: 1px solid #cad4c6;
    background: #fff;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  #agent-filter-text, #model-filter-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dropdown-trigger:hover { border-color: var(--blue); color: var(--blue); }
  .dropdown-caret { color: #8ca08f; font-size: 11px; }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: min(360px, 72vw);
    max-height: 320px;
    overflow: auto;
    background: #fff;
    border: 1px solid #ccd7c8;
    border-radius: 10px;
    box-shadow: 0 16px 28px rgba(22, 33, 24, 0.16);
    padding: 8px;
    z-index: 60;
    display: none;
  }
  .dropdown-menu.open { display: block; }
  .menu-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 2px 8px;
    margin-bottom: 6px;
    border-bottom: 1px solid #e3eadf;
  }
  .menu-action-btn {
    border: 1px solid #d2dccd;
    background: #f8fbf6;
    color: var(--muted);
    border-radius: 7px;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 7px;
    cursor: pointer;
  }
  .menu-action-btn:hover { border-color: var(--blue); color: var(--blue); background: #eef4ff; }
  .menu-items { display: grid; grid-template-columns: 1fr; gap: 6px; }
  #model-checkboxes, #agent-checkboxes { display: contents; }
  .cb-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 9px;
    border: 1px solid #cbd6c7;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    transition: all 0.15s ease;
    user-select: none;
    background: #fff;
    box-shadow: 0 1px 0 rgba(255,255,255,0.75);
  }
  .cb-label:hover { border-color: var(--blue); color: var(--blue); transform: translateY(-1px); }
  .cb-label.checked { background: #ebf2ff; border-color: #6b95ff; color: #2556c9; }
  .cb-label input { display: block; accent-color: #2f6df6; width: 14px; height: 14px; }
  .filter-btn {
    padding: 6px 10px;
    border-radius: 9px;
    border: 1px solid var(--line-strong);
    background: #fff;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .filter-btn:hover { border-color: var(--blue); color: var(--text); }
  .range-group {
    display: flex;
    border: 1px solid #cad4c6;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #fff;
  }
  .range-btn {
    padding: 7px 13px;
    background: transparent;
    border: none;
    border-right: 1px solid #dae3d5;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .range-btn:last-child { border-right: none; }
  .range-btn:hover { background: #f4f8f2; color: var(--text); }
  .range-btn.active { background: #eaf2ff; color: #2157d8; font-weight: 700; }
  .custom-range-panel {
    display: none;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    margin-left: 0;
  }
  .custom-range-panel.open { display: flex; }
  .filter-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-left: 0; }
  .global-view-switch { flex-shrink: 0; margin-left: 10px; }

  .container { width: 100%; max-width: none; margin: 0; padding: 0 10px 22px; }
  .summary-strip {
    display: grid;
    grid-template-columns: repeat(7, minmax(120px, 1fr));
    gap: 10px;
    background: transparent;
    margin-bottom: 12px;
  }
  .stat-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,250,245,0.92) 100%);
    border: 1px solid #d7dfd1;
    border-radius: 14px;
    padding: 14px 16px;
    min-height: 78px;
    box-shadow: var(--shadow);
  }
  .stat-card .label {
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 7px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .stat-card .value { font-size: 32px; line-height: 1; font-weight: 800; color: #223429; letter-spacing: -0.02em; }
  .stat-card .sub { color: var(--soft); font-size: 11px; margin-top: 7px; }

  .chart-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,252,248,0.96) 100%);
    border: 1px solid #d7dfd1;
    border-radius: 16px;
    padding: 18px 24px 12px;
    box-shadow: var(--shadow);
    margin-bottom: 12px;
  }
  .chart-card h2 { font-size: 16px; font-weight: 800; color: #233228; margin-bottom: 10px; letter-spacing: -0.01em; }
  .chart-wrap { position: relative; height: 250px; }
  .chart-wrap.tall { height: 320px; }
  .pie-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }
  .pie-card { margin-bottom: 0; }
  .pie-wrap { height: 290px; }
  .chart-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
  .chart-header h2 { margin-bottom: 0; }
  .chart-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .chart-day-count { font-size: 11px; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }
  .tz-group { display: flex; border: 1px solid var(--line-strong); border-radius: 6px; overflow: hidden; background: #fff; }
  .tz-btn { padding: 3px 10px; background: transparent; border: none; border-right: 1px solid var(--line-strong); color: var(--muted); font-size: 11px; cursor: pointer; transition: background 0.15s, color 0.15s; text-transform: uppercase; font-weight: 600; }
  .tz-btn:last-child { border-right: none; }
  .tz-btn:hover { background: #f6f8fb; color: var(--text); }
  .tz-btn.active { background: #eef3ff; color: var(--blue); }
  .peak-legend { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
  .peak-swatch { width: 10px; height: 10px; background: rgba(248,113,113,0.8); border-radius: 2px; display: inline-block; }

  .usage-table-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(251,252,249,0.98) 100%);
    overflow-x: auto;
    border: 1px solid #d7dfd1;
    border-radius: 16px;
    box-shadow: var(--shadow);
  }
  .usage-head { display: flex; align-items: center; gap: 12px; padding: 10px 12px 0; }
  .usage-title {
    font-size: 12px;
    font-weight: 800;
    color: #4d5b4f;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .view-switch {
    display: inline-flex;
    border: 1px solid #cad4c6;
    border-radius: 9px;
    overflow: hidden;
    background: #fff;
  }
  .view-btn {
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    padding: 6px 10px;
    cursor: pointer;
  }
  .view-btn + .view-btn { border-left: 1px solid #dde6d8; }
  .view-btn.active { background: #eaf2ff; color: #2157d8; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    padding: 13px 10px;
    font-size: 12px;
    color: #3a4c3f;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
    background: #f6f9f3;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  th.day-head { text-align: center; min-width: 145px; }
  th.day-head .day-total {
    display: block;
    margin-top: 5px;
    font-weight: 500;
    color: #536457;
    line-height: 1.35;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
  }
  th.sortable { cursor: pointer; user-select: none; }
  th.sortable:hover { color: var(--text); }
  .sort-icon { font-size: 9px; opacity: 0.8; }
  td { padding: 11px 10px; border-bottom: 1px solid var(--line); font-size: 13px; background: #fff; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f8fbf6; }
  .model-name {
    min-width: 200px;
    max-width: 260px;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.35;
    color: #1f2d24;
    word-break: break-word;
  }
  .usage-cell { min-width: 145px; text-align: center; position: relative; }
  .usage-cell.empty { color: var(--soft); background: #fff; }
  .usage-cell.heat-1 { background: #fffaf0; }
  .usage-cell.heat-2 { background: #fff2d7; }
  .usage-cell.heat-3 { background: #ffe6b4; }
  .usage-cell.heat-4 { background: #ffd27a; }
  .cell-tokens { font-size: 14px; font-weight: 700; color: #1f2937; }
  .cell-cost { margin-top: 5px; font-size: 12px; color: #4b5563; font-family: 'IBM Plex Mono', monospace; }
  .delta { display: inline-block; margin-left: 7px; padding: 2px 5px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .delta.up { background: #fff1f1; color: #ff2f2f; }
  .delta.down { background: #edffe8; color: #18b600; }
  .dash { color: var(--soft); margin-left: 10px; }
  .trend-cell { width: 120px; min-width: 120px; text-align: center; }
  .spark { width: 94px; height: 36px; overflow: visible; }
  .spark path.line { fill: none; stroke-width: 2; }
  .spark path.area { opacity: 0.12; }
  .model-tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; background: rgba(88,116,200,0.12); color: var(--blue); }
  .agent-tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; }
  .agent-tag.claude { background: rgba(217,119,87,0.18); color: #b45b3f; }
  .agent-tag.codex { background: rgba(88,116,200,0.16); color: var(--blue); }
  .agent-tag.openclaw { background: rgba(167,139,250,0.18); color: #7c5bd0; }
  .cost { color: #2f8f46; font-family: 'IBM Plex Mono', monospace; }
  .cost-na { color: var(--muted); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
  .num { font-family: 'IBM Plex Mono', monospace; }
  .muted { color: var(--muted); }
  .section-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .section-header .section-title { margin-bottom: 0; }
  .export-btn { background: #fff; border: 1px solid var(--line-strong); color: var(--muted); padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; }
  .export-btn:hover { color: var(--text); border-color: var(--blue); }
  .table-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin: 18px 10px 0; overflow-x: auto; }

  .settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(19, 25, 20, 0.45);
    backdrop-filter: blur(2px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 99;
    padding: 24px;
  }
  .settings-overlay.open { display: flex; }
  .settings-modal {
    width: min(980px, 100%);
    max-height: 82vh;
    overflow: auto;
    background: #ffffff;
    border: 1px solid #ced8ca;
    border-radius: 16px;
    box-shadow: 0 30px 60px rgba(15, 22, 16, 0.25);
    padding: 16px;
  }
  .settings-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .settings-title { font-size: 18px; font-weight: 800; color: #203125; }
  .settings-sub { font-size: 12px; color: var(--muted); }
  .settings-actions { display: flex; align-items: center; gap: 8px; }
  .settings-btn {
    height: 30px;
    border-radius: 8px;
    border: 1px solid #cad4c6;
    background: #fff;
    color: var(--muted);
    padding: 0 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .settings-btn.primary { background: #ebf2ff; color: #2459cc; border-color: #8fb0ff; }
  .settings-table { width: 100%; border-collapse: collapse; }
  .settings-table th, .settings-table td {
    border-bottom: 1px solid #e6ece2;
    padding: 8px;
    text-align: left;
    font-size: 12px;
  }
  .settings-table th { color: #516055; font-weight: 800; background: #f7faf4; position: sticky; top: 0; z-index: 1; }
  .settings-table .mono { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #35463b; }
  .price-input {
    width: 100%;
    min-width: 92px;
    border: 1px solid #d3dccc;
    border-radius: 7px;
    background: #fff;
    padding: 5px 8px;
    font-size: 12px;
    color: #1f2d24;
    font-family: 'IBM Plex Mono', monospace;
  }

  footer {
    border-top: 1px solid var(--line);
    padding: 16px 24px;
    margin-top: 12px;
    background: rgba(250, 252, 247, 0.9);
  }
  .footer-content p { color: var(--muted); font-size: 12px; line-height: 1.7; margin-bottom: 4px; }
  .footer-content a { color: var(--blue); text-decoration: none; }
  .footer-content a:hover { text-decoration: underline; }
  @media (max-width: 900px) {
    header { height: auto; padding: 12px 14px; align-items: flex-start; flex-direction: column; }
    header h1 { font-size: 24px; }
    .header-right { width: 100%; flex-wrap: wrap; }
    .date-pill { min-width: 0; flex: 1; }
    .date-input { width: 118px; }
    .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pie-grid { grid-template-columns: 1fr; }
    #filter-bar { margin: 10px 0 12px; border-radius: 10px; }
    .filter-row { flex-direction: column; align-items: stretch; gap: 8px; }
    .filter-left { width: 100%; }
    .filter-dropdown { width: 100%; }
    .dropdown-trigger { width: 100%; }
    .dropdown-menu { width: 100%; max-height: 260px; }
    .filter-actions { padding-left: 0; }
    .global-view-switch { margin-left: 0; }
    .custom-range-panel { flex-wrap: wrap; }
    .chart-wrap.tall { height: 264px; }
  }
</style>
</head>
<body>
<header>
  <h1 id="page-title">用量统计</h1>
  <div class="header-right">
    <div class="meta" id="meta">Loading...</div>
    <button id="settings-btn" title="Pricing Settings" onclick="openPricingSettings()">⚙</button>
    <button id="lang-btn" onclick="toggleLanguage()">EN</button>
    <button id="rescan-btn" onclick="triggerRescan()">&#x21bb; Rescan</button>
  </div>
</header>

<div id="filter-bar">
  <div class="filter-row">
    <div class="filter-left">
      <div class="filter-label" id="label-agents">Agents</div>
      <div class="filter-dropdown">
        <button class="dropdown-trigger" id="agent-filter-btn" onclick="toggleFilterMenu('agent')">
          <span id="agent-filter-text">All</span><span class="dropdown-caret">&#9662;</span>
        </button>
        <div class="dropdown-menu" id="agent-filter-menu">
          <div class="menu-actions">
            <button class="menu-action-btn" onclick="selectAllAgents()">All</button>
            <button class="menu-action-btn" onclick="clearAllAgents()">None</button>
          </div>
          <div class="menu-items" id="agent-checkboxes"></div>
        </div>
      </div>
      <div class="filter-label" id="label-models">Models</div>
      <div class="filter-dropdown">
        <button class="dropdown-trigger" id="model-filter-btn" onclick="toggleFilterMenu('model')">
          <span id="model-filter-text">All</span><span class="dropdown-caret">&#9662;</span>
        </button>
        <div class="dropdown-menu" id="model-filter-menu">
          <div class="menu-actions">
            <button class="menu-action-btn" onclick="selectAllModels()">All</button>
            <button class="menu-action-btn" onclick="clearAllModels()">None</button>
          </div>
          <div class="menu-items" id="model-checkboxes"></div>
        </div>
      </div>
      <div class="filter-label" id="label-range">Range</div>
      <div class="range-group">
        <button class="range-btn" data-range="prev-month" onclick="setRange('prev-month')">Prev Month</button>
        <button class="range-btn" data-range="7d"  onclick="setRange('7d')">7d</button>
        <button class="range-btn" data-range="30d" onclick="setRange('30d')">30d</button>
        <button class="range-btn" data-range="90d" onclick="setRange('90d')">90d</button>
        <button class="range-btn" data-range="all" onclick="setRange('all')">All</button>
        <button class="range-btn" data-range="custom" onclick="toggleCustomRangePanel()">Custom</button>
      </div>
      <div id="custom-range-panel" class="custom-range-panel">
        <div class="date-pill">
          <input id="custom-start" class="date-input" type="date">
          <span class="date-arrow">&#8594;</span>
          <input id="custom-end" class="date-input" type="date">
          <button id="custom-range-apply" class="date-apply" onclick="applyCustomRange()">Apply</button>
        </div>
      </div>
    </div>
    <div class="view-switch global-view-switch">
      <button class="view-btn active" id="view-model-btn" onclick="setUsageView('model')">Model View</button>
      <button class="view-btn" id="view-project-btn" onclick="setUsageView('project')">Project View</button>
      <button class="view-btn" id="view-agent-btn" onclick="setUsageView('agent')">Agent View</button>
    </div>
  </div>
</div>

<div class="container">
  <div class="summary-strip" id="stats-row"></div>
  <div class="chart-card">
    <div class="chart-header">
      <h2 id="daily-chart-title">Tokens and Cost</h2>
      <span class="chart-day-count" id="daily-day-count"></span>
    </div>
    <div class="chart-wrap tall"><canvas id="chart-daily"></canvas></div>
  </div>
  <div class="usage-table-card">
    <div class="usage-head">
      <div class="usage-title" id="usage-title">Usage Table</div>
    </div>
    <table>
      <thead id="usage-head"></thead>
      <tbody id="usage-body"></tbody>
    </table>
  </div>
  <div class="pie-grid">
    <div class="chart-card pie-card">
      <div class="chart-header">
        <h2 id="agent-pie-title">By Agent</h2>
      </div>
      <div class="chart-wrap pie-wrap"><canvas id="chart-agent"></canvas></div>
    </div>
    <div class="chart-card pie-card">
      <div class="chart-header">
        <h2 id="model-pie-title">By Model</h2>
      </div>
      <div class="chart-wrap pie-wrap"><canvas id="chart-model"></canvas></div>
    </div>
  </div>
</div>

<div id="settings-overlay" class="settings-overlay" onclick="onSettingsOverlayClick(event)">
  <div class="settings-modal">
    <div class="settings-head">
      <div>
        <div class="settings-title" id="settings-title">Model Pricing Settings</div>
        <div class="settings-sub" id="settings-sub">Configure USD per 1M tokens used in cost calculation.</div>
      </div>
      <div class="settings-actions">
        <button class="settings-btn" id="settings-close-btn" onclick="closePricingSettings()">Close</button>
        <button class="settings-btn" id="settings-reset-btn" onclick="resetPricingSettings()">Reset</button>
        <button class="settings-btn primary" id="settings-save-btn" onclick="savePricingSettings()">Save</button>
      </div>
    </div>
    <table class="settings-table">
      <thead>
        <tr>
          <th id="settings-th-model">Model</th>
          <th id="settings-th-enable">Enable</th>
          <th id="settings-th-input">Input</th>
          <th id="settings-th-output">Output</th>
          <th id="settings-th-cache-write">Cache Write</th>
          <th id="settings-th-cache-read">Cache Read</th>
        </tr>
      </thead>
      <tbody id="settings-pricing-body"></tbody>
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
let selectedRange = '7d';
let customStart = null;
let customEnd = null;
let currentLang = 'en';
let customModelPricing = {};
let usageView = 'model';
let charts = {};
let sessionSortCol = 'last';
let modelSortCol = 'cost'; let modelSortDir = 'desc';
let projectSortCol = 'cost'; let projectSortDir = 'desc';
let sessionSortDir = 'desc';
let hourlyTZ = 'local';

// ── Pricing (Anthropic API) ───────────────────────────────────────────────
const PRICING = {
  // Anthropic (official model pricing; prompt cache read=0.1x input, write=1.25x input for 5m cache)
  'claude-opus-4-1':   { input: 15.00, output: 75.00, cache_write: 18.75, cache_read: 1.50 },
  'claude-opus-4':     { input: 15.00, output: 75.00, cache_write: 18.75, cache_read: 1.50 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cache_write:  3.75, cache_read: 0.30 },
  'claude-sonnet-4':   { input:  3.00, output: 15.00, cache_write:  3.75, cache_read: 0.30 },

  // OpenAI (official API pricing, standard short-context tier)
  // Note: OpenAI publishes "cached input" price; we map cache_read to cached input, cache_write to input.
  'gpt-5.5':           { input:  2.50, output: 15.00, cache_write:  2.50, cache_read: 0.25 },
  'gpt-5.4':           { input:  1.25, output:  7.50, cache_write:  1.25, cache_read: 0.13 },
  'gpt-5.4-mini':      { input:  0.375, output: 2.25, cache_write:  0.375, cache_read: 0.0375 },

  // DeepSeek (official API pricing, per 1M tokens)
  // cache_write maps to "cache miss input", cache_read maps to "cache hit input".
  // Note: deepseek-v4-pro currently shows discounted rates on official pricing page.
  'deepseek-v4-flash': { input:  0.14, output:  0.28, cache_write:  0.14, cache_read: 0.0028 },
  'deepseek-v4-pro':   { input:  0.435, output: 0.87, cache_write:  0.435, cache_read: 0.003625 },

  // Google Gemini (official API pricing, per 1M tokens, <=200K context tier)
  // Context caching: cache_read at 0.025x input, cache_write at input rate.
  'gemini-2.5-pro':     { input:  1.25, output: 10.00, cache_write: 1.25, cache_read: 0.03125 },
  'gemini-2.5-flash':   { input:  0.15, output:  0.60, cache_write: 0.15, cache_read: 0.00375 },
  'gemini-3-flash':     { input:  0.50, output:  3.00, cache_write: 0.50, cache_read: 0.0125 },
  'gemini-3-pro':       { input:  2.00, output: 12.00, cache_write: 2.00, cache_read: 0.05 },
};

function loadPricingConfig(overrides) {
  customModelPricing = overrides && typeof overrides === 'object' ? overrides : {};
}

async function persistPricingConfig() {
  await fetch('/api/pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pricing_overrides: customModelPricing }),
  });
}

function getCustomPricing(model) {
  if (!model || !customModelPricing[model]) return null;
  const p = customModelPricing[model];
  if (!p.enabled) return null;
  return p;
}

function isBillable(model) {
  if (!model) return false;
  if (customModelPricing[model]) return !!customModelPricing[model].enabled;
  // Check if built-in PRICING or fallback lookup returns a tier for this model
  return getPricing(model) !== null;
}

function getPricing(model) {
  if (!model) return null;
  const custom = getCustomPricing(model);
  if (custom) return custom;
  if (PRICING[model]) return PRICING[model];
  for (const key of Object.keys(PRICING))
    if (model.startsWith(key)) return PRICING[key];
  const m = model.toLowerCase();
  if (m.includes('deepseek-v4-pro')) return PRICING['deepseek-v4-pro'];
  if (m.includes('deepseek-v4-flash')) return PRICING['deepseek-v4-flash'];
  if (m.includes('gpt-5.5')) return PRICING['gpt-5.5'];
  if (m.includes('gpt-5.4-mini')) return PRICING['gpt-5.4-mini'];
  if (m.includes('gpt-5.4')) return PRICING['gpt-5.4'];
  if (m.includes('gemini-3-pro')) return PRICING['gemini-3-pro'];
  if (m.includes('gemini-3-flash')) return PRICING['gemini-3-flash'];
  if (m.includes('gemini-2.5-pro')) return PRICING['gemini-2.5-pro'];
  if (m.includes('gemini-2.5-flash')) return PRICING['gemini-2.5-flash'];
  if (m.includes('gemini-pro')) return PRICING['gemini-2.5-pro'];
  if (m.includes('gemini-flash')) return PRICING['gemini-2.5-flash'];
  if (m.includes('opus'))   return PRICING['claude-opus-4-1'];
  if (m.includes('sonnet')) return PRICING['claude-sonnet-4-6'];
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
function fmtTableTokens(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n/1e9).toFixed(2)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(2)+'K';
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

const I18N = {
  zh: {
    pageTitle: '用量统计',
    agents: 'Agents',
    models: 'Models',
    range: 'Range',
    all: 'All',
    none: 'None',
    apply: '应用',
    rescan: 'Rescan',
    scanning: '扫描中...',
    customRange: '自定义范围',
    days: '天',
    sessions: '会话数',
    turns: '轮次',
    totalTokens: '总Tokens',
    input: '输入',
    output: '输出',
    cache: '缓存',
    totalCost: '总费用',
    inputOutput: '输入 + 输出',
    tokens: 'tokens',
    cacheHint: 'read + creation',
    estimated: 'estimated',
    chartTitle: '总Tokens / 总费用',
    tableModel: '模型',
    tableProject: '项目',
    tableAgent: 'Agent',
    tableTrend: '趋势',
    noData: '当前筛选条件下没有数据',
    axisTokens: 'Tokens',
    axisCost: '费用 ($)',
    metaSessions: 'sessions · updated',
    rescanDone: 'Rescan complete:',
    rescanFailed: 'Rescan failed',
    scanHint: 'Failed to load data. Run "usage scan" first.',
    footer1: 'Cost estimates based on Anthropic API pricing. Only Anthropic models (opus/sonnet/haiku) are included in cost calculations.',
    footer2: 'terminal-agents-usage — unified multi-agent usage tracker',
    settingsTitle: '模型价格设置',
    settingsSub: '配置用于成本计算的每 1M tokens 单价（USD）',
    settingsClose: '关闭',
    settingsReset: '重置',
    settingsSave: '保存',
    settingsModel: '模型',
    settingsEnable: '启用',
    settingsInput: '输入',
    settingsOutput: '输出',
    settingsCacheWrite: '缓存写入',
    settingsCacheRead: '缓存读取',
    byAgent: '按 Agent',
    byModel: '按模型',
    byProject: '按项目',
    agentView: 'Agent 视角',
    usageTable: '用量明细',
    modelView: '模型视角',
    projectView: '项目视角',
    selectedCount: '已选',
    rangeLabels: { week: '本周', month: '本月', 'prev-month': '上月', '7d': '最近7天', '30d': '最近30天', '90d': '最近90天', all: '全部', custom: '自定义' },
  },
  en: {
    pageTitle: 'Terminal Agents Usage',
    agents: 'Agents',
    models: 'Models',
    range: 'Range',
    all: 'All',
    none: 'None',
    apply: 'Apply',
    rescan: 'Rescan',
    scanning: 'Scanning...',
    customRange: 'Custom Range',
    days: 'day',
    sessions: 'Sessions',
    turns: 'Turns',
    totalTokens: 'Total Tokens',
    input: 'Input',
    output: 'Output',
    cache: 'Cache',
    totalCost: 'Total Cost',
    inputOutput: 'input + output',
    tokens: 'tokens',
    cacheHint: 'read + creation',
    estimated: 'estimated',
    chartTitle: 'Total Tokens / Total Cost',
    tableModel: 'Model',
    tableProject: 'Project',
    tableAgent: 'Agent',
    tableTrend: 'Trend',
    noData: 'No usage data for the current filters.',
    axisTokens: 'Tokens',
    axisCost: 'Cost ($)',
    metaSessions: 'sessions · updated',
    rescanDone: 'Rescan complete:',
    rescanFailed: 'Rescan failed',
    scanHint: 'Failed to load data. Run "usage scan" first.',
    footer1: 'Cost estimates based on Anthropic API pricing. Only Anthropic models (opus/sonnet/haiku) are included in cost calculations.',
    footer2: 'terminal-agents-usage — unified multi-agent usage tracker',
    settingsTitle: 'Model Pricing Settings',
    settingsSub: 'Configure USD per 1M tokens used in cost calculation.',
    settingsClose: 'Close',
    settingsReset: 'Reset',
    settingsSave: 'Save',
    settingsModel: 'Model',
    settingsEnable: 'Enable',
    settingsInput: 'Input',
    settingsOutput: 'Output',
    settingsCacheWrite: 'Cache Write',
    settingsCacheRead: 'Cache Read',
    byAgent: 'By Agent',
    byModel: 'By Model',
    byProject: 'By Project',
    agentView: 'Agent View',
    usageTable: 'Usage Details',
    modelView: 'Model View',
    projectView: 'Project View',
    selectedCount: 'selected',
    rangeLabels: { week: 'This Week', month: 'This Month', 'prev-month': 'Prev Month', '7d': '7d', '30d': '30d', '90d': '90d', all: 'All', custom: 'Custom' },
  }
};
function t(key) { return I18N[currentLang][key]; }
function rangeLabel(key) { return I18N[currentLang].rangeLabels[key] || key; }
const RANGE_LABELS = { 'week': 'This Week', 'month': 'This Month', 'prev-month': 'Previous Month', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'all': 'All Time', 'custom': 'Custom Range' };
const RANGE_TICKS  = { 'week': 7, 'month': 15, 'prev-month': 15, '7d': 7, '30d': 15, '90d': 13, 'all': 12 };
const VALID_RANGES = Object.keys(RANGE_LABELS);

function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  updateStaticText();
  applyFilter();
}

function updateStaticText() {
  document.getElementById('page-title').textContent = t('pageTitle');
  document.getElementById('label-agents').textContent = t('agents');
  document.getElementById('label-models').textContent = t('models');
  document.getElementById('label-range').textContent = t('range');
  document.getElementById('custom-range-apply').textContent = t('apply');
  document.getElementById('rescan-btn').textContent = '\\u21bb ' + t('rescan');
  document.getElementById('lang-btn').textContent = currentLang === 'zh' ? 'EN' : '中文';
  document.getElementById('settings-title').textContent = t('settingsTitle');
  document.getElementById('settings-sub').textContent = t('settingsSub');
  document.getElementById('settings-close-btn').textContent = t('settingsClose');
  document.getElementById('settings-reset-btn').textContent = t('settingsReset');
  document.getElementById('settings-save-btn').textContent = t('settingsSave');
  document.getElementById('settings-th-model').textContent = t('settingsModel');
  document.getElementById('settings-th-enable').textContent = t('settingsEnable');
  document.getElementById('settings-th-input').textContent = t('settingsInput');
  document.getElementById('settings-th-output').textContent = t('settingsOutput');
  document.getElementById('settings-th-cache-write').textContent = t('settingsCacheWrite');
  document.getElementById('settings-th-cache-read').textContent = t('settingsCacheRead');
  document.getElementById('agent-pie-title').textContent = t('byAgent');
  document.getElementById('model-pie-title').textContent = usageView === 'project' ? t('byProject') : (usageView === 'agent' ? t('byAgent') : t('byModel'));
  document.getElementById('usage-title').textContent = t('usageTable');
  document.getElementById('view-model-btn').textContent = t('modelView');
  document.getElementById('view-project-btn').textContent = t('projectView');
  document.getElementById('view-agent-btn').textContent = t('agentView');
  document.querySelectorAll('.range-btn').forEach(btn => { btn.textContent = rangeLabel(btn.dataset.range); });
  const footer = document.querySelectorAll('.footer-content p');
  if (footer.length >= 2) {
    footer[0].textContent = t('footer1');
    footer[1].textContent = t('footer2');
  }
  document.querySelectorAll('.menu-action-btn').forEach((btn) => {
    const text = btn.textContent?.toLowerCase() || '';
    if (text.includes('none') || text.includes('全不选')) btn.textContent = t('none');
    else btn.textContent = t('all');
  });
  updateFilterButtonLabels();
  renderMeta();
}

function pricingSeedForModel(model) {
  const custom = customModelPricing[model];
  if (custom) return { enabled: !!custom.enabled, input: custom.input ?? 0, output: custom.output ?? 0, cache_write: custom.cache_write ?? 0, cache_read: custom.cache_read ?? 0 };
  const p = getPricing(model);
  if (p && isBillable(model)) return { enabled: true, input: p.input ?? 0, output: p.output ?? 0, cache_write: p.cache_write ?? 0, cache_read: p.cache_read ?? 0 };
  return { enabled: false, input: 0, output: 0, cache_write: 0, cache_read: 0 };
}

function renderPricingSettingsRows() {
  const body = document.getElementById('settings-pricing-body');
  const models = (rawData?.all_models || []).slice().sort((a, b) => a.localeCompare(b));
  body.innerHTML = models.map((model) => {
    const seed = pricingSeedForModel(model);
    return '<tr data-model="' + esc(model) + '">' +
      '<td class="mono">' + esc(model) + '</td>' +
      '<td><input type="checkbox" data-field="enabled" ' + (seed.enabled ? 'checked' : '') + '></td>' +
      '<td><input class="price-input" data-field="input" type="number" step="0.0001" min="0" value="' + seed.input + '"></td>' +
      '<td><input class="price-input" data-field="output" type="number" step="0.0001" min="0" value="' + seed.output + '"></td>' +
      '<td><input class="price-input" data-field="cache_write" type="number" step="0.0001" min="0" value="' + seed.cache_write + '"></td>' +
      '<td><input class="price-input" data-field="cache_read" type="number" step="0.0001" min="0" value="' + seed.cache_read + '"></td>' +
      '</tr>';
  }).join('');
}

function openPricingSettings() {
  renderPricingSettingsRows();
  document.getElementById('settings-overlay').classList.add('open');
}

function closePricingSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
}

function onSettingsOverlayClick(e) {
  if (e.target && e.target.id === 'settings-overlay') closePricingSettings();
}

async function savePricingSettings() {
  const next = {};
  document.querySelectorAll('#settings-pricing-body tr').forEach((row) => {
    const model = row.getAttribute('data-model');
    if (!model) return;
    const enabled = row.querySelector('input[data-field="enabled"]').checked;
    const input = Number(row.querySelector('input[data-field="input"]').value || 0);
    const output = Number(row.querySelector('input[data-field="output"]').value || 0);
    const cache_write = Number(row.querySelector('input[data-field="cache_write"]').value || 0);
    const cache_read = Number(row.querySelector('input[data-field="cache_read"]').value || 0);
    next[model] = { enabled, input, output, cache_write, cache_read };
  });
  customModelPricing = next;
  await persistPricingConfig();
  closePricingSettings();
  applyFilter();
}

async function resetPricingSettings() {
  customModelPricing = {};
  await persistPricingConfig();
  renderPricingSettingsRows();
  applyFilter();
}

function getRangeBounds(range) {
  if (range === 'custom') return { start: customStart, end: customEnd };
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

function displayRangeBounds(start, end, dailyRows) {
  const days = dailyRows.map(r => r.day).sort();
  const today = new Date().toISOString().slice(0, 10);
  const s = start || days[0] || today;
  const e = end || days[days.length - 1] || today;
  const startInput = document.getElementById('custom-start');
  const endInput = document.getElementById('custom-end');
  if (startInput) startInput.value = s;
  if (endInput) endInput.value = e;
}

function setRange(range) {
  selectedRange = range;
  document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === range));
  if (range !== 'custom') document.getElementById('custom-range-panel').classList.remove('open');
  applyFilter();
}

function toggleCustomRangePanel() {
  const panel = document.getElementById('custom-range-panel');
  const willOpen = !panel.classList.contains('open');
  panel.classList.toggle('open', willOpen);
  if (willOpen) {
    selectedRange = 'custom';
    document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === 'custom'));
  }
}

function applyCustomRange() {
  const startInput = document.getElementById('custom-start');
  const endInput = document.getElementById('custom-end');
  customStart = startInput.value || null;
  customEnd = endInput.value || null;
  if (customStart && customEnd && customStart > customEnd) {
    const tmp = customStart;
    customStart = customEnd;
    customEnd = tmp;
    startInput.value = customStart;
    endInput.value = customEnd;
  }
  selectedRange = 'custom';
  document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === 'custom'));
  document.getElementById('custom-range-panel').classList.remove('open');
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
  selectedModels = new Set(allModels);
  selectedAgents = new Set(allAgents);

  document.getElementById('model-checkboxes').innerHTML = sorted.map(m => {
    const checked = selectedModels.has(m);
    return '<label class="cb-label' + (checked ? ' checked' : '') + '" data-model="' + esc(m) + '"><input type="checkbox" value="' + esc(m) + '" ' + (checked ? 'checked' : '') + ' onchange="onModelToggle(this)"><span>' + esc(m) + '</span></label>';
  }).join('');

  document.getElementById('agent-checkboxes').innerHTML = allAgents.map(a => {
    const checked = selectedAgents.has(a);
    return '<label class="cb-label' + (checked ? ' checked' : '') + '" data-agent="' + esc(a) + '"><input type="checkbox" value="' + esc(a) + '" ' + (checked ? 'checked' : '') + ' onchange="onAgentToggle(this)"><span>' + esc(a) + '</span></label>';
  }).join('');

  const params = new URLSearchParams(window.location.search);
  const urlRange = params.get('range');
  const urlLang = params.get('lang');
  if (urlLang === 'en' || urlLang === 'zh') currentLang = urlLang;
  const urlStart = params.get('start');
  const urlEnd = params.get('end');
  if (urlStart) customStart = urlStart;
  if (urlEnd) customEnd = urlEnd;
  if (VALID_RANGES.includes(urlRange)) selectedRange = urlRange;
  document.querySelectorAll('.range-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.range === selectedRange));
  document.getElementById('custom-range-panel').classList.toggle('open', selectedRange === 'custom');
  updateFilterButtonLabels();
  updateStaticText();
}

function updateFilterButtonLabels() {
  if (!rawData) return;
  const totalAgents = rawData.all_agents.length || 0;
  const totalModels = rawData.all_models.length || 0;
  const aCount = selectedAgents.size;
  const mCount = selectedModels.size;
  document.getElementById('agent-filter-text').textContent = aCount === totalAgents ? t('all') : (aCount + ' ' + t('selectedCount'));
  document.getElementById('model-filter-text').textContent = mCount === totalModels ? t('all') : (mCount + ' ' + t('selectedCount'));
}

function toggleFilterMenu(type) {
  const agentMenu = document.getElementById('agent-filter-menu');
  const modelMenu = document.getElementById('model-filter-menu');
  if (type === 'agent') {
    agentMenu.classList.toggle('open');
    modelMenu.classList.remove('open');
  } else {
    modelMenu.classList.toggle('open');
    agentMenu.classList.remove('open');
  }
}

function closeFilterMenus() {
  document.getElementById('agent-filter-menu').classList.remove('open');
  document.getElementById('model-filter-menu').classList.remove('open');
}

function onModelToggle(cb) {
  const label = cb.closest('label');
  if (cb.checked) { selectedModels.add(cb.value); label.classList.add('checked'); }
  else { selectedModels.delete(cb.value); label.classList.remove('checked'); }
  updateFilterButtonLabels();
  applyFilter();
}

function onAgentToggle(cb) {
  const label = cb.closest('label');
  if (cb.checked) { selectedAgents.add(cb.value); label.classList.add('checked'); }
  else { selectedAgents.delete(cb.value); label.classList.remove('checked'); }
  updateFilterButtonLabels();
  applyFilter();
}

function selectAllModels() {
  document.querySelectorAll('#model-checkboxes input').forEach(cb => { cb.checked = true; selectedModels.add(cb.value); cb.closest('label').classList.add('checked'); });
  updateFilterButtonLabels();
  applyFilter();
}

function clearAllModels() {
  document.querySelectorAll('#model-checkboxes input').forEach(cb => { cb.checked = false; selectedModels.delete(cb.value); cb.closest('label').classList.remove('checked'); });
  updateFilterButtonLabels();
  applyFilter();
}

function selectAllAgents() {
  document.querySelectorAll('#agent-checkboxes input').forEach(cb => { cb.checked = true; selectedAgents.add(cb.value); cb.closest('label').classList.add('checked'); });
  updateFilterButtonLabels();
  applyFilter();
}

function clearAllAgents() {
  document.querySelectorAll('#agent-checkboxes input').forEach(cb => { cb.checked = false; selectedAgents.delete(cb.value); cb.closest('label').classList.remove('checked'); });
  updateFilterButtonLabels();
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

function setUsageView(mode) {
  usageView = mode === 'project' ? 'project' : (mode === 'agent' ? 'agent' : 'model');
  document.getElementById('view-model-btn').classList.toggle('active', usageView === 'model');
  document.getElementById('view-project-btn').classList.toggle('active', usageView === 'project');
  document.getElementById('view-agent-btn').classList.toggle('active', usageView === 'agent');
  applyFilter();
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

  const dailyModelMap = {};
  for (const r of filteredDaily) {
    if (!dailyModelMap[r.day]) dailyModelMap[r.day] = { day: r.day, input: 0, output: 0, cache_read: 0, cache_creation: 0, cost: 0 };
    const d = dailyModelMap[r.day];
    d.input += r.input; d.output += r.output; d.cache_read += r.cache_read; d.cache_creation += r.cache_creation;
    d.cost += calcCost(r.model, r.input, r.output, r.cache_read, r.cache_creation);
  }
  const dailyModel = Object.values(dailyModelMap).sort((a, b) => a.day.localeCompare(b.day));

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

  const dailyProjectMap = {};
  for (const s of filteredSessions) {
    const day = s.last_date;
    if (!day) continue;
    if (!dailyProjectMap[day]) dailyProjectMap[day] = { day, input: 0, output: 0, cache_read: 0, cache_creation: 0, cost: 0 };
    const d = dailyProjectMap[day];
    d.input += s.input || 0;
    d.output += s.output || 0;
    d.cache_read += s.cache_read || 0;
    d.cache_creation += s.cache_creation || 0;
    d.cost += calcCost(s.model, s.input || 0, s.output || 0, s.cache_read || 0, s.cache_creation || 0);
  }
  const dailyProject = Object.values(dailyProjectMap).sort((a, b) => a.day.localeCompare(b.day));
  const dailyAgent = Object.values(dailyProjectMap).sort((a, b) => a.day.localeCompare(b.day));

  for (const s of filteredSessions) { if (modelMap[s.model]) modelMap[s.model].sessions++; }
  const byModel = Object.values(modelMap).sort((a, b) => (b.input + b.output) - (a.input + a.output));

  // By agent
  const agentMap = {};
  for (const s of filteredSessions) {
    if (!agentMap[s.agent]) agentMap[s.agent] = { agent: s.agent, input: 0, output: 0, turns: 0 };
    const a = agentMap[s.agent];
    a.input += s.input || 0; a.output += s.output || 0; a.turns += s.turns || 0;
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

  const sourceForTotals = usageView === 'project' ? dailyProject : (usageView === 'agent' ? dailyAgent : dailyModel);
  const totals = {
    sessions: filteredSessions.length,
    turns: filteredSessions.reduce((s, it) => s + (it.turns || 0), 0),
    input: sourceForTotals.reduce((s, d) => s + (d.input || 0), 0),
    output: sourceForTotals.reduce((s, d) => s + (d.output || 0), 0),
    cache_read: sourceForTotals.reduce((s, d) => s + (d.cache_read || 0), 0),
    cache_creation: sourceForTotals.reduce((s, d) => s + (d.cache_creation || 0), 0),
    cost: sourceForTotals.reduce((s, d) => s + (d.cost || 0), 0),
  };

  const dailyForView = usageView === 'project' ? dailyProject : (usageView === 'agent' ? dailyAgent : dailyModel);
  displayRangeBounds(start, end, dailyForView);
  document.getElementById('daily-chart-title').textContent = t('chartTitle') + ' \\u2014 ' + rangeLabel(selectedRange);
  document.getElementById('daily-day-count').textContent = dailyForView.length + ' ' + t('days') + (currentLang === 'en' && dailyForView.length === 1 ? '' : (currentLang === 'en' ? 's' : ''));
  document.getElementById('model-pie-title').textContent = usageView === 'project' ? t('byProject') : (usageView === 'agent' ? t('byAgent') : t('byModel'));

  renderStats(totals);
  const stackedSeries = usageView === 'project'
    ? buildProjectStackedSeries(filteredSessions, dailyForView)
    : usageView === 'agent'
      ? buildAgentStackedSeries(filteredSessions, dailyForView)
      : buildModelStackedSeries(filteredDaily, dailyForView);
  renderDailyChart(dailyForView, stackedSeries);
  renderAgentChart(byAgent);
  if (usageView === 'project') renderProjectPie(byProject);
  else if (usageView === 'agent') renderAgentPie(byAgent);
  else renderModelChart(byModel);
  if (usageView === 'project') renderProjectUsageMatrix(filteredSessions, dailyForView);
  else if (usageView === 'agent') renderAgentUsageMatrix(filteredSessions, dailyForView);
  else renderUsageMatrix(filteredDaily, filteredSessions, dailyForView);
}

function buildModelStackedSeries(filteredDaily, dailyRows) {
  const days = dailyRows.map(d => d.day);
  const totalByModel = {};
  for (const r of filteredDaily) {
    totalByModel[r.model] = (totalByModel[r.model] || 0) + (r.input || 0) + (r.output || 0);
  }
  const topKeys = Object.entries(totalByModel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);
  const includeOther = Object.keys(totalByModel).length > topKeys.length;

  const tokenMap = {};
  const costMap = {};
  for (const k of [...topKeys, ...(includeOther ? ['__other__'] : [])]) {
    tokenMap[k] = {};
    costMap[k] = {};
    for (const day of days) {
      tokenMap[k][day] = 0;
      costMap[k][day] = 0;
    }
  }

  for (const r of filteredDaily) {
    const key = topKeys.includes(r.model) ? r.model : '__other__';
    if (!tokenMap[key]) continue;
    const tokens = (r.input || 0) + (r.output || 0);
    const cost = calcCost(r.model, r.input || 0, r.output || 0, r.cache_read || 0, r.cache_creation || 0);
    tokenMap[key][r.day] += tokens;
    costMap[key][r.day] += cost;
  }

  const labels = [...topKeys, ...(includeOther ? ['__other__'] : [])];
  return labels.map((key) => ({
    label: key === '__other__' ? 'Other' : key,
    tokens: days.map((d) => tokenMap[key][d] || 0),
    cost: days.map((d) => costMap[key][d] || 0),
  }));
}

function buildProjectStackedSeries(filteredSessions, dailyRows) {
  const days = dailyRows.map(d => d.day);
  const totalByProject = {};
  for (const s of filteredSessions) {
    totalByProject[s.project] = (totalByProject[s.project] || 0) + (s.input || 0) + (s.output || 0);
  }
  const topKeys = Object.entries(totalByProject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);
  const includeOther = Object.keys(totalByProject).length > topKeys.length;

  const tokenMap = {};
  const costMap = {};
  for (const k of [...topKeys, ...(includeOther ? ['__other__'] : [])]) {
    tokenMap[k] = {};
    costMap[k] = {};
    for (const day of days) {
      tokenMap[k][day] = 0;
      costMap[k][day] = 0;
    }
  }

  for (const s of filteredSessions) {
    const day = s.last_date;
    if (!day) continue;
    const key = topKeys.includes(s.project) ? s.project : '__other__';
    if (!tokenMap[key] || !(day in tokenMap[key])) continue;
    const tokens = (s.input || 0) + (s.output || 0);
    const cost = calcCost(s.model, s.input || 0, s.output || 0, s.cache_read || 0, s.cache_creation || 0);
    tokenMap[key][day] += tokens;
    costMap[key][day] += cost;
  }

  const labels = [...topKeys, ...(includeOther ? ['__other__'] : [])];
  return labels.map((key) => ({
    label: key === '__other__' ? 'Other' : key,
    tokens: days.map((d) => tokenMap[key][d] || 0),
    cost: days.map((d) => costMap[key][d] || 0),
  }));
}

function buildAgentStackedSeries(filteredSessions, dailyRows) {
  const days = dailyRows.map(d => d.day);
  const totalByAgent = {};
  for (const s of filteredSessions) {
    totalByAgent[s.agent] = (totalByAgent[s.agent] || 0) + (s.input || 0) + (s.output || 0);
  }
  const topKeys = Object.entries(totalByAgent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);
  const includeOther = Object.keys(totalByAgent).length > topKeys.length;
  const tokenMap = {};
  const costMap = {};
  for (const k of [...topKeys, ...(includeOther ? ['__other__'] : [])]) {
    tokenMap[k] = {};
    costMap[k] = {};
    for (const day of days) {
      tokenMap[k][day] = 0;
      costMap[k][day] = 0;
    }
  }
  for (const s of filteredSessions) {
    const day = s.last_date;
    if (!day) continue;
    const key = topKeys.includes(s.agent) ? s.agent : '__other__';
    if (!tokenMap[key] || !(day in tokenMap[key])) continue;
    const tokens = (s.input || 0) + (s.output || 0);
    const cost = calcCost(s.model, s.input || 0, s.output || 0, s.cache_read || 0, s.cache_creation || 0);
    tokenMap[key][day] += tokens;
    costMap[key][day] += cost;
  }
  const labels = [...topKeys, ...(includeOther ? ['__other__'] : [])];
  return labels.map((key) => ({
    label: key === '__other__' ? 'Other' : key,
    tokens: days.map((d) => tokenMap[key][d] || 0),
    cost: days.map((d) => costMap[key][d] || 0),
  }));
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
function renderStats(totals) {
  const rl = rangeLabel(selectedRange);
  const stats = [
    { label: t('sessions'), value: totals.sessions.toLocaleString(), sub: rl },
    { label: t('turns'), value: fmt(totals.turns), sub: rl },
    { label: t('totalTokens'), value: fmt(totals.input + totals.output), sub: t('inputOutput') },
    { label: t('input'), value: fmt(totals.input), sub: t('tokens') },
    { label: t('output'), value: fmt(totals.output), sub: t('tokens') },
    { label: t('cache'), value: fmt(totals.cache_read + totals.cache_creation), sub: t('cacheHint') },
    { label: t('totalCost'), value: fmtCostBig(totals.cost), sub: t('estimated'), color: '#2f8f46' },
  ];
  document.getElementById('stats-row').innerHTML = stats.map(s =>
    '<div class="stat-card"><div class="label">' + s.label + '</div><div class="value" style="' + (s.color ? 'color:' + s.color : '') + '">' + esc(s.value) + '</div>' + (s.sub ? '<div class="sub">' + esc(s.sub) + '</div>' : '') + '</div>'
  ).join('');
}

function renderDailyChart(daily, series = []) {
  const ctx = document.getElementById('chart-daily').getContext('2d');
  if (charts.daily) charts.daily.destroy();
  const labels = daily.map(d => d.day);
  const datasets = [];
  if (series.length > 0) {
    series.forEach((s, idx) => {
      datasets.push({
        label: s.label + ' · ' + t('totalTokens'),
        data: s.tokens,
        backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length],
        borderRadius: 0,
        barPercentage: 0.86,
        categoryPercentage: 0.7,
        yAxisID: 'y',
        stack: 'tokens',
      });
    });
    series.forEach((s, idx) => {
      datasets.push({
        label: s.label + ' · ' + t('totalCost'),
        data: s.cost,
        backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length] + '99',
        borderRadius: 0,
        barPercentage: 0.86,
        categoryPercentage: 0.7,
        yAxisID: 'y1',
        stack: 'cost',
      });
    });
  } else {
    const tokenData = daily.map(d => d.input + d.output);
    const costData = daily.map(d => d.cost || 0);
    datasets.push(
      { label: t('totalTokens'), data: tokenData, backgroundColor: 'rgba(88,116,200,0.95)', borderRadius: 0, barPercentage: 0.46, categoryPercentage: 0.72, yAxisID: 'y' },
      { label: t('totalCost'), data: costData, backgroundColor: 'rgba(145,202,118,0.95)', borderRadius: 0, barPercentage: 0.46, categoryPercentage: 0.72, yAxisID: 'y1' },
    );
  }
  charts.daily = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { color: '#303744', boxWidth: 24, boxHeight: 14 } } },
      scales: {
        x: { ticks: { color: '#596273', maxTicksLimit: RANGE_TICKS[selectedRange] }, grid: { display: false } },
        y:  { stacked: series.length > 0, position: 'left', beginAtZero: true, ticks: { color: '#596273', callback: v => fmt(v) }, grid: { color: '#dfe5ee' }, title: { display: true, text: t('axisTokens'), color: '#596273', align: 'end' } },
        y1: { stacked: series.length > 0, position: 'right', beginAtZero: true, ticks: { color: '#596273', callback: v => '$' + Number(v).toFixed(2) }, grid: { drawOnChartArea: false }, title: { display: true, text: t('axisCost'), color: '#596273', align: 'end' } },
      }
    }
  });
}

function trendColor(index) {
  const colors = ['#4f6ed1', '#79bd64', '#ffb02e', '#ff5b5b', '#62b9e8', '#9b72d9'];
  return colors[index % colors.length];
}

function heatClass(value, max) {
  if (!value || !max) return '';
  const ratio = value / max;
  if (ratio > 0.75) return ' heat-4';
  if (ratio > 0.45) return ' heat-3';
  if (ratio > 0.18) return ' heat-2';
  return ' heat-1';
}

function percentDelta(current, prev) {
  if (!prev && !current) return '';
  if (!prev) return '';
  const pct = ((current - prev) / prev) * 100;
  if (Math.abs(pct) < 0.05) return '';
  const cls = pct > 0 ? 'up' : 'down';
  const sign = pct > 0 ? '+' : '';
  return '<span class="delta ' + cls + '">' + sign + pct.toFixed(1) + '%</span>';
}

function sparkline(values, color) {
  const w = 94, h = 36, pad = 2;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const line = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ' L ' + (w - pad) + ' ' + (h - pad) + ' L ' + pad + ' ' + (h - pad) + ' Z';
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
    '<path class="area" d="' + area + '" fill="' + color + '"></path>' +
    '<path class="line" d="' + line + '" stroke="' + color + '"></path>' +
    '</svg>';
}

function renderUsageMatrix(filteredDaily, filteredSessions, dailyTotals) {
  const daySet = new Set(dailyTotals.map(d => d.day));
  const days = [...daySet].sort();
  const modelMap = {};

  for (const r of filteredDaily) {
    if (!modelMap[r.model]) modelMap[r.model] = { model: r.model, agent: r.agent, total: 0, cost: 0, days: {} };
    const row = modelMap[r.model];
    const tokens = r.input + r.output;
    const cost = calcCost(r.model, r.input, r.output, r.cache_read, r.cache_creation);
    row.total += tokens;
    row.cost += cost;
    row.days[r.day] = {
      tokens,
      cost,
      turns: r.turns,
    };
  }

  for (const s of filteredSessions) {
    if (modelMap[s.model]) modelMap[s.model].agent = modelMap[s.model].agent || s.agent;
  }

  const rows = Object.values(modelMap).sort((a, b) => b.total - a.total);
  const maxCell = Math.max(...rows.flatMap(r => days.map(d => r.days[d]?.tokens || 0)), 1);
  const totalsByDay = {};
  for (const d of dailyTotals) totalsByDay[d.day] = d;

  document.getElementById('usage-head').innerHTML = '<tr>' +
    '<th>' + t('tableModel') + '</th>' +
    days.map(day => {
      const total = totalsByDay[day] || { input: 0, output: 0, cost: 0 };
      return '<th class="day-head">' + esc(day) +
        '<span class="day-total">' + fmtTableTokens(total.input + total.output) + '<br>' + fmtCostBig(total.cost || 0) + '</span>' +
        '</th>';
    }).join('') +
    '<th class="trend-cell">' + t('tableTrend') + '</th>' +
    '</tr>';

  if (!rows.length) {
    document.getElementById('usage-body').innerHTML = '<tr><td class="muted" colspan="' + (days.length + 2) + '">' + t('noData') + '</td></tr>';
    return;
  }

  document.getElementById('usage-body').innerHTML = rows.map((row, rowIndex) => {
    const values = days.map(day => row.days[day]?.tokens || 0);
    const color = trendColor(rowIndex);
    const cells = days.map((day, i) => {
      const cell = row.days[day];
      if (!cell || !cell.tokens) return '<td class="usage-cell empty">0 <span class="dash">-</span><div class="cell-cost">$0</div></td>';
      const delta = percentDelta(cell.tokens, i > 0 ? values[i - 1] : 0) || '<span class="dash">-</span>';
      return '<td class="usage-cell' + heatClass(cell.tokens, maxCell) + '">' +
        '<div><span class="cell-tokens">' + fmtTableTokens(cell.tokens) + '</span>' + delta + '</div>' +
        '<div class="cell-cost">' + fmtCostBig(cell.cost) + '</div>' +
        '</td>';
    }).join('');
    return '<tr>' +
      '<td class="model-name">' + esc(row.model) + '</td>' +
      cells +
      '<td class="trend-cell">' + sparkline(values, color) + '</td>' +
      '</tr>';
  }).join('');
}

function renderProjectUsageMatrix(filteredSessions, dailyTotals) {
  const daySet = new Set(dailyTotals.map(d => d.day));
  const days = [...daySet].sort();
  const projectMap = {};

  for (const s of filteredSessions) {
    const day = s.last_date;
    if (!day) continue;
    if (!projectMap[s.project]) projectMap[s.project] = { project: s.project, total: 0, cost: 0, days: {} };
    const row = projectMap[s.project];
    const tokens = (s.input || 0) + (s.output || 0);
    const cost = calcCost(s.model, s.input || 0, s.output || 0, s.cache_read || 0, s.cache_creation || 0);
    row.total += tokens;
    row.cost += cost;
    if (!row.days[day]) row.days[day] = { tokens: 0, cost: 0 };
    row.days[day].tokens += tokens;
    row.days[day].cost += cost;
  }

  const rows = Object.values(projectMap).sort((a, b) => b.total - a.total);
  const maxCell = Math.max(...rows.flatMap(r => days.map(d => r.days[d]?.tokens || 0)), 1);
  const totalsByDay = {};
  for (const d of dailyTotals) totalsByDay[d.day] = d;

  document.getElementById('usage-head').innerHTML = '<tr>' +
    '<th>' + t('tableProject') + '</th>' +
    days.map(day => {
      const total = totalsByDay[day] || { input: 0, output: 0, cost: 0 };
      return '<th class="day-head">' + esc(day) +
        '<span class="day-total">' + fmtTableTokens(total.input + total.output) + '<br>' + fmtCostBig(total.cost || 0) + '</span>' +
        '</th>';
    }).join('') +
    '<th class="trend-cell">' + t('tableTrend') + '</th>' +
    '</tr>';

  if (!rows.length) {
    document.getElementById('usage-body').innerHTML = '<tr><td class="muted" colspan="' + (days.length + 2) + '">' + t('noData') + '</td></tr>';
    return;
  }

  document.getElementById('usage-body').innerHTML = rows.map((row, rowIndex) => {
    const values = days.map(day => row.days[day]?.tokens || 0);
    const color = trendColor(rowIndex);
    const cells = days.map((day, i) => {
      const cell = row.days[day];
      if (!cell || !cell.tokens) return '<td class="usage-cell empty">0 <span class="dash">-</span><div class="cell-cost">$0</div></td>';
      const delta = percentDelta(cell.tokens, i > 0 ? values[i - 1] : 0) || '<span class="dash">-</span>';
      return '<td class="usage-cell' + heatClass(cell.tokens, maxCell) + '">' +
        '<div><span class="cell-tokens">' + fmtTableTokens(cell.tokens) + '</span>' + delta + '</div>' +
        '<div class="cell-cost">' + fmtCostBig(cell.cost) + '</div>' +
        '</td>';
    }).join('');
    return '<tr>' +
      '<td class="model-name">' + esc(row.project) + '</td>' +
      cells +
      '<td class="trend-cell">' + sparkline(values, color) + '</td>' +
      '</tr>';
  }).join('');
}

function renderAgentUsageMatrix(filteredSessions, dailyTotals) {
  const daySet = new Set(dailyTotals.map(d => d.day));
  const days = [...daySet].sort();
  const agentMap = {};
  for (const s of filteredSessions) {
    const day = s.last_date;
    if (!day) continue;
    if (!agentMap[s.agent]) agentMap[s.agent] = { agent: s.agent, total: 0, cost: 0, days: {} };
    const row = agentMap[s.agent];
    const tokens = (s.input || 0) + (s.output || 0);
    const cost = calcCost(s.model, s.input || 0, s.output || 0, s.cache_read || 0, s.cache_creation || 0);
    row.total += tokens;
    row.cost += cost;
    if (!row.days[day]) row.days[day] = { tokens: 0, cost: 0 };
    row.days[day].tokens += tokens;
    row.days[day].cost += cost;
  }

  const rows = Object.values(agentMap).sort((a, b) => b.total - a.total);
  const maxCell = Math.max(...rows.flatMap(r => days.map(d => r.days[d]?.tokens || 0)), 1);
  const totalsByDay = {};
  for (const d of dailyTotals) totalsByDay[d.day] = d;

  document.getElementById('usage-head').innerHTML = '<tr>' +
    '<th>' + t('tableAgent') + '</th>' +
    days.map(day => {
      const total = totalsByDay[day] || { input: 0, output: 0, cost: 0 };
      return '<th class="day-head">' + esc(day) +
        '<span class="day-total">' + fmtTableTokens(total.input + total.output) + '<br>' + fmtCostBig(total.cost || 0) + '</span>' +
        '</th>';
    }).join('') +
    '<th class="trend-cell">' + t('tableTrend') + '</th>' +
    '</tr>';

  if (!rows.length) {
    document.getElementById('usage-body').innerHTML = '<tr><td class="muted" colspan="' + (days.length + 2) + '">' + t('noData') + '</td></tr>';
    return;
  }

  document.getElementById('usage-body').innerHTML = rows.map((row, rowIndex) => {
    const values = days.map(day => row.days[day]?.tokens || 0);
    const color = trendColor(rowIndex);
    const cells = days.map((day, i) => {
      const cell = row.days[day];
      if (!cell || !cell.tokens) return '<td class="usage-cell empty">0 <span class="dash">-</span><div class="cell-cost">$0</div></td>';
      const delta = percentDelta(cell.tokens, i > 0 ? values[i - 1] : 0) || '<span class="dash">-</span>';
      return '<td class="usage-cell' + heatClass(cell.tokens, maxCell) + '">' +
        '<div><span class="cell-tokens">' + fmtTableTokens(cell.tokens) + '</span>' + delta + '</div>' +
        '<div class="cell-cost">' + fmtCostBig(cell.cost) + '</div>' +
        '</td>';
    }).join('');
    return '<tr>' +
      '<td class="model-name">' + esc(row.agent) + '</td>' +
      cells +
      '<td class="trend-cell">' + sparkline(values, color) + '</td>' +
      '</tr>';
  }).join('');
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
      datasets: [{ data: byModel.map(m => m.input + m.output), backgroundColor: byModel.map((_, i) => MODEL_COLORS[i % MODEL_COLORS.length]), borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' tokens' } } }
    }
  });
}

function renderProjectPie(byProject) {
  const ctx = document.getElementById('chart-model').getContext('2d');
  if (charts.model) charts.model.destroy();
  if (!byProject.length) return;
  const top = byProject.slice(0, 16);
  charts.model = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top.map(p => p.project),
      datasets: [{ data: top.map(p => p.input + p.output), backgroundColor: top.map((_, i) => MODEL_COLORS[i % MODEL_COLORS.length]), borderWidth: 2, borderColor: '#1a1d27' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' tokens' } } }
    }
  });
}

function renderAgentPie(byAgent) {
  const ctx = document.getElementById('chart-model').getContext('2d');
  if (charts.model) charts.model.destroy();
  if (!byAgent.length) return;
  const top = byAgent.slice(0, 16);
  charts.model = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top.map(a => a.agent),
      datasets: [{ data: top.map(a => (a.input || 0) + (a.output || 0)), backgroundColor: top.map((_, i) => MODEL_COLORS[i % MODEL_COLORS.length]), borderWidth: 2, borderColor: '#1a1d27' }]
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
      datasets: [{ data: byAgent.map(a => a.input + a.output), backgroundColor: byAgent.map((_, i) => MODEL_COLORS[i % MODEL_COLORS.length]), borderWidth: 2, borderColor: '#1a1d27' }]
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

function renderMeta() {
  if (!rawData) return;
  document.getElementById('meta').textContent = rawData.sessions_all.length + ' ' + t('metaSessions') + ' ' + rawData.generated_at;
}

// ── Rescan ─────────────────────────────────────────────────────────────────
async function triggerRescan() {
  const btn = document.getElementById('rescan-btn');
  btn.disabled = true; btn.textContent = t('scanning');
  try {
    const res = await fetch('/api/rescan', { method: 'POST' });
    const data = await res.json();
    document.getElementById('meta').textContent = t('rescanDone') + ' ' + data.turnsAdded + ' turns, ' + data.sessionsSeen + ' sessions';
    await loadData();
  } catch(e) {
    document.getElementById('meta').textContent = t('rescanFailed');
  } finally {
    btn.disabled = false; btn.textContent = '\\u21bb ' + t('rescan');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('/api/data');
    rawData = await res.json();
    loadPricingConfig(rawData.pricing_overrides || {});
    renderMeta();
    buildFilterUI(rawData.all_models, rawData.all_agents);
    // Replace project chart with agent chart
    applyFilter();
  } catch(e) {
    document.getElementById('meta').textContent = t('scanHint');
  }
}

loadData();
document.getElementById('custom-start').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustomRange(); });
document.getElementById('custom-end').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustomRange(); });
document.addEventListener('click', (e) => {
  const target = e.target;
  if (!target || !target.closest || !target.closest('.filter-dropdown')) closeFilterMenus();
});
</script>
</body>
</html>`;
}
