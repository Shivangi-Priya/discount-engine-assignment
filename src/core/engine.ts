import type { CartItem, CartResult, DiscountRule, ItemResult, ItemStatus, Rejected, RuleSetOutcome, Step } from './types';
import { explain } from './explain';
import { matches } from './matching';

export { matches } from './matching';

/** Whole-rupee saving, capped at the current price so a price can never go below zero. */
export function saving(price: number, r: DiscountRule): number {
  if (price <= 0) return 0;
  const raw = r.type === 'percentage' ? (price * r.value) / 100 : r.value;
  return Math.min(price, Math.round(raw));
}

const scopeRank = (r: DiscountRule) => (r.scope === 'brand' ? 0 : r.scope === 'platform' ? 1 : 2);

/**
 * One reducer for items AND the cart:
 *  1. the non-stackable rule with the biggest saving wins (scope is irrelevant);
 *     ties -> brand, then platform, then ruleId;
 *  2. every stackable rule compounds on the running price: percentages first, then flats, each by ruleId.
 */
export function reduceRuleSet(base: number, rules: DiscountRule[]): RuleSetOutcome {
  const steps: Step[] = [];
  const rejected: Rejected[] = [];
  let price = base;

  const scored = rules
    .filter(r => !r.stackable)
    .map(rule => ({ rule, s: saving(base, rule) }))
    .sort((a, b) => b.s - a.s || scopeRank(a.rule) - scopeRank(b.rule) || a.rule.ruleId.localeCompare(b.rule.ruleId));

  if (scored.length) {
    const [w, ...losers] = scored;
    if (w.s > 0) {
      steps.push({ rule: w.rule, saving: w.s, priceBefore: price, priceAfter: price - w.s, role: 'winner' });
      price -= w.s;
      losers.forEach(l => rejected.push({ rule: l.rule, potentialSaving: l.s }));
    }
  }

  const stack = rules
    .filter(r => r.stackable)
    .sort((a, b) => (a.type === b.type ? a.ruleId.localeCompare(b.ruleId) : a.type === 'percentage' ? -1 : 1));
  for (const rule of stack) {
    const s = saving(price, rule);
    if (s > 0) {
      steps.push({ rule, saving: s, priceBefore: price, priceAfter: price - s, role: 'stacked' });
      price -= s;
    }
  }
  return { finalAmount: price, steps, rejected };
}

export function statusOf(o: RuleSetOutcome): ItemStatus {
  if (!o.steps.length) return 'no_offer';
  if (o.steps.length > 1) return 'stacked';
  if (o.rejected.length > 0) return 'max_discount';
  return 'discount_applied';
}

/** The single entry point for every price on screen, in every report and in the impact analysis. */
export function evaluateCart(items: CartItem[], rules: DiscountRule[]): CartResult {
  const itemRules = rules.filter(r => r.scope !== 'cart');
  const cartRules = rules.filter(r => r.scope === 'cart');

  const results: ItemResult[] = items.map(item => {
    const matchedRules = itemRules.filter(r => matches(item, r));
    const outcome = reduceRuleSet(item.basePrice, matchedRules);
    return { item, matchedRules, outcome, status: statusOf(outcome), reasoning: '' };
  });

  const baseTotal = items.reduce((t, i) => t + i.basePrice, 0);
  const subtotal = results.reduce((t, r) => t + r.outcome.finalAmount, 0);
  const eligible = cartRules.filter(r => subtotal >= (r.minCartValue ?? Infinity)); // inclusive threshold
  const cartIneligible = cartRules.filter(r => !eligible.includes(r));
  const cartOutcome = eligible.length ? reduceRuleSet(subtotal, eligible) : null;
  const finalTotal = cartOutcome ? cartOutcome.finalAmount : subtotal;

  return explain({
    items: results, baseTotal, subtotal, itemDiscount: baseTotal - subtotal,
    cartOutcome, cartIneligible, cartOfferText: null,
    cartDiscount: subtotal - finalTotal, finalTotal, totalSavings: baseTotal - finalTotal,
  });
}
