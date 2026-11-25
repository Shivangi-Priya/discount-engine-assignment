import { describe, expect, it } from 'vitest';
import { calculateChannelCommission, calculateUnitProfit, optimizeChannelPrice } from './channelPricing';

const policy = { channel: 'Amazon', threshold: 999, rateAboveThreshold: 10, rateAtOrBelowThreshold: 0 };

describe('channel commission pricing', () => {
  it('charges commission only above the threshold', () => {
    expect(calculateChannelCommission(999, policy)).toBe(0);
    expect(calculateChannelCommission(1000, policy)).toBe(100);
  });

  it('calculates profit after commission and other fees', () => {
    expect(calculateUnitProfit(1100, 700, { ...policy, otherVariableFees: 10 }).profit).toBe(280);
  });

  it('finds 999 as best price for the illustrative 700-cost example', () => {
    const result = optimizeChannelPrice({
      currentPrice: 1100, productCost: 700, minPrice: 800, maxPrice: 1100, policy,
    });
    expect(result.recommended.sellingPrice).toBe(999);
    expect(result.recommended.profit).toBe(299);
    expect(result.current.profit).toBe(290);
  });

  it('finds the threshold price when the above-threshold rate makes it more profitable', () => {
    const result = optimizeChannelPrice({
      currentPrice: 1100, productCost: 700, minPrice: 800, maxPrice: 1100,
      policy: { ...policy, rateAboveThreshold: 40 },
    });
    expect(result.recommended.sellingPrice).toBe(999);
    expect(result.recommended.profit).toBe(299);
  });

  it('rejects invalid price ranges', () => {
    expect(() => optimizeChannelPrice({
      currentPrice: 1000, productCost: 500, minPrice: 100, maxPrice: 50, policy,
    })).toThrow();
  });
});
