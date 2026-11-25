import { describe, it, expect } from 'vitest';
import { evaluateCart, reduceRuleSet, saving } from '../src/core/engine';
import { computeImpact } from '../src/core/impact';
import { DiscountRuleSchema } from '../src/core/types';

import { I, R, goldenItems, goldenRules } from './fixtures';

describe('golden table (official assignment)', () => {
  const res = evaluateCart(goldenItems, goldenRules);
  it('item final prices', () => expect(res.items.map(i => i.outcome.finalAmount)).toEqual([1104, 629, 509, 2499, 382, 809]));
  it('statuses', () => expect(res.items.map(i => i.status)).toEqual(
    ['max_discount', 'stacked', 'discount_applied', 'no_offer', 'discount_applied', 'discount_applied']));
  it('subtotal 5932, cart discount 593, final 5339', () => {
    expect(res.subtotal).toBe(5932);
    expect(res.cartDiscount).toBe(593);
    expect(res.finalTotal).toBe(5339);
    expect(res.baseTotal).toBe(6594);
    expect(res.itemDiscount).toBe(662);
    expect(res.totalSavings).toBe(1255);
  });
  it('explanations come from the trace', () => {
    expect(res.items[0].reasoning).toContain('RULE-01');
    expect(res.items[0].reasoning).toContain('beat RULE-02');
    expect(res.items[3].reasoning).toBe('No offers available for this item.');
    expect(res.cartOfferText).toContain('Rs.593 saved');
  });
});

describe('pricing rules', () => {
  it('1. maximum non-stackable discount wins (scope irrelevant)', () => {
    const o = reduceRuleSet(1000, [
      R({ ruleId: 'A', scope: 'brand', type: 'flat', value: 50 }),
      R({ ruleId: 'B', scope: 'platform', value: 20 }),
    ]);
    expect(o.steps[0].rule.ruleId).toBe('B');
    expect(o.finalAmount).toBe(800);
    expect(o.rejected.map(r => r.rule.ruleId)).toEqual(['A']);
  });
  it('2. stackable applies after the winning rule', () => {
    const o = reduceRuleSet(1000, [R({ ruleId: 'W', value: 20 }), R({ ruleId: 'S', value: 10, stackable: true })]);
    expect(o.steps.map(s => s.rule.ruleId)).toEqual(['W', 'S']);
    expect(o.finalAmount).toBe(720);
  });
  it('3. stackable applies independently with no non-stackable match', () => {
    const o = reduceRuleSet(1000, [R({ ruleId: 'S', value: 10, stackable: true })]);
    expect(o.finalAmount).toBe(900);
    expect(o.steps[0].role).toBe('stacked');
  });
  it('4. cart discount applies when threshold met (inclusive)', () => {
    const res = evaluateCart([I('a', 'X', 'P', 4000)], [R({ ruleId: 'C', scope: 'cart', appliesTo: null, minCartValue: 4000 })]);
    expect(res.finalTotal).toBe(3600);
    expect(res.cartOfferText).not.toBeNull();
  });
  it('5. cart discount does not apply below threshold', () => {
    const res = evaluateCart([I('a', 'X', 'P', 3999)], [R({ ruleId: 'C', scope: 'cart', appliesTo: null, minCartValue: 4000 })]);
    expect(res.finalTotal).toBe(3999);
    expect(res.cartOutcome).toBeNull();
    expect(res.cartOfferText).toBeNull();
    expect(res.cartIneligible).toHaveLength(1);
  });
  it('6. flat discount cannot push price below zero', () => {
    expect(saving(100, R({ ruleId: 'F', type: 'flat', value: 500 }))).toBe(100);
    const o = reduceRuleSet(100, [R({ ruleId: 'F', type: 'flat', value: 500 }), R({ ruleId: 'G', type: 'flat', value: 50, stackable: true })]);
    expect(o.finalAmount).toBe(0);
  });
  it('7. tie-breaking is deterministic: brand > platform > ruleId', () => {
    const rules = [
      R({ ruleId: 'Z-PLAT', scope: 'platform', type: 'flat', value: 100 }),
      R({ ruleId: 'B-BRAND', scope: 'brand', type: 'flat', value: 100 }),
      R({ ruleId: 'A-PLAT', scope: 'platform', type: 'flat', value: 100 }),
    ];
    expect(reduceRuleSet(1000, rules).steps[0].rule.ruleId).toBe('B-BRAND');
    expect(reduceRuleSet(1000, [...rules].reverse()).steps[0].rule.ruleId).toBe('B-BRAND');
    expect(reduceRuleSet(1000, rules.slice(0, 1).concat(rules.slice(2))).steps[0].rule.ruleId).toBe('A-PLAT');
  });
  it('8. brand matching ignores case', () => {
    const res = evaluateCart([I('a', 'NATURA CASA', 'P', 1000)], [R({ ruleId: 'R', appliesTo: 'natura casa', value: 10 })]);
    expect(res.items[0].outcome.finalAmount).toBe(900);
  });
  it('9. platform matching ignores whitespace', () => {
    const res = evaluateCart([I('a', 'B', '  amazon   india ', 1000)], [R({ ruleId: 'R', scope: 'platform', appliesTo: 'Amazon India', value: 10 })]);
    expect(res.items[0].outcome.finalAmount).toBe(900);
  });
  it('10. multiple cart rules use the same reducer (best non-stackable + stackables)', () => {
    const res = evaluateCart([I('a', 'X', 'P', 10000)], [
      R({ ruleId: 'C1', scope: 'cart', appliesTo: null, value: 5, minCartValue: 1000 }),
      R({ ruleId: 'C2', scope: 'cart', appliesTo: null, value: 10, minCartValue: 5000 }),
      R({ ruleId: 'C3', scope: 'cart', appliesTo: null, type: 'flat', value: 100, stackable: true, minCartValue: 1000 }),
      R({ ruleId: 'C4', scope: 'cart', appliesTo: null, value: 50, minCartValue: 50000 }),
    ]);
    expect(res.cartOutcome?.steps.map(s => s.rule.ruleId)).toEqual(['C2', 'C3']);
    expect(res.finalTotal).toBe(8900);
    expect(res.cartIneligible.map(r => r.ruleId)).toEqual(['C4']);
  });
  it('stackables: percentage before flat', () => {
    const o = reduceRuleSet(1000, [
      R({ ruleId: 'A-FLAT', type: 'flat', value: 100, stackable: true }),
      R({ ruleId: 'B-PCT', value: 10, stackable: true }),
    ]);
    expect(o.steps.map(s => s.rule.ruleId)).toEqual(['B-PCT', 'A-FLAT']);
    expect(o.finalAmount).toBe(800);
  });
  it('empty cart / empty rules are safe', () => {
    expect(evaluateCart([], goldenRules).finalTotal).toBe(0);
    expect(evaluateCart(goldenItems, []).finalTotal).toBe(6594);
  });
});

describe('rule schema', () => {
  const base = { ruleId: 'X', scope: 'brand', appliesTo: 'B', type: 'percentage', value: 10 };
  it('rejects percentage > 100', () => expect(DiscountRuleSchema.safeParse({ ...base, value: 101 }).success).toBe(false));
  it('rejects negative and zero values', () => {
    expect(DiscountRuleSchema.safeParse({ ...base, value: -5 }).success).toBe(false);
    expect(DiscountRuleSchema.safeParse({ ...base, value: 0 }).success).toBe(false);
  });
  it('requires appliesTo for brand/platform and minCartValue for cart', () => {
    expect(DiscountRuleSchema.safeParse({ ...base, appliesTo: null }).success).toBe(false);
    expect(DiscountRuleSchema.safeParse({ ...base, scope: 'cart', appliesTo: null }).success).toBe(false);
    expect(DiscountRuleSchema.safeParse({ ...base, scope: 'cart', appliesTo: null, minCartValue: 100 }).success).toBe(true);
  });
  it('defaults stackable to false', () => expect(DiscountRuleSchema.parse(base).stackable).toBe(false));
});

describe('rule impact uses the real engine', () => {
  it('changing RULE-04 from 10% to 20% changes cart discount and savings', () => {
    const edited = goldenRules.map(r => (r.ruleId === 'RULE-04' ? { ...r, value: 20 } : r));
    const imp = computeImpact(goldenItems, goldenRules, edited);
    expect(imp.before.finalTotal).toBe(5339);
    expect(imp.cartDiscountBefore).toBe(593);
    expect(imp.cartDiscountAfter).toBe(1186);
    expect(imp.after.finalTotal).toBe(4746);
    expect(imp.customerSavingsChange).toBe(593);
    expect(imp.affected).toHaveLength(0); // cart-level change: no item price changes
  });
  it('editing an item-level rule lists affected products', () => {
    const edited = goldenRules.map(r => (r.ruleId === 'RULE-03' ? { ...r, value: 20 } : r));
    const imp = computeImpact(goldenItems, goldenRules, edited);
    expect(imp.affected.map(a => a.item.itemId)).toEqual(['ITEM-02', 'ITEM-06']);
    expect(imp.customerSavingsChange).toBeGreaterThan(0);
  });
});
