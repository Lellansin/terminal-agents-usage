import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PRICING,
  getCustomPricing,
  getPricing,
  isBillable,
  calcCost,
  pricingSeedForModel,
} from '../../src/pricing/billing.js';
import type { CustomPricing } from '../../src/pricing/billing.js';

const EMPTY_OVERRIDES: CustomPricing = {};

// ── BUILTIN_PRICING ──────────────────────────────────────────────────

describe('BUILTIN_PRICING', () => {
  it('contains DeepSeek models', () => {
    expect(BUILTIN_PRICING['deepseek-v4-pro']).toBeDefined();
    expect(BUILTIN_PRICING['deepseek-v4-pro'].input).toBe(0.435);
    expect(BUILTIN_PRICING['deepseek-v4-pro'].output).toBe(0.87);

    expect(BUILTIN_PRICING['deepseek-v4-flash']).toBeDefined();
    expect(BUILTIN_PRICING['deepseek-v4-flash'].input).toBe(0.14);
  });

  it('contains Gemini models', () => {
    expect(BUILTIN_PRICING['gemini-2.5-pro']).toBeDefined();
    expect(BUILTIN_PRICING['gemini-2.5-flash']).toBeDefined();
    expect(BUILTIN_PRICING['gemini-3-pro']).toBeDefined();
    expect(BUILTIN_PRICING['gemini-3-flash']).toBeDefined();
  });

  it('contains Anthropic models', () => {
    expect(BUILTIN_PRICING['claude-opus-4-1']).toBeDefined();
    expect(BUILTIN_PRICING['claude-opus-4']).toBeDefined();
    expect(BUILTIN_PRICING['claude-sonnet-4-6']).toBeDefined();
    expect(BUILTIN_PRICING['claude-sonnet-4']).toBeDefined();
  });

  it('contains OpenAI models', () => {
    expect(BUILTIN_PRICING['gpt-5.5']).toBeDefined();
    expect(BUILTIN_PRICING['gpt-5.4']).toBeDefined();
    expect(BUILTIN_PRICING['gpt-5.4-mini']).toBeDefined();
  });

  it('all tiers have positive input and output prices', () => {
    for (const [model, tier] of Object.entries(BUILTIN_PRICING)) {
      expect(tier.input, `${model} input`).toBeGreaterThan(0);
      expect(tier.output, `${model} output`).toBeGreaterThan(0);
    }
  });
});

// ── getCustomPricing ─────────────────────────────────────────────────

describe('getCustomPricing', () => {
  const overrides: CustomPricing = {
    'my-model': { enabled: true, input: 10, output: 50, cache_write: 12.5, cache_read: 1 },
    'disabled-model': { enabled: false, input: 5, output: 25, cache_write: 0, cache_read: 0 },
  };

  it('returns pricing when enabled', () => {
    const p = getCustomPricing('my-model', overrides);
    expect(p).not.toBeNull();
    expect(p!.input).toBe(10);
    expect(p!.output).toBe(50);
  });

  it('returns null when disabled', () => {
    expect(getCustomPricing('disabled-model', overrides)).toBeNull();
  });

  it('returns null for unknown model', () => {
    expect(getCustomPricing('unknown', overrides)).toBeNull();
  });

  it('returns null for null model', () => {
    expect(getCustomPricing(null, overrides)).toBeNull();
  });
});

// ── getPricing ───────────────────────────────────────────────────────

describe('getPricing', () => {
  it('exact match in BUILTIN_PRICING', () => {
    const p = getPricing('deepseek-v4-pro', EMPTY_OVERRIDES);
    expect(p).not.toBeNull();
    expect(p!.input).toBe(0.435);
    expect(p!.output).toBe(0.87);
  });

  it('prefix match for versioned model name', () => {
    // claude-sonnet-4-20250514 should match claude-sonnet-4 prefix
    const p = getPricing('claude-sonnet-4-20250514', EMPTY_OVERRIDES);
    expect(p).not.toBeNull();
    expect(p!.input).toBe(3.0);
    expect(p!.output).toBe(15.0);
  });

  it('fallback match for deepseek-v4-pro variants', () => {
    // "deepseek/deepseek-v4-pro" from Claude relay
    expect(getPricing('deepseek/deepseek-v4-pro', EMPTY_OVERRIDES)).not.toBeNull();
    // "pub-deepseek-v4-pro" from OpenRouter-style prefix
    expect(getPricing('pub-deepseek-v4-pro', EMPTY_OVERRIDES)).not.toBeNull();
    // "pa/deepseek-v4-pro"
    expect(getPricing('pa/deepseek-v4-pro', EMPTY_OVERRIDES)).not.toBeNull();
  });

  it('fallback match for Anthropic models', () => {
    expect(getPricing('claude-opus-4-20250514', EMPTY_OVERRIDES)).not.toBeNull();
    expect(getPricing('pa/claude-sonnet-4-6', EMPTY_OVERRIDES)).not.toBeNull();
  });

  it('fallback match for Gemini models', () => {
    expect(getPricing('gemini-2.5-pro', EMPTY_OVERRIDES)).not.toBeNull();
    expect(getPricing('pub-gemini-3-flash-preview', EMPTY_OVERRIDES)).not.toBeNull();
    // "gemini-pro" fallback should match gemini-2.5-pro
    const p = getPricing('gemini-pro', EMPTY_OVERRIDES);
    expect(p).not.toBeNull();
    expect(p!.input).toBe(1.25);
  });

  it('custom override takes priority over built-in', () => {
    const overrides: CustomPricing = {
      'deepseek-v4-pro': { enabled: true, input: 99, output: 99, cache_write: 0, cache_read: 0 },
    };
    const p = getPricing('deepseek-v4-pro', overrides);
    expect(p!.input).toBe(99);
    expect(p!.output).toBe(99);
  });

  it('disabled custom override does not shadow built-in', () => {
    const overrides: CustomPricing = {
      'deepseek-v4-pro': { enabled: false, input: 99, output: 99, cache_write: 0, cache_read: 0 },
    };
    const p = getPricing('deepseek-v4-pro', overrides);
    // Should fall back to built-in, not return the disabled override
    expect(p!.input).toBe(0.435);
  });

  it('returns null for unknown model', () => {
    expect(getPricing('completely-unknown-model', EMPTY_OVERRIDES)).toBeNull();
  });

  it('returns null for null model', () => {
    expect(getPricing(null, EMPTY_OVERRIDES)).toBeNull();
  });
});

// ── isBillable ───────────────────────────────────────────────────────

describe('isBillable', () => {
  it('Anthropic models are billable by default', () => {
    expect(isBillable('claude-sonnet-4-6', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('claude-opus-4-1', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('pa/claude-sonnet-4-6', EMPTY_OVERRIDES)).toBe(true);
  });

  it('DeepSeek models are billable by default', () => {
    expect(isBillable('deepseek-v4-pro', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('deepseek-v4-flash', EMPTY_OVERRIDES)).toBe(true);
  });

  it('DeepSeek model variants are billable (fallback match)', () => {
    expect(isBillable('deepseek/deepseek-v4-pro', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('pub-deepseek-v4-pro', EMPTY_OVERRIDES)).toBe(true);
  });

  it('OpenAI models are billable by default', () => {
    expect(isBillable('gpt-5.5', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('gpt-5.4', EMPTY_OVERRIDES)).toBe(true);
  });

  it('Gemini models are billable by default', () => {
    expect(isBillable('gemini-2.5-pro', EMPTY_OVERRIDES)).toBe(true);
    expect(isBillable('gemini-3-flash', EMPTY_OVERRIDES)).toBe(true);
  });

  it('unknown model is not billable', () => {
    expect(isBillable('unknown-model', EMPTY_OVERRIDES)).toBe(false);
  });

  it('null model is not billable', () => {
    expect(isBillable(null, EMPTY_OVERRIDES)).toBe(false);
  });

  // ══════ Custom override scenarios ══════

  it('custom override enabled → billable', () => {
    const overrides: CustomPricing = {
      'my-model': { enabled: true, input: 5, output: 10, cache_write: 0, cache_read: 0 },
    };
    expect(isBillable('my-model', overrides)).toBe(true);
  });

  it('custom override disabled, built-in exists → billable (regression fix)', () => {
    // This was the root cause: deepseek-v4-pro had enabled:false in overrides,
    // but isBillable returned false instead of falling through to built-in.
    const overrides: CustomPricing = {
      'deepseek-v4-pro': { enabled: false, input: 1.7, output: 3.4, cache_write: 0, cache_read: 0 },
    };
    expect(isBillable('deepseek-v4-pro', overrides)).toBe(true);
  });

  it('custom override disabled, no built-in → not billable', () => {
    const overrides: CustomPricing = {
      'my-custom': { enabled: false, input: 5, output: 10, cache_write: 0, cache_read: 0 },
    };
    expect(isBillable('my-custom', overrides)).toBe(false);
  });

  it('custom override enabled for unknown model → billable', () => {
    const overrides: CustomPricing = {
      'my-custom': { enabled: true, input: 5, output: 10, cache_write: 0, cache_read: 0 },
    };
    expect(isBillable('my-custom', overrides)).toBe(true);
  });
});

// ── calcCost ─────────────────────────────────────────────────────────

describe('calcCost', () => {
  const delta = 0.0001;

  it('calculates cost for deepseek-v4-pro correctly', () => {
    // input: $0.435/M, output: $0.87/M
    // 1M input = $0.435, 1M output = $0.87, total = $1.305
    const cost = calcCost('deepseek-v4-pro', 1_000_000, 1_000_000, 0, 0, EMPTY_OVERRIDES);
    expect(cost).toBeCloseTo(1.305, delta);
  });

  it('returns 0 for non-billable model', () => {
    expect(calcCost('unknown', 1_000_000, 1_000_000, 0, 0, EMPTY_OVERRIDES)).toBe(0);
  });

  it('returns 0 for null model', () => {
    expect(calcCost(null, 1_000_000, 1_000_000, 0, 0, EMPTY_OVERRIDES)).toBe(0);
  });

  it('includes cache read tokens in cost', () => {
    // deepseek-v4-pro cache_read: $0.003625/M
    // 1M cache_read = $0.003625
    const cost = calcCost('deepseek-v4-pro', 0, 0, 1_000_000, 0, EMPTY_OVERRIDES);
    expect(cost).toBeCloseTo(0.003625, delta);
  });

  it('includes cache write tokens in cost', () => {
    // deepseek-v4-pro cache_write: $0.435/M = $0.435
    const cost = calcCost('deepseek-v4-pro', 0, 0, 0, 1_000_000, EMPTY_OVERRIDES);
    expect(cost).toBeCloseTo(0.435, delta);
  });

  it('calculates combined cost for all token types', () => {
    // Anthropic claude-sonnet-4-6:
    // input: 3.0/M, output: 15.0/M, cache_write: 3.75/M, cache_read: 0.30/M
    // 100k input, 50k output, 200k cache_read, 10k cache_write
    const cost = calcCost(
      'claude-sonnet-4-6',
      100_000, // input
      50_000, // output
      200_000, // cache read
      10_000, // cache write
      EMPTY_OVERRIDES,
    );
    const expected =
      (100_000 * 3.0) / 1e6 + // 0.30
      (50_000 * 15.0) / 1e6 + // 0.75
      (200_000 * 0.3) / 1e6 + // 0.06
      (10_000 * 3.75) / 1e6; // 0.0375
    expect(cost).toBeCloseTo(expected, delta);
  });

  it('uses custom override pricing when enabled', () => {
    const overrides: CustomPricing = {
      'my-model': { enabled: true, input: 10, output: 20, cache_write: 5, cache_read: 1 },
    };
    const cost = calcCost('my-model', 1_000_000, 500_000, 200_000, 100_000, overrides);
    const expected =
      (1_000_000 * 10) / 1e6 + (500_000 * 20) / 1e6 + (200_000 * 1) / 1e6 + (100_000 * 5) / 1e6;
    expect(cost).toBeCloseTo(expected, delta);
  });

  it('falls back to built-in when custom override disabled (regression fix)', () => {
    // deepseek-v4-pro has enabled:false in overrides
    // Should use built-in pricing instead of returning 0
    const overrides: CustomPricing = {
      'deepseek-v4-pro': { enabled: false, input: 99, output: 99, cache_write: 0, cache_read: 0 },
    };
    const cost = calcCost('deepseek-v4-pro', 1_000_000, 1_000_000, 0, 0, overrides);
    // Should use built-in: $0.435 + $0.87 = $1.305
    expect(cost).toBeCloseTo(1.305, delta);
  });
});

// ── pricingSeedForModel ──────────────────────────────────────────────

describe('pricingSeedForModel', () => {
  it('returns built-in pricing as seed for known model', () => {
    const seed = pricingSeedForModel('deepseek-v4-pro', EMPTY_OVERRIDES);
    expect(seed.enabled).toBe(true);
    expect(seed.input).toBe(0.435);
    expect(seed.output).toBe(0.87);
    expect(seed.cache_write).toBe(0.435);
    expect(seed.cache_read).toBe(0.003625);
  });

  it('returns disabled seed for unknown model', () => {
    const seed = pricingSeedForModel('unknown-model', EMPTY_OVERRIDES);
    expect(seed.enabled).toBe(false);
    expect(seed.input).toBe(0);
  });

  it('preserves custom override values', () => {
    const overrides: CustomPricing = {
      'deepseek-v4-pro': {
        enabled: true,
        input: 1.7,
        output: 3.4,
        cache_write: 1.7,
        cache_read: 0.0035,
      },
    };
    const seed = pricingSeedForModel('deepseek-v4-pro', overrides);
    expect(seed.enabled).toBe(true);
    expect(seed.input).toBe(1.7);
    expect(seed.output).toBe(3.4);
  });

  it('suggests enabling when disabled override has built-in pricing (regression fix)', () => {
    // User previously saved enabled:false, but built-in pricing exists.
    // Settings UI should suggest re-enabling automatically.
    const overrides: CustomPricing = {
      'deepseek-v4-pro': { enabled: false, input: 1.7, output: 3.4, cache_write: 0, cache_read: 0 },
    };
    const seed = pricingSeedForModel('deepseek-v4-pro', overrides);
    expect(seed.enabled).toBe(true); // should suggest enabling
    expect(seed.input).toBe(1.7); // keep user's custom values
    expect(seed.output).toBe(3.4);
  });

  it('does not suggest enabling when disabled and no built-in exists', () => {
    const overrides: CustomPricing = {
      'custom-only': { enabled: false, input: 5, output: 10, cache_write: 0, cache_read: 0 },
    };
    const seed = pricingSeedForModel('custom-only', overrides);
    expect(seed.enabled).toBe(false);
  });
});
