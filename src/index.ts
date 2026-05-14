#!/usr/bin/env node
import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { getDB, closeDB } from './db.js';
import { Scanner } from './scanner/index.js';
import { ClaudeAdapter } from './scanner/claude.adapter.js';
import { CodexAdapter } from './scanner/codex.adapter.js';
import { OpenClawAdapter } from './scanner/openclaw.adapter.js';
import { DeepCodeAdapter } from './scanner/deepcode.adapter.js';
import { CursorAdapter } from './scanner/cursor.adapter.js';
import { GeminiAdapter } from './scanner/gemini.adapter.js';
import { TodayView, WeekView, StatsView } from './ui/index.js';
import { DashboardApp } from './ui/dashboard.js';
import { createWebServer } from './server.js';
import type { DailyStats, WeeklyStats, AllTimeStats } from './ui/index.js';

function createScanner(): Scanner {
  const scanner = new Scanner();
  scanner.register(new ClaudeAdapter());
  scanner.register(new CodexAdapter());
  scanner.register(new OpenClawAdapter());
  scanner.register(new DeepCodeAdapter());
  scanner.register(new CursorAdapter());
  scanner.register(new GeminiAdapter());
  return scanner;
}

const program = new Command();

program
  .name('terminal-agents-usage')
  .description('Unified usage tracker for terminal AI coding agents')
  .version('0.0.7');

// ---- scan command ----
program
  .command('scan')
  .description('Scan for new/updated agent data and update the database')
  .option('--agent <name>', 'Filter to specific agent (claude, codex, openclaw)')
  .option('--rebuild', 'Clear existing data for agent(s) and re-scan from scratch')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });
    const scanner = createScanner();

    const agents = options.agent
      ? [options.agent]
      : scanner.listAgents();

    if (options.rebuild) {
      console.log(`Rebuilding data for: ${agents.join(', ')}`);
    }
    console.log(`Scanning for agent data (${agents.join(', ')})...`);
    const result = await scanner.scan(db, { agent: options.agent, rebuild: options.rebuild });

    console.log(`\nScan complete:`);
    console.log(`  New files:      ${result.newFiles}`);
    console.log(`  Updated files:  ${result.updatedFiles}`);
    console.log(`  Skipped files:  ${result.skippedFiles}`);
    console.log(`  Turns added:    ${result.turnsAdded}`);
    console.log(`  Sessions seen:  ${result.sessionsSeen}`);

    closeDB();
  });

// ---- today command (Ink-rendered) ----
program
  .command('today')
  .description("Show today's usage summary")
  .option('--agent <name>', 'Filter to specific agent')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });
    const today = new Date().toISOString().slice(0, 10);

    let query = `
      SELECT agent, model,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cache_read_tokens) as cache_read,
        SUM(cache_creation_tokens) as cache_write,
        COUNT(DISTINCT session_id) as sessions
      FROM turns
      WHERE date(timestamp) = ?
    `;
    const params: string[] = [today];

    if (options.agent) {
      query += ' AND agent = ?';
      params.push(options.agent);
    }

    query += ' GROUP BY agent, model ORDER BY agent, model';

    const rows = db.prepare(query).all(...params) as DailyStats[];
    closeDB();

    const { unmount } = render(
      React.createElement(TodayView, { stats: rows }),
    );
    // Ink 5 auto-refresh workaround: let it render once then exit
    await new Promise((resolve) => setTimeout(resolve, 50));
    unmount();
  });

// ---- week command (Ink-rendered) ----
program
  .command('week')
  .description('Show last 7 days usage')
  .option('--agent <name>', 'Filter to specific agent')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });

    let query = `
      SELECT date(timestamp) as day, agent,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cache_read_tokens) as cache_read,
        SUM(cache_creation_tokens) as cache_write
      FROM turns
      WHERE timestamp >= date('now', '-7 days')
    `;
    const params: string[] = [];

    if (options.agent) {
      query += ' AND agent = ?';
      params.push(options.agent);
    }

    query += ' GROUP BY day, agent ORDER BY day DESC, agent';

    const rows = db.prepare(query).all(...params) as WeeklyStats[];
    closeDB();

    const { unmount } = render(
      React.createElement(WeekView, { stats: rows }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    unmount();
  });

// ---- stats command (Ink-rendered) ----
program
  .command('stats')
  .description('Show all-time statistics')
  .option('--agent <name>', 'Filter to specific agent')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });

    let query = `
      SELECT agent,
        COUNT(DISTINCT session_id) as total_sessions,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(cache_read_tokens) as total_cache_read,
        SUM(cache_creation_tokens) as total_cache_create,
        MIN(timestamp) as first_usage,
        MAX(timestamp) as last_usage
      FROM turns
    `;
    const params: string[] = [];

    if (options.agent) {
      query += ' WHERE agent = ?';
      params.push(options.agent);
    }

    query += ' GROUP BY agent ORDER BY agent';

    const rows = db.prepare(query).all(...params) as AllTimeStats[];
    closeDB();

    const { unmount } = render(
      React.createElement(StatsView, { stats: rows }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    unmount();
  });

// ---- dashboard command (web server) ----
program
  .command('dashboard')
  .description('Start the web dashboard (Chart.js SPA)')
  .option('--port <number>', 'Port to listen on', '8080')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });
    const port = parseInt(options.port, 10) || 8080;
    createWebServer(db, port);
  });

// ---- tui command (Ink interactive terminal UI) ----
program
  .command('tui')
  .description('Start the interactive terminal dashboard (auto-scans on first run)')
  .option('--db-path <path>', 'Override database path')
  .action(async (options) => {
    const db = getDB({ dbPath: options.dbPath });
    const scanner = createScanner();

    // Auto-scan on first run if database is empty
    const { count } = db.prepare('SELECT COUNT(*) as count FROM turns').get() as { count: number };
    if (count === 0) {
      await scanner.scan(db);
    }

    const doScan = async () => {
      await scanner.scan(db);
    };

    render(
      React.createElement(DashboardApp, { db, onScan: doScan }),
      { exitOnCtrlC: true },
    );
  });

// Default: show help
program.action(() => {
  program.outputHelp();
});

program.parse();
