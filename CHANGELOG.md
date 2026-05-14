# Changelog

All notable changes to terminal-agents-usage.

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
