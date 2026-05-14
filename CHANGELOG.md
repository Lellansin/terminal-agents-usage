# Changelog

All notable changes to terminal-agents-usage.

## [0.1.0] - 2026-05-14

### Changed

- **Cursor adapter**: removed legacy `ai-code-tracking.db` parsing; now only uses `store.db` from `~/.cursor/chats/`
- **Scanner**: removed internal `@@store@@` path prefix for Cursor adapter, simplifying file discovery

### Removed

- Old Cursor tracking DB support (`ai-code-tracking.db`, `conversation_summaries`, `ai_code_hashes` tables)

## [0.0.8] - 2026-05-14

### Changed

- Moved default database path from `~/.terminal-agents-usage/usage.db` to `~/.config/terminal-agents/usage.db` for better XDG compliance

## [0.0.7] - 2026-05-14

### Changed

- TUI AgentBar: fixed-width padding on detail line values so `|` and `/` separators align across all agents

### Fixed

- TUI Overview tab: added blank line spacing between "Agent Summary" title and agent list for readability

## [0.0.6] - 2026-05-14

### Fixed

- **TUI AgentBar**: now displays both `cache_read` and `cache_write` tokens instead of only `cache_read`. Fixes an issue where Gemini's cache data (stored as `cache_creation_tokens` from thinking tokens) was invisible in the Overview tab.

## [0.0.5] - 2026-05-14

### Fixed

- **OpenClaw adapter**: trajectory format (`.trajectory.jsonl`) now correctly extracts cache read/write tokens from `model.completed` events instead of hardcoding them to 0.

## [0.0.4] - 2026-05-14

### Fixed

- **Codex adapter**: rewrote parser to read rollout JSONL files instead of the SQLite `threads` table. The old adapter treated all tokens as output tokens because the `threads` table only stores `tokens_used` as a single aggregate. The new parser extracts `token_count` events from `~/.codex/sessions/` rollout files, which provide accurate `input_tokens`, `cached_input_tokens`, and `output_tokens` breakdowns. Codex sessions now correctly show input, output, and cache read tokens instead of `in:0 cache:0`.

### Changed

- Codex sessions are now split into per-task turns (via `task_started`/`task_complete` boundaries in rollout files) instead of one turn per session.

## [0.0.3] - 2026-05-14

### Added

- Cursor adapter: parse `store.db` SQLite for token statistics
- TUI auto-scan on first run when database is empty

## [0.0.2] - 2026-05-14

### Added

- Initial release with adapters for Claude Code, Codex CLI, OpenClaw, DeepCode, and Gemini
- Terminal TUI dashboard (`tui` command)
- Web dashboard with Chart.js (`dashboard` command)
- CLI commands: `scan`, `today`, `week`, `stats`
- Anthropic API pricing for cost estimates
