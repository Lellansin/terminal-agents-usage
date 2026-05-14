import type { PricingTier } from './index.js';

/**
 * Anthropic (Claude) API pricing per 1M tokens.
 * Prices in USD. Updated as of early 2025.
 *
 * Reference: https://www.anthropic.com/pricing
 */
export const anthropicPricing: Record<string, PricingTier> = {
  // Claude Opus 4
  'claude-opus-4-20250514': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  'claude-opus-4-1-20250805': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  'claude-opus-4': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  // Claude Opus 4.5
  'claude-opus-4-5-20251101': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  // Claude Sonnet 4
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  'claude-sonnet-4': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude Sonnet 4.5
  'claude-sonnet-4-5-20250929': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude Haiku 3.5
  'claude-3-5-haiku-20241022': {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
  'claude-3-5-haiku': {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
  // Claude Opus 3 (legacy)
  'claude-3-opus-20240229': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  'claude-opus-3': {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  // Claude Sonnet 3.5 (older)
  'claude-3-5-sonnet-20241022': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude Sonnet 3
  'claude-3-sonnet-20240229': {
    input: 3.0,
    output: 15.0,
  },
  // Claude Haiku 3
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
  },
};

/**
 * Match a model string to its pricing tier using prefix matching.
 */
export function matchAnthropicPricing(model: string): PricingTier | null {
  // Exact match first
  if (anthropicPricing[model]) return anthropicPricing[model];

  // Normalize: remove 'pa/' prefix (platform-specific prefix)
  const normalized = model.replace(/^pa\//, '');

  if (anthropicPricing[normalized]) return anthropicPricing[normalized];

  // Prefix-based matching for versioned model names
  for (const [key, tier] of Object.entries(anthropicPricing)) {
    if (normalized.startsWith(key)) return tier;
  }

  return null;
}

/**
 * Check if model is an Anthropic/Claude model (billable).
 */
export function isAnthropicModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes('claude') || lower.includes('clad') || lower.startsWith('pa/');
}
