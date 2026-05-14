# terminal-agents-usage

<img width="844" height="499" alt="image" src="https://github.com/user-attachments/assets/2ed0d3d3-f9de-42cc-b8e5-d6b5347815c4" />


Unified usage tracker for terminal AI coding agents — scan local agent logs, store usage data in SQLite, and view dashboards with token counts and cost estimates.

Supported agents: **Claude Code**, **OpenAI Codex**, **OpenClaw**, **DeepCode**, **Cursor**, **Gemini**.

## Install

```bash
npm install -g terminal-agents-usage
```

Or run directly:

```bash
npx terminal-agents-usage scan
```

> **Tip:** After global install, you can use either `terminal-agents-usage` or the shorter alias `usage`. Both are equivalent. Examples below use `usage` for brevity.

## Quick Start

The fastest way to get started — just launch the interactive terminal dashboard. It auto-scans your agent logs on first run:

```bash
npx terminal-agents-usage tui
```

Press `s` to re-scan anytime, `r` to refresh, `←`/`→` to switch tabs, `q` to quit.

## Commands

### `scan`

Scan local agent log files and populate the database.

```bash
usage scan              # scan all agents
usage scan --agent claude  # scan a specific agent
usage scan --rebuild     # clear and re-scan from scratch
```

Data is stored in `~/.config/terminal-agents/usage.db` by default. Override with `--db-path`.

### `today`

Show today's token usage summary (terminal UI).

```bash
usage today
usage today --agent claude
```

### `week`

Show the last 7 days of usage, grouped by day and agent.

```bash
usage week
```

### `stats`

Show all-time statistics — total sessions, total tokens, first/last usage per agent.

```bash
usage stats
```

### `dashboard`

Start a web dashboard with interactive Chart.js charts.

```bash
usage dashboard
usage dashboard --port 3000
```

Open `http://localhost:8080` to view daily charts, top projects, agent breakdowns, and cost estimates.

### `tui`

Start the interactive terminal dashboard (built with Ink/React). Auto-scans on first run if no data exists. Press `s` to manually re-scan.

```bash
usage tui
```

## How it works

1. Each agent keeps local log files (JSONL, JSON) of conversations with token usage metadata.
2. `scan` reads those files via agent-specific adapters and writes structured records into a local SQLite database.
3. `tui` auto-scans on first run, so you can jump straight in with `npx terminal-agents-usage tui`.
4. `today` / `week` / `stats` / `dashboard` / `tui` query the database and present the data.

## Pricing

Cost estimates are calculated from published API pricing (Anthropic, OpenAI, Google). Pricing data is embedded in the tool and sent to the frontend for the web dashboard.

## License

MIT
