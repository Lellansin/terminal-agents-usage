import type { ParseOptions, ParseOutput, SessionRecord, TurnRecord } from './types.js';

export interface AgentAdapter {
  /** Unique agent identifier (e.g., 'claude', 'codex', 'openclaw') */
  readonly agent: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Discover all data files for this agent */
  discoverFiles(): Promise<string[]>;

  /** Parse a single file completely, returning extracted sessions + turns */
  parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput>;

  /** Parse only new lines from a file (for incremental scan) */
  parseNewLines(filepath: string, sinceLine: number): Promise<ParseOutput>;
}

/**
 * Abstract base class for agent adapters.
 * Provides common helper methods that adapters can reuse.
 */
export abstract class BaseAdapter implements AgentAdapter {
  abstract readonly agent: string;
  abstract readonly displayName: string;

  abstract discoverFiles(): Promise<string[]>;
  abstract parseFile(filepath: string, options?: ParseOptions): Promise<ParseOutput>;

  async parseNewLines(_filepath: string, _sinceLine: number): Promise<ParseOutput> {
    // Default: re-parse entire file if incremental isn't supported
    return this.parseFile(_filepath);
  }

  /** Extract project name from cwd (last 2 path segments) */
  protected projectNameFromCwd(cwd: string | undefined | null): string | null {
    if (!cwd) return null;
    const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(-2).join('/');
    }
    return parts[0] ?? null;
  }

  /** Build a session record from turn data */
  protected buildSessionRecord(
    sessionId: string,
    turns: TurnRecord[],
    override?: Partial<SessionRecord>,
  ): SessionRecord {
    const sorted = [...turns].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Pick model: most frequent across turns, with priority fallback
    const modelCounts = new Map<string, number>();
    for (const t of sorted) {
      if (t.model) {
        modelCounts.set(t.model, (modelCounts.get(t.model) ?? 0) + 1);
      }
    }
    const model = this.pickModel(modelCounts);

    return {
      session_id: sessionId,
      agent: this.agent,
      project_name: override?.project_name ?? null,
      title: override?.title ?? null,
      first_timestamp: sorted[0]?.timestamp ?? '',
      last_timestamp: sorted[sorted.length - 1]?.timestamp ?? '',
      git_branch: override?.git_branch ?? null,
      total_input_tokens: turns.reduce((s, t) => s + t.input_tokens, 0),
      total_output_tokens: turns.reduce((s, t) => s + t.output_tokens, 0),
      total_cache_read: turns.reduce((s, t) => s + t.cache_read_tokens, 0),
      total_cache_creation: turns.reduce((s, t) => s + t.cache_creation_tokens, 0),
      model,
      model_provider: override?.model_provider ?? null,
      turn_count: turns.length,
    };
  }

  /** Pick the most frequent model, with priority for known higher-tier models */
  private pickModel(counts: Map<string, number>): string | null {
    if (counts.size === 0) return null;

    // Priority order for model selection when counts are tied
    const priorityOrder = ['opus', 'sonnet', 'haiku'];

    let best: string | null = null;
    let bestCount = 0;
    let bestPriority = -1;

    for (const [model, count] of counts) {
      const modelLower = model.toLowerCase();
      const prio = priorityOrder.findIndex((p) => modelLower.includes(p));

      if (count > bestCount || (count === bestCount && prio > bestPriority)) {
        best = model;
        bestCount = count;
        bestPriority = prio;
      }
    }

    return best;
  }
}
