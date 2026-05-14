import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOptions, ParseOutput, SessionRecord, TurnRecord } from './types.js';

interface OpenClawMessage {
  type: 'session' | 'model_change' | 'message';
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  message?: {
    role?: 'user' | 'assistant';
    model?: string;
    usage?: {
      input?: number;
      output?: number;
      cacheRead?: number;
      cacheWrite?: number;
      totalTokens?: number;
      cost?: number;
    };
  };
  model?: string;
}

interface OpenClawTrajectoryEvent {
  type: 'session.started' | 'model.completed' | 'prompt.submitted' | 'context.compiled';
  timestamp?: string;
  sessionId?: string;
  modelId?: string;
  workspaceDir?: string;
  data?: {
    usage?: {
      input?: number;
      output?: number;
      total?: number;
    };
  };
}

interface ParsedSession {
  sessionId: string;
  cwd: string | undefined;
  turns: TurnRecord[];
}

export class OpenClawAdapter extends BaseAdapter {
  readonly agent = 'openclaw';
  readonly displayName = 'OpenClaw';

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    const sessionsDir = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');

    if (!fs.existsSync(sessionsDir)) return files;

    try {
      const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.jsonl') || entry.name.endsWith('.trajectory.jsonl'))) {
          files.push(path.join(sessionsDir, entry.name));
        }
      }
    } catch {
      // skip inaccessible dirs
    }

    return files;
  }

  async parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput> {
    const isTrajectory = filepath.endsWith('.trajectory.jsonl');
    return isTrajectory
      ? this.parseTrajectoryFile(filepath, options)
      : this.parseStandardFile(filepath, options);
  }

  async parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput> {
    return this.parseFile(filepath, { sinceLine });
  }

  // ---- Standard format ----

  private async parseStandardFile(
    filepath: string,
    options?: ParseOptions,
  ): Promise<ParseOutput> {
    const sessions = new Map<string, ParsedSession>();
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
        const record: OpenClawMessage = JSON.parse(trimmed);
        if (record.type === 'message' && record.message?.role === 'assistant') {
          this.processStandardMessage(record, sessions);
        }
      } catch {
        // skip malformed lines
      }
    }

    rl.close();

    return this.buildOutput(sessions);
  }

  private processStandardMessage(
    record: OpenClawMessage,
    sessions: Map<string, ParsedSession>,
  ): void {
    const usage = record.message?.usage;
    if (!usage || (usage.input === 0 && usage.output === 0)) return;

    // Session ID from file path context; fallback to record-level
    const sessionId = record.sessionId ?? this.sessionIdFromPath(record.cwd ?? '');
    if (!sessionId) return;

    let s = sessions.get(sessionId);
    if (!s) {
      s = { sessionId, cwd: record.cwd, turns: [] };
      sessions.set(sessionId, s);
    }

    if (!s.cwd && record.cwd) s.cwd = record.cwd;

    const turn: TurnRecord = {
      agent: this.agent,
      session_id: sessionId,
      timestamp: record.timestamp ?? new Date().toISOString(),
      model: record.message?.model ?? record.model ?? null,
      input_tokens: usage.input ?? 0,
      output_tokens: usage.output ?? 0,
      cache_read_tokens: usage.cacheRead ?? 0,
      cache_creation_tokens: usage.cacheWrite ?? 0,
      tool_name: null,
      cwd: record.cwd ?? null,
      source_id: null,
    };

    s.turns.push(turn);
  }

  // ---- Trajectory format ----

  private async parseTrajectoryFile(
    filepath: string,
    options?: ParseOptions,
  ): Promise<ParseOutput> {
    const sessions = new Map<string, ParsedSession>();
    let lineCount = 0;
    const startLine = options?.sinceLine ?? 0;
    let currentSessionId: string | undefined;
    let currentCwd: string | undefined;
    let currentModel: string | undefined;

    const fileStream = fs.createReadStream(filepath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      lineCount++;
      if (lineCount <= startLine) continue;

      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const event: OpenClawTrajectoryEvent = JSON.parse(trimmed);

        if (event.type === 'session.started') {
          currentSessionId = event.sessionId;
          currentCwd = event.workspaceDir;
        }

        if (event.type === 'model.completed') {
          currentModel = event.modelId;
          const usage = event.data?.usage;
          if (!usage || !currentSessionId) continue;

          let s = sessions.get(currentSessionId);
          if (!s) {
            s = { sessionId: currentSessionId, cwd: currentCwd, turns: [] };
            sessions.set(currentSessionId, s);
          }

          const turn: TurnRecord = {
            agent: this.agent,
            session_id: currentSessionId,
            timestamp: event.timestamp ?? new Date().toISOString(),
            model: currentModel ?? null,
            input_tokens: usage.input ?? 0,
            output_tokens: usage.output ?? 0,
            cache_read_tokens: 0,
            cache_creation_tokens: 0,
            tool_name: null,
            cwd: currentCwd ?? null,
            source_id: null,
          };

          s.turns.push(turn);
        }
      } catch {
        // skip malformed lines
      }
    }

    rl.close();

    return this.buildOutput(sessions);
  }

  // ---- Helpers ----

  private buildOutput(sessions: Map<string, ParsedSession>): ParseOutput {
    const sessionRecords: SessionRecord[] = [];
    const turnRecords: TurnRecord[] = [];

    for (const [_sid, ps] of sessions) {
      turnRecords.push(...ps.turns);

      const projectName = this.projectNameFromCwd(ps.cwd);
      sessionRecords.push(
        this.buildSessionRecord(ps.sessionId, ps.turns, {
          project_name: projectName,
          model_provider: 'anthropic', // OpenClaw primarily uses Anthropic models
        }),
      );
    }

    return { sessions: sessionRecords, turns: turnRecords, lineCount: 0 };
  }

  private sessionIdFromPath(cwd: string): string {
    // Generate a stable session ID from the cwd
    const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-3).join('-') || cwd;
  }
}
