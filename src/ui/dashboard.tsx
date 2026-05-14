import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type Database from 'better-sqlite3';
import { queryDashboard } from '../dashboard/queries.js';
import type {
  DashboardData,
  WeekRow,
  AgentRow,
} from '../dashboard/queries.js';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function bar(value: number, max: number, width: number = 20): string {
  if (max <= 0) return '';
  const pct = Math.min(value / max, 1);
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

const AGENT_COLORS: Record<string, string> = {
  claude: 'yellow',
  codex: 'cyan',
  openclaw: 'magenta',
  deepcode: 'blue',
  cursor: 'green',
  gemini: 'red',
};

function agentColor(agent: string): string {
  return AGENT_COLORS[agent] ?? 'white';
}

// ---- Main Component ----

interface Props {
  db: Database.Database;
  onScan?: () => Promise<void>;
}

export function DashboardApp({ db, onScan }: Props): React.ReactElement {
  const { exit } = useApp();
  const [data, setData] = useState<DashboardData>(() => queryDashboard(db));
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [selectedTab, setSelectedTab] = useState<'overview' | 'models' | 'week'>('overview');
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(() => {
    setData(queryDashboard(db));
    setLastRefresh(new Date());
  }, [db]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
    if (input === 'r') {
      refresh();
    }
    if (input === 's' && onScan) {
      setScanning(true);
      onScan().then(() => {
        setScanning(false);
        refresh();
      });
    }
    if (input === '1') setSelectedTab('overview');
    if (input === '2') setSelectedTab('models');
    if (input === '3') setSelectedTab('week');
    if (key.leftArrow) {
      const tabs: Array<'overview' | 'models' | 'week'> = ['overview', 'models', 'week'];
      const idx = tabs.indexOf(selectedTab);
      setSelectedTab(tabs[(idx - 1 + 3) % 3]);
    }
    if (key.rightArrow || key.tab) {
      const tabs: Array<'overview' | 'models' | 'week'> = ['overview', 'models', 'week'];
      const idx = tabs.indexOf(selectedTab);
      setSelectedTab(tabs[(idx + 1) % 3]);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text bold color="cyan">
            ⚡ Terminal Agents Usage
          </Text>
          {scanning && (
            <Text color="yellow">  (scanning...)</Text>
          )}
        </Box>
        <Text dimColor>
          {data.totalSessions.toLocaleString()} sessions |{' '}
          {fmt(data.totalTokens)} tokens | refreshed{' '}
          {lastRefresh.toLocaleTimeString()}
        </Text>
      </Box>

      {/* Tabs */}
      <Box marginBottom={1}>
        <Text
          bold={selectedTab === 'overview'}
          color={selectedTab === 'overview' ? 'cyan' : 'gray'}
        >
          [1] Overview
        </Text>
        <Text>  </Text>
        <Text
          bold={selectedTab === 'models'}
          color={selectedTab === 'models' ? 'cyan' : 'gray'}
        >
          [2] Models
        </Text>
        <Text>  </Text>
        <Text
          bold={selectedTab === 'week'}
          color={selectedTab === 'week' ? 'cyan' : 'gray'}
        >
          [3] Weekly
        </Text>
      </Box>

      <Box>
        <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
      </Box>

      {/* Tab Content */}
      {selectedTab === 'overview' && <OverviewTab data={data} />}
      {selectedTab === 'models' && <ModelsTab data={data} />}
      {selectedTab === 'week' && <WeekTab data={data} />}

      <Box marginTop={1}>
        <Text dimColor>
          ──────────────────────────────────────────────────────────────────────
        </Text>
      </Box>
      <Text dimColor>
        [1-3] tabs · [←→/tab] switch · [s] scan · [r] refresh · [q/ctrl+c] quit  · auto-refresh 30s
      </Text>
    </Box>
  );
}

// ---- Overview Tab ----

function OverviewTab({ data }: { data: DashboardData }) {
  return (
    <Box flexDirection="column">
      {/* Agent summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold underline>Agent Summary</Text>
        {data.agents.length === 0 && <Text dimColor>  No data</Text>}
        {[...data.agents]
          .sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens))
          .map((row) => (
            <AgentBar key={row.agent} row={row} maxTokens={Math.max(...data.agents.map(a => a.input_tokens + a.output_tokens))} />
          ))}
      </Box>

      {/* Today detail */}
      <Box flexDirection="column">
        <Text bold underline>Today</Text>
        {data.today.length === 0 && <Text dimColor>  No activity today</Text>}
        {data.today.map((row, i) => (
          <Box key={i} paddingLeft={2}>
            <Text color={agentColor(row.agent)}>
              [{row.agent}]
            </Text>
            <Text> </Text>
            <Text>{row.model || 'unknown'}</Text>
            <Text dimColor>
              {'  '}in:{fmt(row.input_tokens)} out:{fmt(row.output_tokens)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function AgentBar({ row, maxTokens }: { row: AgentRow; maxTokens: number }) {
  const total = row.input_tokens + row.output_tokens;
  return (
    <Box paddingLeft={2} flexDirection="column">
      <Box>
        <Text bold color={agentColor(row.agent)}>
          {row.agent.padEnd(10)}
        </Text>
        <Text>
          {bar(total, maxTokens)}
        </Text>
        <Text> {fmt(total)}</Text>
      </Box>
      <Box paddingLeft={10}>
        <Text dimColor>
          {row.sessions.toLocaleString()} sessions | in:{fmt(row.input_tokens)} out:{fmt(row.output_tokens)} | cache:{fmt(row.cache_read)} read
        </Text>
      </Box>
    </Box>
  );
}

// ---- Models Tab ----

function ModelsTab({ data }: { data: DashboardData }) {
  const maxVal = Math.max(...data.models.map(m => m.input_tokens + m.output_tokens), 1);

  return (
    <Box flexDirection="column">
      <Text bold underline>Top Models (all-time)</Text>
      {data.models.length === 0 && <Text dimColor>  No data</Text>}
      {data.models.map((row, i) => {
        const total = row.input_tokens + row.output_tokens;
        return (
          <Box key={i} paddingLeft={2}>
            <Text color={agentColor(row.agent)}>
              [{row.agent}]
            </Text>
            <Text> {row.model.padEnd(30)}</Text>
            <Text dimColor>{bar(total, maxVal)}</Text>
            <Text> {fmt(total)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ---- Week Tab ----

function WeekTab({ data }: { data: DashboardData }) {
  // Aggregate by day
  const byDay = new Map<string, { day: string; total: number; agents: WeekRow[] }>();
  for (const row of data.week) {
    let entry = byDay.get(row.day);
    if (!entry) {
      entry = { day: row.day, total: 0, agents: [] };
      byDay.set(row.day, entry);
    }
    entry.total += row.input_tokens + row.output_tokens;
    entry.agents.push(row);
  }
  const days = [...byDay.values()];
  const maxVal = Math.max(...days.map(d => d.total), 1);

  return (
    <Box flexDirection="column">
      <Text bold underline>Last 7 Days</Text>
      {days.length === 0 && <Text dimColor>  No data</Text>}
      {days.map((d) => (
        <Box key={d.day} paddingLeft={2} flexDirection="column">
          <Box>
            <Text dimColor>{d.day}</Text>
            <Text> {bar(d.total, maxVal)} </Text>
            <Text>{fmt(d.total)}</Text>
          </Box>
          {d.agents.map((a) => (
            <Box key={a.agent} paddingLeft={12}>
              <Text color={agentColor(a.agent)}>
                [{a.agent}]
              </Text>
              <Text dimColor>
                {' '}in:{fmt(a.input_tokens)} out:{fmt(a.output_tokens)}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
