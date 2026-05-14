import type Database from 'better-sqlite3';

export interface TodayRow {
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  sessions: number;
}

export interface WeekRow {
  day: string;
  agent: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
}

export interface AgentRow {
  agent: string;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
}

export interface ModelRow {
  model: string;
  agent: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  sessions: number;
}

export interface DashboardData {
  today: TodayRow[];
  week: WeekRow[];
  agents: AgentRow[];
  models: ModelRow[];
  totalTokens: number;
  totalSessions: number;
}

export function queryDashboard(db: Database.Database): DashboardData {
  const today = new Date().toISOString().slice(0, 10);

  const todayRows = db.prepare(`
    SELECT agent, model,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cache_read_tokens) as cache_read,
      SUM(cache_creation_tokens) as cache_write,
      COUNT(DISTINCT session_id) as sessions
    FROM turns
    WHERE date(timestamp) = ?
    GROUP BY agent, model
    ORDER BY agent, model
  `).all(today) as TodayRow[];

  const weekRows = db.prepare(`
    SELECT date(timestamp) as day, agent,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cache_read_tokens) as cache_read,
      SUM(cache_creation_tokens) as cache_write
    FROM turns
    WHERE timestamp >= date('now', '-7 days')
    GROUP BY day, agent
    ORDER BY day DESC, agent
  `).all() as WeekRow[];

  const agentRows = db.prepare(`
    SELECT agent,
      COUNT(DISTINCT session_id) as sessions,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cache_read_tokens) as cache_read,
      SUM(cache_creation_tokens) as cache_write
    FROM turns
    GROUP BY agent
    ORDER BY agent
  `).all() as AgentRow[];

  const modelRows = db.prepare(`
    SELECT model, agent,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(cache_read_tokens) as cache_read,
      SUM(cache_creation_tokens) as cache_write,
      COUNT(DISTINCT session_id) as sessions
    FROM turns
    WHERE model IS NOT NULL AND model != ''
    GROUP BY model
    ORDER BY SUM(input_tokens + output_tokens) DESC
    LIMIT 12
  `).all() as ModelRow[];

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens + output_tokens), 0) as totalTokens,
      COALESCE(COUNT(DISTINCT session_id), 0) as totalSessions
    FROM turns
  `).get() as { totalTokens: number; totalSessions: number };

  return {
    today: todayRows,
    week: weekRows,
    agents: agentRows,
    models: modelRows,
    totalTokens: totals.totalTokens,
    totalSessions: totals.totalSessions,
  };
}
