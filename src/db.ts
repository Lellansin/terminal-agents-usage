import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export interface DBOptions {
  dbPath?: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
    session_id           TEXT PRIMARY KEY,
    agent                TEXT NOT NULL,
    project_name         TEXT,
    title                TEXT,
    first_timestamp      TEXT,
    last_timestamp       TEXT,
    git_branch           TEXT,
    total_input_tokens   INTEGER DEFAULT 0,
    total_output_tokens  INTEGER DEFAULT 0,
    total_cache_read     INTEGER DEFAULT 0,
    total_cache_creation INTEGER DEFAULT 0,
    model                TEXT,
    model_provider       TEXT,
    turn_count           INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS turns (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    agent                 TEXT NOT NULL,
    session_id            TEXT,
    timestamp             TEXT,
    model                 TEXT,
    input_tokens          INTEGER DEFAULT 0,
    output_tokens         INTEGER DEFAULT 0,
    cache_read_tokens     INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    tool_name             TEXT,
    cwd                   TEXT,
    source_id             TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_turns_source_id
    ON turns(agent, source_id)
    WHERE source_id IS NOT NULL AND source_id != '';

CREATE TABLE IF NOT EXISTS processed_files (
    path   TEXT PRIMARY KEY,
    agent  TEXT NOT NULL,
    mtime  REAL,
    lines  INTEGER
);
`;

let _db: Database.Database | null = null;

export function getDefaultDbPath(): string {
  return path.join(os.homedir(), '.config', 'terminal-agents', 'usage.db');
}

export function getDB(opts?: DBOptions): Database.Database {
  if (_db) return _db;

  const dbPath = opts?.dbPath ?? getDefaultDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(SCHEMA_SQL);

  return _db;
}

export function closeDB(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** For testing: create an in-memory database */
export function createMemoryDB(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return db;
}
