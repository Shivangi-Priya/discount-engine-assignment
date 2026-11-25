import { DiscountRuleSchema, type CartItem, type DiscountRule } from '../src/core/types';

export const R = (o: Partial<Record<keyof DiscountRule, unknown>> & { ruleId: string }): DiscountRule =>
  DiscountRuleSchema.parse({ scope: 'brand', appliesTo: 'X', type: 'percentage', value: 10, ...o });
export const I = (itemId: string, brand: string, platform: string, basePrice: number): CartItem =>
  ({ itemId, product: itemId, brand, platform, basePrice });

// ---- Official Opptra assignment data ----
export const goldenRules = [
  R({ ruleId: 'RULE-01', scope: 'platform', appliesTo: 'Amazon India', value: 15 }),
  R({ ruleId: 'RULE-02', scope: 'brand', appliesTo: 'Natura Casa', type: 'flat', value: 150 }),
  R({ ruleId: 'RULE-03', scope: 'platform', appliesTo: 'Flipkart', value: 10, stackable: true }),
  R({ ruleId: 'RULE-04', scope: 'cart', appliesTo: null, value: 10, minCartValue: 4000 }),
];
export const goldenItems = [
  I('ITEM-01', 'Natura Casa', 'Amazon India', 1299), I('ITEM-02', 'Natura Casa', 'Flipkart', 849),
  I('ITEM-03', 'LivSpace Pro', 'Amazon India', 599), I('ITEM-04', 'LivSpace Pro', 'Noon', 2499),
  I('ITEM-05', 'Nordic Basics', 'Amazon India', 449), I('ITEM-06', 'Nordic Basics', 'Flipkart', 899),
];

