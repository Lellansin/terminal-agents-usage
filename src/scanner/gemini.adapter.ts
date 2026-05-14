import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOptions, ParseOutput, SessionRecord, TurnRecord } from './types.js';

interface GeminiSessionMeta {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  kind: string;
}

interface GeminiTokens {
  input: number;
  output: number;
  cached: number;
  thoughts: number;
  tool: number;
  total: number;
}

interface GeminiMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini' | 'info';
  content: string;
  tokens?: GeminiTokens;
  model?: string;
  sessionId?: string;
  projectHash?: string;
  startTime?: string;
  lastUpdated?: string;
  kind?: string;
}

export class GeminiAdapter extends BaseAdapter {
  readonly agent = 'gemini';
  readonly displayName = 'Gemini CLI';

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    const tmpDir = path.join(os.homedir(), '.gemini', 'tmp');

    if (!fs.existsSync(tmpDir)) return files;

    try {
      const projects = fs.readdirSync(tmpDir, { withFileTypes: true });
      for (const proj of projects) {
        if (!proj.isDirectory()) continue;
        const chatsDir = path.join(tmpDir, proj.name, 'chats');
        if (!fs.existsSync(chatsDir)) continue;

        try {
          const chatFiles = fs.readdirSync(chatsDir, { withFileTypes: true });
          for (const f of chatFiles) {
            if (f.isFile() && f.name.endsWith('.jsonl')) {
              files.push(path.join(chatsDir, f.name));
            }
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip */
    }

    return files;
  }

  async parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput> {
    const turns: TurnRecord[] = [];
    let sessionMeta: GeminiSessionMeta | null = null;
    let lineCount = 0;
    const startLine = options?.sinceLine ?? 0;

    // Infer project name from filepath: ~/.gemini/tmp/<project>/chats/session-xxx.jsonl
    const parts = filepath.split(path.sep);
    const chatsIdx = parts.lastIndexOf('chats');
    const projectName = chatsIdx > 0 ? parts[chatsIdx - 1] : 'unknown';

    const fileStream = fs.createReadStream(filepath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      lineCount++;
      if (lineCount <= startLine) continue;

      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const record: GeminiMessage = JSON.parse(trimmed);

        // First line (session metadata) — has sessionId but no type/id
        if (!record.type && record.sessionId && !record.id) {
          sessionMeta = {
            sessionId: record.sessionId,
            projectHash: record.projectHash ?? '',
            startTime: record.startTime ?? record.timestamp ?? '',
            lastUpdated: record.lastUpdated ?? record.startTime ?? '',
            kind: record.kind ?? 'main',
          };
          continue;
        }

        // Gemini assistant messages with tokens
        if (record.type === 'gemini' && record.tokens) {
          const sid = sessionMeta?.sessionId ?? record.sessionId ?? 'unknown';
          const turn: TurnRecord = {
            agent: this.agent,
            session_id: sid,
            timestamp: record.timestamp,
            model: record.model ?? null,
            input_tokens: record.tokens.input,
            output_tokens: record.tokens.output,
            cache_read_tokens: record.tokens.cached, // Gemini context caching
            cache_creation_tokens: record.tokens.thoughts, // thinking tokens count as cache creation
            tool_name: null,
            cwd: null,
            source_id: record.id,
          };
          turns.push(turn);
        }
      } catch {
        /* skip malformed lines */
      }
    }

    rl.close();

    // Build sessions from turns
    const sessionMap = new Map<string, TurnRecord[]>();
    for (const turn of turns) {
      const list = sessionMap.get(turn.session_id) ?? [];
      list.push(turn);
      sessionMap.set(turn.session_id, list);
    }

    const sessions: SessionRecord[] = [];
    for (const [sid, sturns] of sessionMap) {
      sessions.push(
        this.buildSessionRecord(sid, sturns, {
          project_name: projectName,
          model_provider: 'google',
        }),
      );
    }

    return { sessions, turns, lineCount };
  }

  async parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput> {
    return this.parseFile(filepath, { sinceLine });
  }
}
