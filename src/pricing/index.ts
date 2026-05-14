/**
 * Pricing registry — single source of truth for cost calculation.
 * Used by both server-side and sent to frontend via API.
 */

export interface PricingTier {
  /** Cost per 1M input tokens (USD) */
  input: number;
  /** Cost per 1M output tokens (USD) */
  output: number;
  /** Cost per 1M cache write tokens (USD) */
  cacheWrite?: number;
  /** Cost per 1M cache read tokens (USD) */
  cacheRead?: number;
}

export interface PricingEntry {
  model: string;
  provider: string;
  tier: PricingTier;
}

export interface PricingRegistry {
  getPricing(model: string): PricingTier | null;
  isBillable(model: string): boolean;
  getAll(): PricingEntry[];
}

/**
 * Create a pricing registry with the given entries.
 */
export function createPricingRegistry(entries: PricingEntry[]): PricingRegistry {
  const byModel = new Map<string, PricingEntry>();

  for (const entry of entries) {
    byModel.set(entry.model, entry);
  }

  return {
    getPricing(model: string): PricingTier | null {
      // Exact match
      const entry = byModel.get(model);
      if (entry) return entry.tier;

      // Prefix match (for versioned models)
      for (const [key, e] of byModel) {
        if (model.startsWith(key)) return e.tier;
      }

      return null;
    },

    isBillable(model: string): boolean {
      return this.getPricing(model) !== null;
    },

    getAll(): PricingEntry[] {
      return [...byModel.values()];
    },
  };
}

/**
 * Calculate cost for a given token usage.
 */
export function calculateCost(
  tier: PricingTier,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheCreationTokens: number = 0,
): number {
  let cost = 0;
  cost += (inputTokens / 1_000_000) * tier.input;
  cost += (outputTokens / 1_000_000) * tier.output;
  if (tier.cacheRead) {
    cost += (cacheReadTokens / 1_000_000) * tier.cacheRead;
  }
  if (tier.cacheWrite) {
    cost += (cacheCreationTokens / 1_000_000) * tier.cacheWrite;
  }
  return cost;
}
