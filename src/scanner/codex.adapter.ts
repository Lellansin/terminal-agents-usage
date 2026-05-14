import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOutput, ParseOptions, SessionRecord, TurnRecord } from './types.js';

// ---- Rollout event types ----

interface RolloutEvent {
  timestamp: string;
  type: string;
  payload?: Record<string, unknown>;
}

interface TokenUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

interface TokenCountInfo {
  total_token_usage: TokenUsage;
  last_token_usage: TokenUsage;
  model_context_window?: number;
}

// ---- Adapter ----

export class CodexAdapter extends BaseAdapter {
  readonly agent = 'codex';
  readonly displayName = 'Codex CLI';

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    const sessionsDir = path.join(os.homedir(), '.codex', 'sessions');

    if (!fs.existsSync(sessionsDir)) return files;

    try {
      const years = fs.readdirSync(sessionsDir, { withFileTypes: true });
      for (const year of years) {
        if (!year.isDirectory()) continue;
        const yearDir = path.join(sessionsDir, year.name);
        const months = fs.readdirSync(yearDir, { withFileTypes: true });
        for (const month of months) {
          if (!month.isDirectory()) continue;
          const monthDir = path.join(yearDir, month.name);
          const days = fs.readdirSync(monthDir, { withFileTypes: true });
          for (const day of days) {
            if (!day.isDirectory()) continue;
            const dayDir = path.join(monthDir, day.name);
            try {
              const entries = fs.readdirSync(dayDir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.jsonl')) {
                  files.push(path.join(dayDir, entry.name));
                }
              }
            } catch {
              // skip inaccessible dirs
            }
          }
        }
      }
    } catch {
      // skip if sessions dir structure is broken
    }

    return files;
  }

  async parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput> {
    const fileStream = fs.createReadStream(filepath, { encoding: 'utf-8' });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let sessionMeta: {
      id: string;
      cwd?: string;
      source?: string;
      model_provider?: string;
      git_branch?: string;
      created_at?: string;
    } | null = null;

    let currentModel: string | null = null;
    let firstUserMessage: string | null = null;

    // Task-level tracking
    let inTask = false;
    let taskStartedAt: string | null = null;
    let taskTokenAccum: {
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens: number;
      cache_creation_tokens: number;
    } | null = null;

    const turns: TurnRecord[] = [];
    let lineCount = 0;
    const startLine = options?.sinceLine ?? 0;

    for await (const line of rl) {
      lineCount++;
      if (lineCount <= startLine) continue;

      const trimmed = line.trim();
      if (!trimmed) continue;

      let event: RolloutEvent;
      try {
        event = JSON.parse(trimmed);
      } catch {
        continue;
      }

      // ---- session_meta (top-level type) ----
      if (event.type === 'session_meta' && event.payload) {
        const p = event.payload as Record<string, unknown>;
        sessionMeta = {
          id: String(p.id ?? ''),
          cwd: typeof p.cwd === 'string' ? p.cwd : undefined,
          source: typeof p.source === 'string' ? p.source : undefined,
          model_provider: typeof p.model_provider === 'string' ? p.model_provider : undefined,
          git_branch:
            typeof p.git === 'object' && p.git !== null
              ? (p.git as Record<string, unknown>).branch as string | undefined
              : undefined,
          created_at: typeof p.timestamp === 'string' ? p.timestamp : undefined,
        };
        continue;
      }

      // ---- turn_context (top-level type) ----
      if (event.type === 'turn_context' && event.payload) {
        const p = event.payload as Record<string, unknown>;
        if (typeof p.model === 'string') currentModel = p.model;
        continue;
      }

      // ---- events inside event_msg ----
      if (event.type === 'event_msg' && event.payload) {
        const p = event.payload as Record<string, unknown>;

        // token_count: periodic usage snapshot
        if (p.type === 'token_count') {
          const info = p.info as TokenCountInfo | undefined;
          if (!info?.last_token_usage) continue;

          const lu = info.last_token_usage;

          if (!inTask) {
            // Implicit task start: no task_started event seen yet
            inTask = true;
            taskStartedAt = event.timestamp;
            taskTokenAccum = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
          }

          taskTokenAccum!.input_tokens += lu.input_tokens;
          taskTokenAccum!.output_tokens += lu.output_tokens;
          taskTokenAccum!.cache_read_tokens += lu.cached_input_tokens;
          continue;
        }

        // task boundaries (also inside event_msg)
        if (p.type === 'task_started') {
          if (!inTask) {
            inTask = true;
            taskStartedAt = event.timestamp;
            taskTokenAccum = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
          }
          continue;
        }

        if (p.type === 'task_complete') {
          if (inTask && taskTokenAccum) {
            const turnTs = taskStartedAt ?? event.timestamp;
            turns.push(this.makeTurn(sessionMeta?.id ?? '', taskTokenAccum, currentModel, turnTs, sessionMeta?.cwd));
          }
          inTask = false;
          taskTokenAccum = null;
          taskStartedAt = null;
          continue;
        }

        // user_message: capture first message as session title
        if (p.type === 'user_message' && !firstUserMessage) {
          const msg = p.message;
          if (typeof msg === 'string') {
            firstUserMessage = msg.slice(0, 200);
          } else if (Array.isArray(msg)) {
            for (const item of msg) {
              if (item && typeof item === 'object' && (item as Record<string, unknown>).type === 'input_text') {
                firstUserMessage = String((item as Record<string, unknown>).text ?? '').slice(0, 200);
                break;
              }
            }
          }
          continue;
        }

        continue;
      }
    }

    rl.close();

    // Flush any remaining in-progress task (session without explicit task_complete)
    if (inTask && taskTokenAccum) {
      const turnTs = taskStartedAt ?? sessionMeta?.created_at ?? '';
      turns.push(
        this.makeTurn(sessionMeta?.id ?? '', taskTokenAccum, currentModel, turnTs, sessionMeta?.cwd),
      );
    }

    // If no tasks at all but we have session_meta, create one empty-skeleton turn
    // so the session shows up (with 0 tokens). Old rollouts may lack token_count events.
    if (turns.length === 0 && sessionMeta) {
      turns.push({
        agent: this.agent,
        session_id: sessionMeta.id,
        timestamp: sessionMeta.created_at ?? new Date().toISOString(),
        model: currentModel,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        tool_name: null,
        cwd: sessionMeta.cwd ?? null,
        source_id: `codex-rollout-${sessionMeta.id}`,
      });
    }

    // Build session record from turns
    const sessionRecords: SessionRecord[] = [];
    if (sessionMeta) {
      const projectName = this.projectNameFromCwd(sessionMeta.cwd);
      sessionRecords.push(
        this.buildSessionRecord(sessionMeta.id, turns, {
          project_name: projectName,
          title: firstUserMessage,
          git_branch: sessionMeta.git_branch ?? null,
          model_provider: sessionMeta.model_provider ?? 'openai',
        }),
      );
    } else {
      // No session_meta at all — try to extract session id from filename
      const basename = path.basename(filepath, '.jsonl');
      // Format: rollout-YYYY-MM-DDTHH-MM-SS-<uuid>.jsonl
      const parts = basename.split('-');
      if (parts.length >= 8) {
        const sessionId = parts.slice(7).join('-');
        sessionRecords.push(
          this.buildSessionRecord(sessionId, turns, {
            model_provider: 'openai',
          }),
        );
      }
    }

    return {
      sessions: sessionRecords,
      turns,
      lineCount,
    };
  }

  async parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput> {
    return this.parseFile(filepath, { sinceLine });
  }

  // ---- private ----

  private makeTurn(
    sessionId: string,
    accum: { input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_creation_tokens: number },
    model: string | null,
    timestamp: string,
    cwd?: string,
  ): TurnRecord {
    return {
      agent: this.agent,
      session_id: sessionId,
      timestamp,
      model,
      input_tokens: accum.input_tokens,
      output_tokens: accum.output_tokens,
      cache_read_tokens: accum.cache_read_tokens,
      cache_creation_tokens: accum.cache_creation_tokens,
      tool_name: null,
      cwd: cwd ?? null,
      source_id: `codex-task-${sessionId}-${timestamp}`,
    };
  }
}
