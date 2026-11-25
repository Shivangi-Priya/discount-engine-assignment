import { CartItemSchema, type CartItem } from '../core/types';
import { parseCurrency } from '../utils/currency';
import type { AdapterResult, CartAdapter, ImportReport, RowIssue } from './contracts';

export interface TextItem { str: string; x: number; y: number; }
const Y_TOL = 4;
const HEADERS = ['product', 'brand', 'platform', 'base price'] as const;

const NO_HEADER_MSG =
  'Could not find a "Product | Brand | Platform | Base Price" table header. Scanned or image-only PDFs are not supported (no text layer). Export a text-based PDF or upload a CSV instead. Your current cart was kept.';

/** Group text items into rows by y (within tolerance), each row sorted by x. Top of page first. */
export function clusterRows(items: TextItem[]): TextItem[][] {
  const sorted = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y);
  const rows: TextItem[][] = [];
  for (const it of sorted) {
    const row = rows.find(r => Math.abs(r[0].y - it.y) <= Y_TOL);
    row ? row.push(it) : rows.push([it]);
  }
  return rows.map(r => r.sort((a, b) => a.x - b.x));
}

const rowText = (r: TextItem[]) => r.map(i => i.str).join(' ').toLowerCase().replace(/\s+/g, ' ');

/** Pure: text items from one or more pages -> cart. Testable without pdfjs. */
export function parseCartFromItems(pages: TextItem[][]): AdapterResult<CartItem[]> {
  const allText = pages.flat().map(i => i.str).join('').trim();
  if (!allText) return { status: 'error', message: 'This PDF has no extractable text (it looks scanned or image-only). Export a text-based PDF or upload a CSV. Your current cart was kept.' };
  const rows = pages.flatMap(clusterRows);
  const hIdx = rows.findIndex(r => HEADERS.every(h => rowText(r).includes(h)));
  if (hIdx < 0) return { status: 'error', message: NO_HEADER_MSG };

  const hdr = rows[hIdx];
  const startOf = (label: string) => hdr.find(i => i.str.trim().toLowerCase().startsWith(label.split(' ')[0]))?.x ?? 0;
  const cols = HEADERS.map(h => ({ key: h, x: startOf(h) })).sort((a, b) => a.x - b.x);
  const colOf = (x: number) => [...cols].reverse().find(c => x >= c.x - 3)?.key ?? cols[0].key;

  const data: CartItem[] = [];
  const issues: RowIssue[] = [];
  let n = 0;
  for (const row of rows.slice(hIdx + 1)) {
    const cells: Record<string, string[]> = { product: [], brand: [], platform: [], 'base price': [] };
    row.forEach(i => cells[colOf(i.x)].push(i.str.trim()));
    if (!Object.values(cells).some(c => c.length)) continue;
    n++;
    const raw = { product: cells.product.join(' '), brand: cells.brand.join(' '), platform: cells.platform.join(' '), base_price: cells['base price'].join('') };
    const price = parseCurrency(raw.base_price);
    if (price === null) { issues.push({ row: n, reason: `Base Price "${raw.base_price || 'missing'}" is not a number.`, raw }); continue; }
    const res = CartItemSchema.safeParse({ itemId: `ITEM-${String(data.length + 1).padStart(2, '0')}`, product: raw.product, brand: raw.brand, platform: raw.platform, basePrice: price });
    if (!res.success) issues.push({ row: n, reason: res.error.issues.map(i => i.message).join(' '), raw });
    else data.push(res.data);
  }
  const report: ImportReport = { source: 'Cart PDF', total: n, imported: data.length, failed: issues.length, issues };
  if (!data.length) return { status: 'error', message: 'The PDF table has no valid rows. Your current cart was kept.', report };
  return { status: 'success', data, report };
}

export const pdfCartAdapter: CartAdapter<File> = {
  id: 'pdf-cart',
  async ingest(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
      return { status: 'error', message: 'Please choose a PDF file (.pdf).' };
    if (!file.size) return { status: 'error', message: 'That PDF is empty (0 bytes).' };
    try {
      const pdfjs = await import('pdfjs-dist');
      const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages: TextItem[][] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const tc = await (await doc.getPage(p)).getTextContent();
        pages.push(tc.items.filter((i: any) => 'str' in i).map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
      }
      return parseCartFromItems(pages);
    } catch {
      return { status: 'error', message: 'Could not read that PDF; it may be corrupted, password-protected or scanned. Try a text-based PDF or a CSV. Your current cart was kept.' };
    }
  },
};
