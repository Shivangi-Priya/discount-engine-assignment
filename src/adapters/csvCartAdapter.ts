import { CartItemSchema, type CartItem } from '../core/types';
import { parseCurrency } from '../utils/currency';
import type { AdapterResult, CartAdapter, ImportReport, RowIssue } from './contracts';
import { blank, EXTRA_COLS_MSG, parseCsvWithAliases } from './csvCommon';

export const CART_ALIASES: Record<string, string[]> = {
  item_id: ['itemid', 'id', 'sku', 'item_no', 'item'],
  product: ['product_name', 'name', 'title', 'item_name'],
  brand: ['brand_name', 'manufacturer'],
  platform: ['marketplace', 'channel', 'store', 'platform_name', 'seller'],
  base_price: ['baseprice', 'price', 'mrp', 'unit_price', 'amount', 'list_price'],
};
export const CART_REQUIRED = ['product', 'brand', 'platform', 'base_price'];

export const csvCartAdapter: CartAdapter<string> = {
  id: 'csv-cart',
  async ingest(text) {
    if (!text || !text.trim()) return { status: 'error', message: 'The cart file is empty. Add a header row and at least one item, or download the sample CSV.' };
    const csv = parseCsvWithAliases(text, CART_ALIASES, CART_REQUIRED);
    if (csv.missing.length)
      return { status: 'error', message: `Cart CSV is missing required column(s): ${csv.missing.join(', ')}. Found: ${csv.headers.join(', ') || 'none'}. Expected: item_id,product,brand,platform,base_price.` };
    if (!csv.rows.length) return { status: 'error', message: 'Cart CSV has a header but no data rows.' };

    const data: CartItem[] = [];
    const issues: RowIssue[] = [];
    const seen = new Set<string>();
    for (const { rowNumber, cells, raw, extra } of csv.rows) {
      const reasons: string[] = [];
      if (extra) reasons.push(EXTRA_COLS_MSG);
      const price = blank(cells.base_price) ? undefined : parseCurrency(cells.base_price);
      if (!blank(cells.base_price) && price === null) reasons.push(`base_price "${cells.base_price}" is not a valid amount (use e.g. 1299, Rs.1,299 or ₹1,299).`);
      const itemId = blank(cells.item_id) ? `ITEM-${String(rowNumber - 1).padStart(2, '0')}` : cells.item_id.trim();
      const res = CartItemSchema.safeParse({ itemId, product: cells.product ?? '', brand: cells.brand ?? '', platform: cells.platform ?? '', basePrice: price === null ? undefined : price });
      if (!res.success) reasons.push(...res.error.issues.filter(i => !(price === null && i.path[0] === 'basePrice')).map(i => i.message));
      else if (seen.has(res.data.itemId)) reasons.push(`Duplicate item_id "${res.data.itemId}" in this file.`);
      if (reasons.length || !res.success) issues.push({ row: rowNumber, reason: reasons.join(' '), raw });
      else { seen.add(res.data.itemId); data.push(res.data); }
    }

    const report: ImportReport = { source: 'Cart CSV', total: csv.rows.length, imported: data.length, failed: issues.length, issues };
    if (!data.length) return { status: 'error', message: `No valid cart rows: all ${issues.length} row(s) failed. Your current cart was kept. See the row errors below.`, report };
    return { status: 'success', data, report } satisfies AdapterResult<CartItem[]>;
  },
};
