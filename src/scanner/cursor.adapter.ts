import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import Database from 'better-sqlite3';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOutput, SessionRecord, TurnRecord } from './types.js';

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

export class CursorAdapter extends BaseAdapter {
  readonly agent = 'cursor';
  readonly displayName = 'Cursor';

  async discoverFiles(): Promise<string[]> {
    const dbPath = this.getDbPath();
    if (fs.existsSync(dbPath)) return [dbPath];
    return [];
  }

  async parseFile(filepath: string): Promise<ParseOutput> {
    const db = new Database(filepath, { readonly: true });

    // Get conversation summaries
    let conversations: CursorConversation[] = [];
    try {
      conversations = db.prepare(
        'SELECT conversationId, title, model, mode, updatedAt FROM conversation_summaries ORDER BY updatedAt',
      ).all() as CursorConversation[];
    } catch { /* table might not exist */ }

    // Get code generation hashes aggregated by conversation
    let hashes: CursorHash[] = [];
    try {
      hashes = db.prepare(
        'SELECT hash, requestId, conversationId, timestamp, model, source, fileExtension, fileName, createdAt FROM ai_code_hashes ORDER BY createdAt',
      ).all() as CursorHash[];
    } catch { /* table might not exist */ }

    db.close();

    // Build session map from conversations
    const sessionMap = new Map<string, { title: string | null; model: string | null; turns: number }>();
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
      if (!convFirstTs.has(cid) || h.timestamp < convFirstTs.get(cid)!) convFirstTs.set(cid, h.timestamp);
      if (!convLastTs.has(cid) || h.timestamp > convLastTs.get(cid)!) convLastTs.set(cid, h.timestamp);
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

  private getDbPath(): string {
    return path.join(os.homedir(), '.cursor', 'ai-tracking', 'ai-code-tracking.db');
  }

  private inferProvider(model: string): string {
    const lower = model.toLowerCase();
    if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet') || lower.includes('haiku')) return 'anthropic';
    if (lower.includes('gpt') || lower.includes('composer')) return 'openai';
    if (lower.includes('gemini')) return 'google';
    return 'unknown';
  }
}
