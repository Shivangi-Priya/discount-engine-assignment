/**
 * Deterministic channel commission and per-unit profit optimizer.
 * Rates/thresholds are user-configured; marketplace fees vary by category and date.
 */
export interface ChannelCommissionPolicy {
  channel: string;
  threshold: number;
  rateAboveThreshold: number;
  rateAtOrBelowThreshold?: number;
  otherVariableFees?: number;
}

export interface PriceCandidate {
  sellingPrice: number;
  commission: number;
  otherFees: number;
  profit: number;
}

export interface PriceOptimization {
  recommended: PriceCandidate;
  current: PriceCandidate;
  candidates: PriceCandidate[];
  additionalProfit: number;
}

export function calculateChannelCommission(price: number, policy: ChannelCommissionPolicy): number {
  const rate = price > policy.threshold
    ? policy.rateAboveThreshold
    : (policy.rateAtOrBelowThreshold ?? 0);
  return Math.round((price * rate / 100) * 100) / 100;
}

export function calculateUnitProfit(
  sellingPrice: number,
  productCost: number,
  policy: ChannelCommissionPolicy,
): PriceCandidate {
  const commission = calculateChannelCommission(sellingPrice, policy);
  const otherFees = policy.otherVariableFees ?? 0;
  return {
    sellingPrice,
    commission,
    otherFees,
    profit: Math.round((sellingPrice - productCost - commission - otherFees) * 100) / 100,
  };
}

/** Searches every whole-rupee price in the inclusive seller-approved range. */
export function optimizeChannelPrice(args: {
  currentPrice: number;
  productCost: number;
  minPrice: number;
  maxPrice: number;
  policy: ChannelCommissionPolicy;
}): PriceOptimization {
  const { currentPrice, productCost, minPrice, maxPrice, policy } = args;
  if (![currentPrice, productCost, minPrice, maxPrice, policy.threshold,
    policy.rateAboveThreshold, policy.rateAtOrBelowThreshold ?? 0,
    policy.otherVariableFees ?? 0].every(Number.isFinite)) {
    throw new Error('All pricing inputs must be finite numbers.');
  }
  if (productCost < 0 || minPrice <= 0 || maxPrice < minPrice ||
      policy.threshold < 0 || policy.rateAboveThreshold < 0 ||
      (policy.rateAtOrBelowThreshold ?? 0) < 0 || (policy.otherVariableFees ?? 0) < 0) {
    throw new Error('Enter a valid cost, price range, threshold and non-negative fee rates.');
  }
  if (maxPrice - minPrice > 100000) throw new Error('Price range is too large. Keep it within 100,000 rupees.');
  const candidates: PriceCandidate[] = [];
  for (let price = Math.ceil(minPrice); price <= Math.floor(maxPrice); price += 1) {
    candidates.push(calculateUnitProfit(price, productCost, policy));
  }
  if (!candidates.length) throw new Error('The selected price range contains no whole-rupee prices.');
  const current = calculateUnitProfit(currentPrice, productCost, policy);
  const recommended = candidates.reduce((best, item) =>
    item.profit > best.profit || (item.profit === best.profit && item.sellingPrice < best.sellingPrice) ? item : best
  );
  return { recommended, current, candidates, additionalProfit: recommended.profit - current.profit };
}
