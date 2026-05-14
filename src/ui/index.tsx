import React from 'react';
import { Box, Text } from 'ink';

export interface DailyStats {
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  sessions: number;
}

export interface WeeklyStats {
  day: string;
  agent: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
}

export interface AllTimeStats {
  agent: string;
  total_sessions: number;
  total_input: number;
  total_output: number;
  total_cache_read: number;
  total_cache_create: number;
  first_usage: string;
  last_usage: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ColoredTokens({
  input: inp,
  output: out,
}: {
  input: number;
  output: number;
}) {
  return (
    <Text>
      <Text color="cyan">in:{formatTokens(inp).padStart(8)}</Text>
      <Text>  </Text>
      <Text color="green">out:{formatTokens(out).padStart(8)}</Text>
    </Text>
  );
}

// ---- Today View ----

export function TodayView({ stats }: { stats: DailyStats[] }) {
  if (stats.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No usage recorded today.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Today's Usage</Text>
      </Box>
      {stats.map((row, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color="magenta">[{row.agent}]</Text>
            <Text> </Text>
            <Text bold>{row.model || 'unknown'}</Text>
          </Box>
          <Box paddingLeft={2}>
            <ColoredTokens input={row.input_tokens} output={row.output_tokens} />
          </Box>
          <Box paddingLeft={2}>
            <Text dimColor>
              cache: {formatTokens(row.cache_read)} read / {formatTokens(row.cache_write)} write
              {'  '}sessions: {row.sessions}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ---- Week View ----

export function WeekView({ stats }: { stats: WeeklyStats[] }) {
  if (stats.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No usage recorded in the last 7 days.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Last 7 Days</Text>
      </Box>
      {stats.map((row, i) => {
        const total = row.input_tokens + row.output_tokens;
        return (
          <Box key={i}>
            <Text dimColor>{row.day}</Text>
            <Text>  </Text>
            <Text color="magenta">[{row.agent}]</Text>
            <Text>  </Text>
            <ColoredTokens input={row.input_tokens} output={row.output_tokens} />
            <Text>  </Text>
            <Text dimColor>total:{formatTokens(total)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ---- Stats View ----

export function StatsView({ stats }: { stats: AllTimeStats[] }) {
  if (stats.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No usage data found. Run "scan" first.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>All-Time Statistics</Text>
      </Box>
      {stats.map((row, i) => {
        const total = row.total_input + row.total_output;
        return (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color="magenta">
                {row.agent}
              </Text>
            </Box>
            <Box paddingLeft={2} flexDirection="column">
              <Text>
                Sessions: <Text bold>{row.total_sessions}</Text>
              </Text>
              <Text>
                Input:{' '}
                <Text color="cyan">{row.total_input.toLocaleString()}</Text>
                {'  '}Output:{' '}
                <Text color="green">{row.total_output.toLocaleString()}</Text>
                {'  '}Total:{' '}
                <Text bold>{total.toLocaleString()}</Text>
              </Text>
              <Text dimColor>
                Cache read: {row.total_cache_read.toLocaleString()}{' '}
                | Cache create: {row.total_cache_create.toLocaleString()}
              </Text>
              <Text dimColor>
                First: {row.first_usage?.slice(0, 10) ?? 'N/A'}{' '}
                | Last: {row.last_usage?.slice(0, 10) ?? 'N/A'}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
