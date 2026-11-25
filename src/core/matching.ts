import type { CartItem, DiscountRule } from './types';

/** Case-insensitive, whitespace-insensitive comparison key. */
export const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Does an item-level (brand/platform) rule apply to this item? Cart rules never match an item. */
export const matches = (item: CartItem, r: DiscountRule): boolean =>
  r.scope === 'brand' ? norm(item.brand) === norm(r.appliesTo)
  : r.scope === 'platform' ? norm(item.platform) === norm(r.appliesTo)
  : false;
