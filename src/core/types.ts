import type { z } from 'zod';
import type { CartItemSchema, DiscountRuleSchema } from './schemas';

export { CartItemSchema, DiscountRuleSchema } from './schemas';
export type DiscountRule = z.infer<typeof DiscountRuleSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;

/** One applied discount (engine output; no prose inside the engine). */
export interface Step { rule: DiscountRule; saving: number; priceBefore: number; priceAfter: number; role: 'winner' | 'stacked'; }
export interface Rejected { rule: DiscountRule; potentialSaving: number; }
export interface RuleSetOutcome { finalAmount: number; steps: Step[]; rejected: Rejected[]; }
export type ItemStatus = 'max_discount' | 'stacked' | 'discount_applied' | 'no_offer';

export interface ItemResult {
  item: CartItem;
  matchedRules: DiscountRule[];
  outcome: RuleSetOutcome;
  status: ItemStatus;
  reasoning: string; // filled by explain()
}

export interface CartResult {
  items: ItemResult[];
  baseTotal: number;          // sum of base prices
  subtotal: number;           // sum of final item prices
  itemDiscount: number;       // baseTotal - subtotal
  cartOutcome: RuleSetOutcome | null; // null if no cart rule qualified
  cartIneligible: DiscountRule[];     // cart rules whose threshold was not met
  cartOfferText: string | null;
  cartDiscount: number;       // subtotal - finalTotal
  finalTotal: number;
  totalSavings: number;       // baseTotal - finalTotal
}
