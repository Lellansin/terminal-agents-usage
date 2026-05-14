import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../../src/scanner/claude.adapter.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '..', 'fixtures', 'claude-sample.jsonl');

describe('ClaudeAdapter', () => {
  const adapter = new ClaudeAdapter();

  it('should have correct agent identifier', () => {
    expect(adapter.agent).toBe('claude');
    expect(adapter.displayName).toBe('Claude Code');
  });

  it('should parse a JSONL file and extract sessions and turns', async () => {
    const result = await adapter.parseFile(fixturePath);

    expect(result.lineCount).toBe(6);
    expect(result.turns).toHaveLength(3); // 3 assistant messages with usage

    // Check first turn
    expect(result.turns[0]).toMatchObject({
      agent: 'claude',
      session_id: 'session-abc-123',
      model: 'claude-sonnet-4-20250514',
      input_tokens: 150,
      output_tokens: 300,
      cache_read_tokens: 100,
      cache_creation_tokens: 0,
      source_id: 'msg-002',
    });

    // Check sessions
    expect(result.sessions).toHaveLength(2);

    const sessionABC = result.sessions.find((s) => s.session_id === 'session-abc-123');
    expect(sessionABC).toBeDefined();
    expect(sessionABC!.agent).toBe('claude');
    expect(sessionABC!.project_name).toBe('dev/my-project');
    expect(sessionABC!.git_branch).toBe('main');
    expect(sessionABC!.turn_count).toBe(2);
    expect(sessionABC!.total_input_tokens).toBe(350);
    expect(sessionABC!.total_output_tokens).toBe(750);
    expect(sessionABC!.total_cache_read).toBe(150);
    expect(sessionABC!.total_cache_creation).toBe(200);
    expect(sessionABC!.model).toBe('claude-sonnet-4-20250514');
    expect(sessionABC!.model_provider).toBe('anthropic');

    const sessionDEF = result.sessions.find((s) => s.session_id === 'session-def-456');
    expect(sessionDEF).toBeDefined();
    expect(sessionDEF!.project_name).toBe('dev/another-project');
    expect(sessionDEF!.git_branch).toBe('feature/test');
    expect(sessionDEF!.turn_count).toBe(1);
    expect(sessionDEF!.total_input_tokens).toBe(500);
    expect(sessionDEF!.total_output_tokens).toBe(800);
  });

  it('should support incremental parsing via parseNewLines', async () => {
    // Parse first 2 lines (sessions header lines)
    const partial = await adapter.parseFile(fixturePath, { sinceLine: 2 });
    expect(partial.turns).toHaveLength(2); // lines 3-4 and 5-6 have turns
  });

  it('should extract project name from cwd correctly', async () => {
    const result = await adapter.parseFile(fixturePath);

    const session = result.sessions.find((s) => s.session_id === 'session-abc-123');
    expect(session?.project_name).toBe('dev/my-project');
  });
});
