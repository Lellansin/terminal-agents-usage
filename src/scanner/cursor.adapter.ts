import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import Database from 'better-sqlite3';
import { BaseAdapter } from './base-adapter.js';
import {
  parseContextStats,
  getField,
  parseMessage,
} from './proto-parser.js';
import type { ParseOutput, SessionRecord, TurnRecord } from './types.js';
import type { ContextStats } from './proto-parser.js';

interface StoreDbMeta {
  agentId: string;
  latestRootBlobId: string;
  name: string;
  mode: string;
  createdAt: number;
  lastUsedModel: string;
}

export class CursorAdapter extends BaseAdapter {
  readonly agent = 'cursor';
  readonly displayName = 'Cursor';

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];

    // store.db files from ~/.cursor/chats/
    const chatsBase = path.join(os.homedir(), '.cursor', 'chats');
    if (fs.existsSync(chatsBase)) {
      for (const hashDir of fs.readdirSync(chatsBase)) {
        const hashPath = path.join(chatsBase, hashDir);
        if (!fs.statSync(hashPath).isDirectory()) continue;

        for (const sessionDir of fs.readdirSync(hashPath)) {
          const sessionPath = path.join(hashPath, sessionDir);
          if (!fs.statSync(sessionPath).isDirectory()) continue;

          const storeDb = path.join(sessionPath, 'store.db');
          if (fs.existsSync(storeDb)) {
            files.push(storeDb);
          }
        }
      }
    }

    return files;
  }

  async parseFile(filepath: string): Promise<ParseOutput> {
    return this.parseStoreDb(filepath);
  }

  /** Parse a store.db file and extract session + token stats */
  private parseStoreDb(filepath: string): ParseOutput {
    const db = new Database(filepath, { readonly: true });

    let meta: StoreDbMeta | null = null;
    let contextStats: ContextStats | null = null;
    let workspacePath: string | null = null;

    try {
      // Read meta
      const metaRow = db
        .prepare("SELECT value FROM meta WHERE key = '0'")
        .get() as { value: string } | undefined;

      if (metaRow) {
        const jsonStr = Buffer.from(metaRow.value, 'hex').toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        meta = {
          agentId: parsed.agentId ?? '',
          latestRootBlobId: parsed.latestRootBlobId ?? '',
          name: parsed.name ?? '',
          mode: parsed.mode ?? '',
          createdAt: parsed.createdAt ?? 0,
          lastUsedModel: parsed.lastUsedModel ?? '',
        };

        // Read root blob and parse context stats
        if (meta.latestRootBlobId) {
          const rootRow = db
            .prepare('SELECT data FROM blobs WHERE id = ?')
            .get(meta.latestRootBlobId) as { data: Buffer } | undefined;

          if (rootRow) {
            const rootMsg = parseMessage(rootRow.data);

            // Extract field 5 (context stats)
            const contextField = getField(rootMsg, 5);
            if (contextField?.bytes) {
              contextStats = parseContextStats(contextField.bytes);
            }

            // Extract field 9 (workspace folder URI)
            const workspaceField = getField(rootMsg, 9);
            if (workspaceField?.bytes) {
              const uri = workspaceField.bytes.toString('utf-8');
              // URI format: "file:///path/to/workspace"
              workspacePath = uri.replace(/^file:\/\/\//, '/');
              try {
                workspacePath = decodeURIComponent(workspacePath);
              } catch {
                /* leave as-is */
              }
            }
          }
        }
      }
    } catch {
      /* gracefully handle parse errors */
    } finally {
      db.close();
    }

    if (!meta) {
      return { sessions: [], turns: [], lineCount: 0 };
    }

    const sessionId = meta.agentId;
    const model = meta.lastUsedModel || 'unknown';
    const timestamp = meta.createdAt
      ? new Date(meta.createdAt).toISOString()
      : new Date().toISOString();

    // Store context stats as per-category turns (one turn per category)
    const turns: TurnRecord[] = [];

    if (contextStats) {
      for (const cat of contextStats.categories) {
        turns.push({
          agent: this.agent,
          session_id: sessionId,
          timestamp,
          model,
          input_tokens: cat.tokens,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_creation_tokens: 0,
          tool_name: cat.key, // Store category key as tool_name for filtering
          cwd: workspacePath,
          source_id: `cursor-store-${sessionId}-${cat.key}`,
        });
      }
    }

    // Fallback: no token data — still create a session entry
    if (turns.length === 0) {
      turns.push({
        agent: this.agent,
        session_id: sessionId,
        timestamp,
        model,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        tool_name: null,
        cwd: workspacePath,
        source_id: `cursor-store-${sessionId}`,
      });
    }

    const session: SessionRecord = {
      session_id: sessionId,
      agent: this.agent,
      project_name: this.projectNameFromCwd(workspacePath),
      title: meta.name || null,
      first_timestamp: timestamp,
      last_timestamp: timestamp,
      git_branch: null,
      total_input_tokens: contextStats?.contextTotalTokens ?? 0,
      total_output_tokens: 0,
      total_cache_read: 0,
      total_cache_creation: 0,
      model,
      model_provider: this.inferProvider(model),
      turn_count: turns.length,
    };

    // Use file size as lineCount for change detection
    let fileSize = 0;
    try {
      fileSize = fs.statSync(filepath).size;
    } catch {
      /* ignore */
    }

    return { sessions: [session], turns, lineCount: fileSize };
  }

  private inferProvider(model: string): string {
    const lower = model.toLowerCase();
    if (
      lower.includes('claude') ||
      lower.includes('opus') ||
      lower.includes('sonnet') ||
      lower.includes('haiku')
    )
      return 'anthropic';
    if (lower.includes('gpt') || lower.includes('composer')) return 'openai';
    if (lower.includes('gemini')) return 'google';
    return 'unknown';
  }
}
