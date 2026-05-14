/**
 * Billing / cost estimation engine.
 *
 * This module is the single source of truth for pricing logic.
 * Keep in sync with the inline JS in `src/web/dashboard-page.ts` (the `<script>` block).
 */

export interface PricingTier {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export interface CustomPricingEntry {
  enabled: boolean;
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export type CustomPricing = Record<string, CustomPricingEntry>;

/** USD per 1M tokens. */
export const BUILTIN_PRICING: Record<string, PricingTier> = {
  // Anthropic
  'claude-opus-4-1': { input: 15.0, output: 75.0, cache_write: 18.75, cache_read: 1.5 },
  'claude-opus-4': { input: 15.0, output: 75.0, cache_write: 18.75, cache_read: 1.5 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cache_write: 3.75, cache_read: 0.3 },
  'claude-sonnet-4': { input: 3.0, output: 15.0, cache_write: 3.75, cache_read: 0.3 },

  // OpenAI
  'gpt-5.5': { input: 2.5, output: 15.0, cache_write: 2.5, cache_read: 0.25 },
  'gpt-5.4': { input: 1.25, output: 7.5, cache_write: 1.25, cache_read: 0.13 },
  'gpt-5.4-mini': { input: 0.375, output: 2.25, cache_write: 0.375, cache_read: 0.0375 },

  // DeepSeek
  'deepseek-v4-flash': { input: 0.14, output: 0.28, cache_write: 0.14, cache_read: 0.0028 },
  'deepseek-v4-pro': { input: 0.435, output: 0.87, cache_write: 0.435, cache_read: 0.003625 },

  // Google Gemini (<=200K context tier)
  'gemini-2.5-pro': { input: 1.25, output: 10.0, cache_write: 1.25, cache_read: 0.03125 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6, cache_write: 0.15, cache_read: 0.00375 },
  'gemini-3-flash': { input: 0.5, output: 3.0, cache_write: 0.5, cache_read: 0.0125 },
  'gemini-3-pro': { input: 2.0, output: 12.0, cache_write: 2.0, cache_read: 0.05 },
};

/**
 * Look up an enabled custom pricing entry.
 */
export function getCustomPricing(
  model: string | null,
  overrides: CustomPricing,
): PricingTier | null {
  if (!model || !overrides[model]) return null;
  const entry = overrides[model];
  if (!entry.enabled) return null;
  return {
    input: entry.input,
    output: entry.output,
    cache_write: entry.cache_write,
    cache_read: entry.cache_read,
  };
}

/**
 * Resolve the pricing tier for a model.
 *
 * Resolution order:
 * 1. Enabled custom override
 * 2. Exact match in BUILTIN_PRICING
 * 3. Prefix match in BUILTIN_PRICING
 * 4. Fallback substring heuristics
 */
export function getPricing(model: string | null, overrides: CustomPricing): PricingTier | null {
  if (!model) return null;

  const custom = getCustomPricing(model, overrides);
  if (custom) return custom;

  // Exact match
  if (BUILTIN_PRICING[model]) return BUILTIN_PRICING[model];

  // Prefix match (for versioned model names like "claude-sonnet-4-20250514")
  for (const key of Object.keys(BUILTIN_PRICING)) {
    if (model.startsWith(key)) return BUILTIN_PRICING[key];
  }

  // Fallback substring heuristics
  const m = model.toLowerCase();
  if (m.includes('deepseek-v4-pro')) return BUILTIN_PRICING['deepseek-v4-pro'];
  if (m.includes('deepseek-v4-flash')) return BUILTIN_PRICING['deepseek-v4-flash'];
  if (m.includes('gpt-5.5')) return BUILTIN_PRICING['gpt-5.5'];
  if (m.includes('gpt-5.4-mini')) return BUILTIN_PRICING['gpt-5.4-mini'];
  if (m.includes('gpt-5.4')) return BUILTIN_PRICING['gpt-5.4'];
  if (m.includes('gemini-3-pro')) return BUILTIN_PRICING['gemini-3-pro'];
  if (m.includes('gemini-3-flash')) return BUILTIN_PRICING['gemini-3-flash'];
  if (m.includes('gemini-2.5-pro')) return BUILTIN_PRICING['gemini-2.5-pro'];
  if (m.includes('gemini-2.5-flash')) return BUILTIN_PRICING['gemini-2.5-flash'];
  if (m.includes('gemini-pro')) return BUILTIN_PRICING['gemini-2.5-pro'];
  if (m.includes('gemini-flash')) return BUILTIN_PRICING['gemini-2.5-flash'];
  if (m.includes('opus')) return BUILTIN_PRICING['claude-opus-4-1'];
  if (m.includes('sonnet')) return BUILTIN_PRICING['claude-sonnet-4-6'];

  return null;
}

/**
 * Is this model eligible for cost estimation?
 *
 * - Custom override enabled → yes
 * - Custom override exists but disabled → check built-in PRICING
 * - No override → check built-in PRICING
 */
export function isBillable(model: string | null, overrides: CustomPricing): boolean {
  if (!model) return false;

  if (overrides[model]) {
    if (overrides[model].enabled) return true;
    // Override exists but disabled — fall through to built-in
    return getPricing(model, overrides) !== null;
  }

  return getPricing(model, overrides) !== null;
}

/**
 * Calculate estimated cost in USD.
 */
export function calcCost(
  model: string | null,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
  overrides: CustomPricing,
): number {
  if (!isBillable(model, overrides)) return 0;
  const p = getPricing(model, overrides);
  if (!p) return 0;
  return (
    (inputTokens * p.input) / 1e6 +
    (outputTokens * p.output) / 1e6 +
    (cacheReadTokens * p.cache_read) / 1e6 +
    (cacheCreationTokens * p.cache_write) / 1e6
  );
}

/**
 * Seed values for the Settings UI pricing table row.
 */
export function pricingSeedForModel(model: string, overrides: CustomPricing): CustomPricingEntry {
  const custom = overrides[model];
  if (custom) {
    const p = getPricing(model, overrides);
    // If the override is disabled but built-in PRICING is available, suggest enabling
    const suggestEnabled = custom.enabled || (p !== null && p !== custom);
    return {
      enabled: suggestEnabled,
      input: custom.input || p?.input || 0,
      output: custom.output || p?.output || 0,
      cache_write: custom.cache_write ?? p?.cache_write ?? 0,
      cache_read: custom.cache_read ?? p?.cache_read ?? 0,
    };
  }

  const p = getPricing(model, overrides);
  if (p) {
    return {
      enabled: true,
      input: p.input,
      output: p.output,
      cache_write: p.cache_write,
      cache_read: p.cache_read,
    };
  }

  return { enabled: false, input: 0, output: 0, cache_write: 0, cache_read: 0 };
}
