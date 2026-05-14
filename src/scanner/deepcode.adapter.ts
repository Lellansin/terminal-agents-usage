import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOptions, ParseOutput, SessionRecord, TurnRecord } from './types.js';

interface DeepCodeUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

interface DeepCodeIndexEntry {
  id: string;
  summary?: string;
  status: string;
  usage: DeepCodeUsage | null;
  createTime: string;
  updateTime: string;
}

interface DeepCodeSessionsIndex {
  version: number;
  entries: DeepCodeIndexEntry[];
}

interface DeepCodeJsonlMessage {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  createTime: number;
  updateTime: number;
}

export class DeepCodeAdapter extends BaseAdapter {
  readonly agent = 'deepcode';
  readonly displayName = 'DeepCode';

  private _modelLoaded = false;
  private _model: string | null = null;

  private getDefaultModel(): string | null {
    if (this._modelLoaded) return this._model;
    this._modelLoaded = true;
    try {
      const settingsPath = path.join(os.homedir(), '.deepcode', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(raw);
        this._model = settings?.env?.MODEL ?? null;
      }
    } catch {
      /* keep null */
    }
    return this._model;
  }

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    const projectsDir = path.join(os.homedir(), '.deepcode', 'projects');

    if (!fs.existsSync(projectsDir)) return files;

    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subDir = path.join(projectsDir, entry.name);

        // Primary: sessions-index.json (has token usage)
        const indexFile = path.join(subDir, 'sessions-index.json');
        if (fs.existsSync(indexFile)) {
          files.push(`@@index@@${indexFile}`);
        }

        // Secondary: JSONL files (for turn counts)
        try {
          const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
          for (const sub of subEntries) {
            if (sub.isFile() && sub.name.endsWith('.jsonl') && sub.name !== 'sessions-index.json') {
              files.push(path.join(subDir, sub.name));
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
    if (filepath.startsWith('@@index@@')) {
      return this.parseIndexFile(filepath.slice('@@index@@'.length));
    }
    return this.parseJsonlFile(filepath, options);
  }

  async parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput> {
    if (filepath.startsWith('@@index@@')) {
      return this.parseIndexFile(filepath.slice('@@index@@'.length));
    }
    return this.parseJsonlFile(filepath, { sinceLine });
  }

  // ---- Index parser (sessions-index.json with token usage) ----

  private async parseIndexFile(filepath: string): Promise<ParseOutput> {
    let index: DeepCodeSessionsIndex;
    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      index = JSON.parse(raw);
    } catch {
      return { sessions: [], turns: [], lineCount: 0 };
    }

    const projectsDir = path.join(os.homedir(), '.deepcode', 'projects');
    const relative = path.relative(projectsDir, path.dirname(filepath));
    const projectName = relative || 'unknown';

    const sessions: SessionRecord[] = [];
    const turns: TurnRecord[] = [];

    for (const entry of index.entries) {
      if (!entry.usage) continue;

      const sessionId = entry.id;

      const turn: TurnRecord = {
        agent: this.agent,
        session_id: sessionId,
        timestamp: entry.createTime,
        model: this.getDefaultModel(),
        input_tokens: entry.usage.prompt_tokens,
        output_tokens: entry.usage.completion_tokens,
        cache_read_tokens:
          entry.usage.prompt_tokens_details?.cached_tokens ??
          entry.usage.prompt_cache_hit_tokens ??
          0,
        cache_creation_tokens: entry.usage.completion_tokens_details?.reasoning_tokens ?? 0,
        tool_name: null,
        cwd: null,
        source_id: `deepcode-index-${sessionId}`,
      };

      turns.push(turn);

      sessions.push(
        this.buildSessionRecord(sessionId, [turn], {
          project_name: projectName,
          title: entry.summary ?? null,
          model_provider: 'deepcode',
        }),
      );
    }

    return { sessions, turns, lineCount: index.entries.length };
  }

  // ---- JSONL parser (supplemental turn counts) ----

  private async parseJsonlFile(filepath: string, options?: ParseOptions): Promise<ParseOutput> {
    const turnsPerSession = new Map<string, number>();
    let lineCount = 0;
    const startLine = options?.sinceLine ?? 0;

    const fileStream = fs.createReadStream(filepath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      lineCount++;
      if (lineCount <= startLine) continue;

      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const record: DeepCodeJsonlMessage = JSON.parse(trimmed);
        if (record.role === 'assistant' && record.sessionId) {
          turnsPerSession.set(record.sessionId, (turnsPerSession.get(record.sessionId) ?? 0) + 1);
        }
      } catch {
        /* skip */
      }
    }

    rl.close();

    const sessions: SessionRecord[] = [];
    const turns: TurnRecord[] = [];

    for (const [sid, count] of turnsPerSession) {
      const turn: TurnRecord = {
        agent: this.agent,
        session_id: sid,
        timestamp: new Date().toISOString(),
        model: this.getDefaultModel(),
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        tool_name: null,
        cwd: null,
        source_id: `deepcode-jsonl-${sid}`,
      };

      turns.push(turn);
      sessions.push(
        this.buildSessionRecord(sid, [turn], {
          project_name: null,
          model_provider: 'deepcode',
          turn_count: count,
        }),
      );
    }

    return { sessions, turns, lineCount };
  }
}
