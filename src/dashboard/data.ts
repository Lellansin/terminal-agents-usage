import type Database from 'better-sqlite3';

export function getWebDashboardData(db: Database.Database) {
  // All models (for filter UI)
  const modelRows = db
    .prepare(`
      SELECT COALESCE(model, 'unknown') as model
      FROM turns
      GROUP BY model
      ORDER BY SUM(input_tokens + output_tokens) DESC
    `)
    .all() as { model: string }[];
  const allModels = modelRows.map((r) => r.model);

  // All agents
  const agentRows = db
    .prepare(`SELECT agent FROM turns GROUP BY agent ORDER BY agent`)
    .all() as { agent: string }[];
  const allAgents = agentRows.map((r) => r.agent);

  // Daily per-model (all history, client filters)
  const dailyRows = db
    .prepare(`
      SELECT
        substr(timestamp, 1, 10) as day,
        agent,
        COALESCE(model, 'unknown') as model,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cache_read_tokens) as cache_read,
        SUM(cache_creation_tokens) as cache_creation,
        COUNT(*) as turns
      FROM turns
      GROUP BY day, agent, model
      ORDER BY day, agent, model
    `)
    .all() as any[];

  const dailyByModel = dailyRows.map((r) => ({
    day: r.day,
    agent: r.agent,
    model: r.model,
    input: r.input_tokens || 0,
    output: r.output_tokens || 0,
    cache_read: r.cache_read || 0,
    cache_creation: r.cache_creation || 0,
    turns: r.turns || 0,
  }));

  // Hourly per-day per-model
  const hourlyRows = db
    .prepare(`
      SELECT
        substr(timestamp, 1, 10) as day,
        CAST(substr(timestamp, 12, 2) AS INTEGER) as hour,
        agent,
        COALESCE(model, 'unknown') as model,
        SUM(output_tokens) as output,
        COUNT(*) as turns
      FROM turns
      WHERE timestamp IS NOT NULL AND length(timestamp) >= 13
      GROUP BY day, hour, agent, model
      ORDER BY day, hour, agent, model
    `)
    .all() as any[];

  const hourlyByModel = hourlyRows.map((r) => ({
    day: r.day,
    hour: r.hour ?? 0,
    agent: r.agent,
    model: r.model,
    output: r.output || 0,
    turns: r.turns || 0,
  }));

  // Daily per-project from session totals (bucketed by last activity date)
  const projectDailyRows = db
    .prepare(`
      SELECT
        substr(last_timestamp, 1, 10) as day,
        COALESCE(project_name, 'unknown') as project,
        SUM(total_input_tokens) as input_tokens,
        SUM(total_output_tokens) as output_tokens,
        SUM(total_cache_read) as cache_read,
        SUM(total_cache_creation) as cache_creation,
        COUNT(*) as sessions
      FROM sessions
      WHERE last_timestamp IS NOT NULL AND length(last_timestamp) >= 10
      GROUP BY day, project
      ORDER BY day, project
    `)
    .all() as any[];

  const dailyByProject = projectDailyRows.map((r) => ({
    day: r.day,
    project: r.project,
    input: r.input_tokens || 0,
    output: r.output_tokens || 0,
    cache_read: r.cache_read || 0,
    cache_creation: r.cache_creation || 0,
    sessions: r.sessions || 0,
  }));

  // All sessions
  const sessionRows = db
    .prepare(`
      SELECT
        session_id, agent, project_name, title, first_timestamp, last_timestamp,
        total_input_tokens, total_output_tokens,
        total_cache_read, total_cache_creation, model, turn_count, git_branch
      FROM sessions
      ORDER BY last_timestamp DESC
    `)
    .all() as any[];

  const sessionsAll = sessionRows.map((r) => {
    let durationMin = 0;
    try {
      const t1 = new Date(r.first_timestamp.replace('Z', '+00:00'));
      const t2 = new Date(r.last_timestamp.replace('Z', '+00:00'));
      durationMin = Math.round((t2.getTime() - t1.getTime()) / 60000 * 10) / 10;
    } catch { /* keep 0 */ }

    return {
      session_id: r.session_id.slice(0, 8),
      agent: r.agent,
      project: r.project_name || 'unknown',
      branch: r.git_branch || '',
      title: r.title || '',
      last: (r.last_timestamp || '').slice(0, 16).replace('T', ' '),
      last_date: (r.last_timestamp || '').slice(0, 10),
      duration_min: durationMin,
      model: r.model || 'unknown',
      turns: r.turn_count || 0,
      input: r.total_input_tokens || 0,
      output: r.total_output_tokens || 0,
      cache_read: r.total_cache_read || 0,
      cache_creation: r.total_cache_creation || 0,
    };
  });

  return {
    all_models: allModels,
    all_agents: allAgents,
    daily_by_model: dailyByModel,
    daily_by_project: dailyByProject,
    hourly_by_model: hourlyByModel,
    sessions_all: sessionsAll,
    generated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
}
