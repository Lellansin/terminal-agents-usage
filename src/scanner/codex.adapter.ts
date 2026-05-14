import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import Database from 'better-sqlite3';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOutput, SessionRecord, TurnRecord } from './types.js';

interface CodexThread {
  id: string;
  title: string | null;
  cwd: string | null;
  model: string | null;
  model_provider: string | null;
  tokens_used: number;
  git_branch: string | null;
  created_at: number; // unix timestamp
  updated_at: number;
  source: string | null;
}

export class CodexAdapter extends BaseAdapter {
  readonly agent = 'codex';
  readonly displayName = 'Codex CLI';

  async discoverFiles(): Promise<string[]> {
    // Codex uses a single SQLite database, not multiple files
    const dbPath = this.getDbPath();
    if (fs.existsSync(dbPath)) {
      return [dbPath];
    }
    return [];
  }

  async parseFile(filepath: string): Promise<ParseOutput> {
    const db = new Database(filepath, { readonly: true });

    let threads: CodexThread[];
    try {
      threads = db
        .prepare(
          `SELECT id, title, cwd, model, model_provider, tokens_used, 
                  git_branch, created_at, updated_at, source 
           FROM threads 
           WHERE tokens_used > 0 
           ORDER BY created_at`,
        )
        .all() as CodexThread[];
    } catch {
      db.close();
      return { sessions: [], turns: [], lineCount: 0 };
    }

    const sessions: SessionRecord[] = [];
    const turns: TurnRecord[] = [];

    for (const thread of threads) {
      const sessionId = thread.id;
      const timestamp = new Date(thread.created_at * 1000).toISOString();
      const projectName = this.projectNameFromCwd(thread.cwd);

      // Since Codex SQLite only has thread-level aggregates,
      // we create one turn per session representing the whole usage
      const turn: TurnRecord = {
        agent: this.agent,
        session_id: sessionId,
        timestamp,
        model: thread.model,
        input_tokens: 0, // aggregate doesn't split input/output
        output_tokens: thread.tokens_used,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        tool_name: null,
        cwd: thread.cwd,
        source_id: `codex-thread-${sessionId}`,
      };

      const session: SessionRecord = {
        session_id: sessionId,
        agent: this.agent,
        project_name: projectName,
        title: thread.title,
        first_timestamp: timestamp,
        last_timestamp: new Date(thread.updated_at * 1000).toISOString(),
        git_branch: thread.git_branch,
        total_input_tokens: 0,
        total_output_tokens: thread.tokens_used,
        total_cache_read: 0,
        total_cache_creation: 0,
        model: thread.model,
        model_provider: thread.model_provider ?? 'openai',
        turn_count: 1,
      };

      turns.push(turn);
      sessions.push(session);
    }

    db.close();

    return {
      sessions,
      turns,
      lineCount: threads.length,
    };
  }

  // ---- private ----

  private getDbPath(): string {
    return path.join(os.homedir(), '.codex', 'state_5.sqlite');
  }
}
