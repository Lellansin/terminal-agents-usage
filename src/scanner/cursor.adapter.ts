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

interface CursorHash {
  hash: string;
  requestId: string | null;
  conversationId: string | null;
  timestamp: number;
  model: string | null;
  source: string;
  fileExtension: string | null;
  fileName: string | null;
  createdAt: number;
}

interface CursorConversation {
  conversationId: string;
  title: string | null;
  model: string | null;
  mode: string | null;
  updatedAt: number;
}

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

    // Old tracking DB
    const trackingDb = this.getTrackingDbPath();
    if (fs.existsSync(trackingDb)) files.push(trackingDb);

    // New store.db files from ~/.cursor/chats/
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
            // Prefix with @@store@@ to distinguish from old tracking db
            files.push(`@@store@@${storeDb}`);
          }
        }
      }
    }

    return files;
  }

  async parseFile(filepath: string): Promise<ParseOutput> {
    // Detect store.db vs old tracking db
    if (filepath.startsWith('@@store@@')) {
      return this.parseStoreDb(filepath.slice('@@store@@'.length));
    }
    return this.parseTrackingDb(filepath);
  }

  /** Parse the old ai-code-tracking.db (code generation hashes) */
  private async parseTrackingDb(filepath: string): Promise<ParseOutput> {
    const db = new Database(filepath, { readonly: true });

    // Get conversation summaries
    let conversations: CursorConversation[] = [];
    try {
      conversations = db
        .prepare(
          'SELECT conversationId, title, model, mode, updatedAt FROM conversation_summaries ORDER BY updatedAt',
        )
        .all() as CursorConversation[];
    } catch {
      /* table might not exist */
    }

    // Get code generation hashes aggregated by conversation
    let hashes: CursorHash[] = [];
    try {
      hashes = db
        .prepare(
          'SELECT hash, requestId, conversationId, timestamp, model, source, fileExtension, fileName, createdAt FROM ai_code_hashes ORDER BY createdAt',
        )
        .all() as CursorHash[];
    } catch {
      /* table might not exist */
    }

    db.close();

    // Build session map from conversations
    const sessionMap = new Map<
      string,
      { title: string | null; model: string | null; turns: number }
    >();
    for (const c of conversations) {
      sessionMap.set(c.conversationId, {
        title: c.title,
        model: c.model,
        turns: 0,
      });
    }

    // Count turns (code hashes) per conversation
    const convTurnCount = new Map<string, number>();
    const convModel = new Map<string, string>();
    const convFirstTs = new Map<string, number>();
    const convLastTs = new Map<string, number>();

    for (const h of hashes) {
      const cid = h.conversationId ?? 'unknown';
      convTurnCount.set(cid, (convTurnCount.get(cid) ?? 0) + 1);
      if (h.model && !convModel.has(cid)) convModel.set(cid, h.model);
      if (!convFirstTs.has(cid) || h.timestamp < convFirstTs.get(cid)!)
        convFirstTs.set(cid, h.timestamp);
      if (!convLastTs.has(cid) || h.timestamp > convLastTs.get(cid)!)
        convLastTs.set(cid, h.timestamp);
    }

    // Also add any conversations from summaries not in hashes
    for (const [cid, conv] of sessionMap) {
      if (!convTurnCount.has(cid)) {
        convTurnCount.set(cid, 0);
        convModel.set(cid, conv.model ?? 'unknown');
      }
    }

    const sessions: SessionRecord[] = [];
    const turns: TurnRecord[] = [];

    for (const [cid, count] of convTurnCount) {
      const sessionId = cid.slice(0, 36) || cid;
      const model = convModel.get(cid) ?? 'unknown';
      const firstTs = convFirstTs.get(cid);
      const lastTs = convLastTs.get(cid);
      const title = sessionMap.get(cid)?.title ?? null;

      const timestamp = firstTs
        ? new Date(firstTs).toISOString()
        : new Date().toISOString();

      // Create one turn representing the whole conversation
      const turn: TurnRecord = {
        agent: this.agent,
        session_id: sessionId,
        timestamp,
        model,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        tool_name: null,
        cwd: null,
        source_id: `cursor-${sessionId}`,
      };

      turns.push(turn);

      sessions.push({
        session_id: sessionId,
        agent: this.agent,
        project_name: null,
        title,
        first_timestamp: timestamp,
        last_timestamp: lastTs ? new Date(lastTs).toISOString() : timestamp,
        git_branch: null,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_read: 0,
        total_cache_creation: 0,
        model,
        model_provider: this.inferProvider(model),
        turn_count: count,
      });
    }

    return { sessions, turns, lineCount: hashes.length };
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

  private getTrackingDbPath(): string {
    return path.join(
      os.homedir(),
      '.cursor',
      'ai-tracking',
      'ai-code-tracking.db',
    );
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
