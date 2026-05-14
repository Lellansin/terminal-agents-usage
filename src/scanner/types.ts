export interface SessionRecord {
  session_id: string;
  agent: string;
  project_name: string | null;
  title?: string | null;
  first_timestamp: string;
  last_timestamp: string;
  git_branch: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read: number;
  total_cache_creation: number;
  model: string | null;
  model_provider: string | null;
  turn_count: number;
}

export interface TurnRecord {
  agent: string;
  session_id: string;
  timestamp: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  tool_name: string | null;
  cwd: string | null;
  source_id: string | null;
}

export interface ProcessedFileRecord {
  path: string;
  agent: string;
  mtime: number;
  lines: number;
}

export interface ScanResult {
  newFiles: number;
  updatedFiles: number;
  skippedFiles: number;
  turnsAdded: number;
  sessionsSeen: number;
}

export interface ParseOptions {
  /** If provided, only parse lines starting from this offset */
  sinceLine?: number;
}

export interface ParseOutput {
  sessions: SessionRecord[];
  turns: TurnRecord[];
  lineCount: number;
}
