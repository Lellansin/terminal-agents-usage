import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createMemoryDB } from '../src/db.js';

describe('Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createMemoryDB();
  });

  afterEach(() => {
    db.close();
  });

  it('should create all required tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const names = tables.map((t) => t.name).sort();
    expect(names).toContain('sessions');
    expect(names).toContain('turns');
    expect(names).toContain('processed_files');
  });

  it('should create unique index on turns(source_id, agent)', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_turns_source_id'")
      .all();

    expect(indexes).toHaveLength(1);
  });

  it('should allow inserting a session record', () => {
    const stmt = db.prepare(`
      INSERT INTO sessions (
        session_id, agent, project_name, first_timestamp, last_timestamp,
        git_branch, total_input_tokens, total_output_tokens,
        total_cache_read, total_cache_creation, model, model_provider, turn_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      'test-session-1',
      'claude',
      'test/project',
      '2025-01-15T10:00:00Z',
      '2025-01-15T11:00:00Z',
      'main',
      1000,
      500,
      200,
      100,
      'claude-sonnet-4',
      'anthropic',
      5,
    );

    const row = db
      .prepare('SELECT * FROM sessions WHERE session_id = ?')
      .get('test-session-1') as any;
    expect(row.agent).toBe('claude');
    expect(row.project_name).toBe('test/project');
    expect(row.total_input_tokens).toBe(1000);
    expect(row.total_output_tokens).toBe(500);
    expect(row.turn_count).toBe(5);
  });

  it('should deduplicate turns by agent + source_id', () => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO turns (
        agent, session_id, timestamp, model,
        input_tokens, output_tokens, cache_read_tokens,
        cache_creation_tokens, tool_name, cwd, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // First insert
    insert.run(
      'claude',
      's1',
      '2025-01-15T10:00:00Z',
      'claude-sonnet-4',
      100,
      50,
      10,
      5,
      null,
      '/test',
      'msg-001',
    );

    // Second insert with same agent + source_id => ignored
    insert.run(
      'claude',
      's1',
      '2025-01-15T10:00:00Z',
      'claude-sonnet-4',
      999,
      999,
      0,
      0,
      null,
      '/test',
      'msg-001',
    );

    const rows = db.prepare('SELECT * FROM turns').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].input_tokens).toBe(100); // first value persists, second ignored
  });

  it('should store and retrieve processed_files records', () => {
    const insert = db.prepare(
      'INSERT OR REPLACE INTO processed_files (path, agent, mtime, lines) VALUES (?, ?, ?, ?)',
    );

    insert.run('/tmp/test.jsonl', 'claude', 1234567890.0, 42);

    const row = db
      .prepare('SELECT * FROM processed_files WHERE path = ?')
      .get('/tmp/test.jsonl') as any;
    expect(row.agent).toBe('claude');
    expect(row.mtime).toBe(1234567890.0);
    expect(row.lines).toBe(42);

    // Replace
    insert.run('/tmp/test.jsonl', 'claude', 9876543210.0, 100);
    const updated = db
      .prepare('SELECT * FROM processed_files WHERE path = ?')
      .get('/tmp/test.jsonl') as any;
    expect(updated.lines).toBe(100);
  });
});
