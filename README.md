# terminal-agents-usage

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

## Commands

### `scan`

Scan local agent log files and populate the database.

```bash
terminal-agents-usage scan              # scan all agents
terminal-agents-usage scan --agent claude  # scan a specific agent
terminal-agents-usage scan --rebuild     # clear and re-scan from scratch
```

Data is stored in `~/.terminal-agents-usage/usage.db` by default. Override with `--db-path`.

### `today`

Show today's token usage summary (terminal UI).

```bash
terminal-agents-usage today
terminal-agents-usage today --agent claude
```

### `week`

Show the last 7 days of usage, grouped by day and agent.

```bash
terminal-agents-usage week
```

### `stats`

Show all-time statistics — total sessions, total tokens, first/last usage per agent.

```bash
terminal-agents-usage stats
```

### `dashboard`

Start a web dashboard with interactive Chart.js charts.

```bash
terminal-agents-usage dashboard
terminal-agents-usage dashboard --port 3000
```

Open `http://localhost:8080` to view daily charts, top projects, agent breakdowns, and cost estimates.

### `tui`

Start the interactive terminal dashboard (built with Ink/React).

```bash
terminal-agents-usage tui
```

## How it works

1. Each agent keeps local log files (JSONL, JSON) of conversations with token usage metadata.
2. `scan` reads those files via agent-specific adapters and writes structured records into a local SQLite database.
3. `today` / `week` / `stats` / `dashboard` / `tui` query the database and present the data.

## Pricing

Cost estimates are calculated from published API pricing (Anthropic, OpenAI, Google). Pricing data is embedded in the tool and sent to the frontend for the web dashboard.

## License

MIT
