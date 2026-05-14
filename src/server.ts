import express from 'express';
import type Database from 'better-sqlite3';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getWebDashboardData } from './dashboard/data.js';
import { Scanner } from './scanner/index.js';
import { ClaudeAdapter } from './scanner/claude.adapter.js';
import { CodexAdapter } from './scanner/codex.adapter.js';
import { OpenClawAdapter } from './scanner/openclaw.adapter.js';
import { DeepCodeAdapter } from './scanner/deepcode.adapter.js';
import { CursorAdapter } from './scanner/cursor.adapter.js';
import { GeminiAdapter } from './scanner/gemini.adapter.js';
import { getDashboardHTML } from './web/dashboard-page.js';

type PricingEntry = {
  enabled: boolean;
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
};

type PricingOverrides = Record<string, PricingEntry>;

const PRICING_OVERRIDES_PATH = path.join(
  os.homedir(),
  '.config',
  'terminal-agents',
  'pricing.overrides.json',
);

function normalizePricingOverrides(input: unknown): PricingOverrides {
  const out: PricingOverrides = {};
  if (!input || typeof input !== 'object') return out;
  for (const [model, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const enabled = Boolean(row.enabled);
    const inputPrice = Number(row.input ?? 0);
    const outputPrice = Number(row.output ?? 0);
    const cacheWrite = Number(row.cache_write ?? 0);
    const cacheRead = Number(row.cache_read ?? 0);
    out[model] = {
      enabled,
      input: Number.isFinite(inputPrice) ? inputPrice : 0,
      output: Number.isFinite(outputPrice) ? outputPrice : 0,
      cache_write: Number.isFinite(cacheWrite) ? cacheWrite : 0,
      cache_read: Number.isFinite(cacheRead) ? cacheRead : 0,
    };
  }
  return out;
}

async function readPricingOverridesFile(): Promise<PricingOverrides> {
  try {
    const raw = await fs.readFile(PRICING_OVERRIDES_PATH, 'utf8');
    return normalizePricingOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function writePricingOverridesFile(overrides: PricingOverrides): Promise<void> {
  const dir = path.dirname(PRICING_OVERRIDES_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PRICING_OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
}

export function createWebServer(db: Database.Database, port: number) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // HTML template served inline
  app.get('/', (_req, res) => {
    res.type('html').send(getDashboardHTML());
  });

  // API: dashboard data
  app.get('/api/data', async (_req, res) => {
    try {
      const data = getWebDashboardData(db);
      const pricing_overrides = await readPricingOverridesFile();
      res.json({ ...data, pricing_overrides });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/pricing', async (_req, res) => {
    try {
      const pricing_overrides = await readPricingOverridesFile();
      res.json({ pricing_overrides, path: PRICING_OVERRIDES_PATH });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/pricing', async (req, res) => {
    try {
      const pricing_overrides = normalizePricingOverrides(req.body?.pricing_overrides);
      await writePricingOverridesFile(pricing_overrides);
      res.json({ ok: true, pricing_overrides, path: PRICING_OVERRIDES_PATH });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // API: rescan
  app.post('/api/rescan', async (_req, res) => {
    try {
      const scanner = new Scanner();
      scanner.register(new ClaudeAdapter());
      scanner.register(new CodexAdapter());
      scanner.register(new OpenClawAdapter());
      scanner.register(new DeepCodeAdapter());
      scanner.register(new CursorAdapter());
      scanner.register(new GeminiAdapter());
      const result = await scanner.scan(db);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(port, () => {
    console.log(`Dashboard → http://localhost:${port}`);
  });

  return app;
}
