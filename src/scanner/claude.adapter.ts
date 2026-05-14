import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createInterface } from 'node:readline';
import { BaseAdapter } from './base-adapter.js';
import type { ParseOptions, ParseOutput, SessionRecord, TurnRecord } from './types.js';

interface ClaudeMessage {
  type: 'user' | 'assistant';
  timestamp?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    tool_name?: string;
  };
  // Top-level fields on assistant messages
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

interface ParsedSession {
  sessionId: string;
  cwd: string | undefined;
  gitBranch: string | undefined;
  turns: TurnRecord[];
}

export class ClaudeAdapter extends BaseAdapter {
  readonly agent = 'claude';
  readonly displayName = 'Claude Code';

  async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    const projectDirs = this.getProjectDirs();

    for (const dir of projectDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDir = path.join(dir, entry.name);
            try {
              const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
              for (const sub of subEntries) {
                if (sub.isFile() && sub.name.endsWith('.jsonl')) {
                  files.push(path.join(subDir, sub.name));
                }
              }
            } catch {
              // skip inaccessible dirs
            }
          }
        }
      } catch {
        // skip inaccessible dirs
      }
    }

    return files;
  }

  async parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput> {
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
        const record: ClaudeMessage = JSON.parse(trimmed);
        this.processRecord(record, sessions);
      } catch {
        // skip malformed JSON lines
      }
    }

    rl.close();

    // Build output: sessions + turns
    const sessionRecords: SessionRecord[] = [];
    const turnRecords: TurnRecord[] = [];

    for (const [_sid, ps] of sessions) {
      turnRecords.push(...ps.turns);

      const projectName = this.projectNameFromCwd(ps.cwd);
      sessionRecords.push(
        this.buildSessionRecord(ps.sessionId, ps.turns, {
          project_name: projectName,
          git_branch: ps.gitBranch ?? null,
          model_provider: 'anthropic',
        }),
      );
    }

    return {
      sessions: sessionRecords,
      turns: turnRecords,
      lineCount,
    };
  }

  async parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput> {
    return this.parseFile(filepath, { sinceLine });
  }

  // ---- private ----

  private getProjectDirs(): string[] {
    const dirs: string[] = [];
    const home = os.homedir();

    // ~/.claude/projects/
    dirs.push(path.join(home, '.claude', 'projects'));

    // macOS Xcode sandbox path
    if (process.platform === 'darwin') {
      dirs.push(
        path.join(
          home,
          'Library',
          'Application Support',
          'Code',
          'User',
          'globalStorage',
          'anthropic.claude-code',
          'projects',
        ),
      );
    }

    return dirs;
  }

  private processRecord(record: ClaudeMessage, sessions: Map<string, ParsedSession>): void {
    // Only process assistant messages with usage data
    // User messages may also have message.usage (zeroed out); strictly check type
    if (record.type !== 'assistant') return;

    // Extract fields: message.usage vs top-level usage
    const usage = record.message?.usage ?? record.usage;
    if (!usage) return;

    const sessionId = record.sessionId ?? 'unknown';
    const messageId = record.message?.id;

    let s = sessions.get(sessionId);
    if (!s) {
      s = {
        sessionId,
        cwd: record.cwd,
        gitBranch: record.gitBranch,
        turns: [],
      };
      sessions.set(sessionId, s);
    }

    // Update session-level fields if not set
    if (!s.cwd && record.cwd) s.cwd = record.cwd;
    if (!s.gitBranch && record.gitBranch) s.gitBranch = record.gitBranch;

    const model = record.message?.model ?? record.model ?? null;
    const timestamp = record.timestamp ?? new Date().toISOString();

    const turn: TurnRecord = {
      agent: this.agent,
      session_id: sessionId,
      timestamp,
      model,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
      tool_name: record.message?.tool_name ?? null,
      cwd: record.cwd ?? null,
      source_id: messageId ?? null,
    };

    s.turns.push(turn);
  }
}
