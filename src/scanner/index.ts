import * as fs from 'node:fs';
import type Database from 'better-sqlite3';
import type { AgentAdapter } from './base-adapter.js';
import type { ScanResult, ProcessedFileRecord } from './types.js';

export interface ScannerOptions {
  /** Specific agent to scan (omit for all) */
  agent?: string;
  /** Clear existing data for the agent(s) and re-scan from scratch */
  rebuild?: boolean;
}

/**
 * Scanner orchestrator — runs all registered adapters and writes to DB.
 */
export class Scanner {
  private adapters: Map<string, AgentAdapter> = new Map();

  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.agent, adapter);
  }

  getAdapter(agent: string): AgentAdapter | undefined {
    return this.adapters.get(agent);
  }

  listAgents(): string[] {
    return [...this.adapters.keys()];
  }

  async scan(db: Database.Database, opts: ScannerOptions = {}): Promise<ScanResult> {
    const result: ScanResult = {
      newFiles: 0,
      updatedFiles: 0,
      skippedFiles: 0,
      turnsAdded: 0,
      sessionsSeen: 0,
    };

    const agentsToScan = opts.agent
      ? [opts.agent]
      : [...this.adapters.keys()];

    if (opts.rebuild) {
      for (const agentName of agentsToScan) {
        db.prepare('DELETE FROM processed_files WHERE agent = ?').run(agentName);
        db.prepare('DELETE FROM turns WHERE agent = ?').run(agentName);
        db.prepare('DELETE FROM sessions WHERE agent = ?').run(agentName);
      }
    }

    for (const agentName of agentsToScan) {
      const adapter = this.adapters.get(agentName);
      if (!adapter) {
        console.warn(`Unknown agent: ${agentName}, skipping`);
        continue;
      }

      const agentResult = await this.scanAgent(db, adapter);
      result.newFiles += agentResult.newFiles;
      result.updatedFiles += agentResult.updatedFiles;
      result.skippedFiles += agentResult.skippedFiles;
      result.turnsAdded += agentResult.turnsAdded;
      result.sessionsSeen += agentResult.sessionsSeen;
    }

    return result;
  }

  private async scanAgent(
    db: Database.Database,
    adapter: AgentAdapter,
  ): Promise<ScanResult> {
    const result: ScanResult = {
      newFiles: 0,
      updatedFiles: 0,
      skippedFiles: 0,
      turnsAdded: 0,
      sessionsSeen: 0,
    };

    const files = await adapter.discoverFiles();

    // Get processed files state
    const processedMap = this.getProcessedFiles(db, adapter.agent);

    const insertProcessed = db.prepare(
      `INSERT OR REPLACE INTO processed_files (path, agent, mtime, lines) VALUES (?, ?, ?, ?)`,
    );

    const upsertSession = db.prepare(`
      INSERT OR REPLACE INTO sessions (
        session_id, agent, project_name, title, first_timestamp, last_timestamp,
        git_branch, total_input_tokens, total_output_tokens,
        total_cache_read, total_cache_creation, model, model_provider, turn_count
      ) VALUES (
        @session_id, @agent, @project_name, @title, @first_timestamp, @last_timestamp,
        @git_branch, @total_input_tokens, @total_output_tokens,
        @total_cache_read, @total_cache_creation, @model, @model_provider, @turn_count
      )
    `);

    const insertTurn = db.prepare(`
      INSERT OR IGNORE INTO turns (
        agent, session_id, timestamp, model, input_tokens, output_tokens,
        cache_read_tokens, cache_creation_tokens, tool_name, cwd, source_id
      ) VALUES (
        @agent, @session_id, @timestamp, @model, @input_tokens, @output_tokens,
        @cache_read_tokens, @cache_creation_tokens, @tool_name, @cwd, @source_id
      )
    `);

    // Perform the scan (non-transactional for simplicity with async parsing)
    for (const filepath of files) {
      // Strip adapter-specific prefixes for filesystem ops; keep for adapter dispatch
      let realPath = filepath;
      for (const prefix of ['@@index@@', '@@store@@']) {
        if (realPath.startsWith(prefix)) {
          realPath = realPath.slice(prefix.length);
          break;
        }
      }
      let stat: fs.Stats;
      try {
        stat = fs.statSync(realPath);
      } catch {
        continue;
      }

      const prev = processedMap.get(filepath);

      if (prev && prev.mtime === stat.mtimeMs && prev.lines === stat.size) {
        result.skippedFiles++;
        continue;
      }

      if (!prev) {
        result.newFiles++;
      } else {
        result.updatedFiles++;
      }

      const parseResult = prev
        ? await adapter.parseNewLines(filepath, prev.lines)
        : await adapter.parseFile(filepath);

      // Upsert sessions
      for (const session of parseResult.sessions) {
        upsertSession.run(session);
        result.sessionsSeen++;
      }

      // Insert turns
      for (const turn of parseResult.turns) {
        const info = insertTurn.run(turn);
        if (info.changes > 0) {
          result.turnsAdded++;
        }
      }

      // Update processed_files
      insertProcessed.run(filepath, adapter.agent, stat.mtimeMs, parseResult.lineCount);
    }

    // Recompute session totals from turns (corectness after INSERT OR IGNORE)
    this.recomputeSessionTotals(db, adapter.agent);

    return result;
  }

  private getProcessedFiles(
    db: Database.Database,
    agent: string,
  ): Map<string, ProcessedFileRecord> {
    const map = new Map<string, ProcessedFileRecord>();
    const rows = db
      .prepare('SELECT path, agent, mtime, lines FROM processed_files WHERE agent = ?')
      .all(agent) as ProcessedFileRecord[];

    for (const row of rows) {
      map.set(row.path, row);
    }
    return map;
  }

  private recomputeSessionTotals(db: Database.Database, agent: string): void {
    db.exec(`
      UPDATE sessions SET
        total_input_tokens = COALESCE((
          SELECT SUM(input_tokens) FROM turns
          WHERE turns.session_id = sessions.session_id
            AND turns.agent = '${agent}'
        ), 0),
        total_output_tokens = COALESCE((
          SELECT SUM(output_tokens) FROM turns
          WHERE turns.session_id = sessions.session_id
            AND turns.agent = '${agent}'
        ), 0),
        total_cache_read = COALESCE((
          SELECT SUM(cache_read_tokens) FROM turns
          WHERE turns.session_id = sessions.session_id
            AND turns.agent = '${agent}'
        ), 0),
        total_cache_creation = COALESCE((
          SELECT SUM(cache_creation_tokens) FROM turns
          WHERE turns.session_id = sessions.session_id
            AND turns.agent = '${agent}'
        ), 0),
        turn_count = COALESCE((
          SELECT COUNT(*) FROM turns
          WHERE turns.session_id = sessions.session_id
            AND turns.agent = '${agent}'
        ), 0)
      WHERE agent = '${agent}'
    `);
  }
}


