import { evaluateCart } from './engine';
import type { CartItem, CartResult, DiscountRule } from './types';

export interface AffectedItem { item: CartItem; beforeFinal: number; afterFinal: number; delta: number; }
export interface Impact {
  before: CartResult;
  after: CartResult;
  /** Positive = customer saves more than before. */
  customerSavingsChange: number;
  finalPriceChange: number;
  affected: AffectedItem[];
  cartDiscountBefore: number;
  cartDiscountAfter: number;
}

/** Compares two rule sets with the real engine. Never uses hardcoded numbers. */
export function computeImpact(items: CartItem[], before: DiscountRule[], after: DiscountRule[]): Impact {
  const b = evaluateCart(items, before);
  const a = evaluateCart(items, after);
  const affected = items
    .map((item, i) => ({
      item, beforeFinal: b.items[i].outcome.finalAmount, afterFinal: a.items[i].outcome.finalAmount,
      delta: b.items[i].outcome.finalAmount - a.items[i].outcome.finalAmount,
    }))
    .filter(x => x.beforeFinal !== x.afterFinal);
  return {
    before: b, after: a, affected,
    customerSavingsChange: a.totalSavings - b.totalSavings,
    finalPriceChange: a.finalTotal - b.finalTotal,
    cartDiscountBefore: b.cartDiscount, cartDiscountAfter: a.cartDiscount,
  };
}
