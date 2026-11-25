import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCartFromItems, type TextItem } from '../src/adapters/pdfCartAdapter';
import { csvRuleAdapter } from '../src/adapters/csvRuleAdapter';
import { evaluateCart } from '../src/core/engine';

async function pagesOf(path: string): Promise<TextItem[][]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), useSystemFonts: true }).promise;
  const pages: TextItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push(tc.items.filter((i: any) => 'str' in i).map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
  }
  return pages;
}

describe('PDF cart', () => {
  it('real sample PDF -> 6 items -> golden final 5,339', async () => {
    const cart = parseCartFromItems(await pagesOf('sample-data/cart.pdf'));
    const rules = await csvRuleAdapter.ingest(readFileSync('sample-data/rules.csv', 'utf8'), new Set());
    expect(cart.status).toBe('success');
    if (cart.status !== 'success' || rules.status !== 'success') throw new Error('setup');
    expect(cart.data).toHaveLength(6);
    expect(cart.data[0]).toMatchObject({ product: 'Cushion Cover', brand: 'Natura Casa', platform: 'Amazon India', basePrice: 1299 });
    expect(evaluateCart(cart.data, rules.data).finalTotal).toBe(5339);
  });
  const T = (str: string, x: number, y: number): TextItem => ({ str, x, y });
  const header = [T('Product', 50, 700), T('Brand', 200, 700), T('Platform', 320, 700), T('Base Price', 450, 700)];
  it('malformed row is skipped with a row error; valid rows still load', () => {
    const r = parseCartFromItems([[...header, T('Order #1', 50, 760), T('Chair', 50, 670), T('Acme', 200, 670), T('Noon', 320, 670), T('Rs.1,000', 450, 670),
      T('Desk', 50, 640), T('Acme', 200, 640), T('Noon', 320, 640), T('N/A', 450, 640)]]);
    expect(r.status).toBe('success');
    if (r.status === 'success') { expect(r.data).toHaveLength(1); expect(r.report?.issues[0]).toMatchObject({ row: 2 }); expect(r.report?.issues[0].reason).toMatch(/N\/A/); }
  });
  it('no header / image-only PDFs give a clear unsupported message', () => {
    const a = parseCartFromItems([[T('Hello', 10, 10)]]);
    expect(a).toMatchObject({ status: 'error' });
    if (a.status === 'error') expect(a.message).toMatch(/Scanned or image-only/);
    const b = parseCartFromItems([[]]);
    if (b.status === 'error') expect(b.message).toMatch(/scanned or image-only/i);
  });
  it('header but zero valid rows -> error, cart untouched', () => {
    const r = parseCartFromItems([[...header, T('x', 50, 670), T('y', 200, 670), T('z', 320, 670), T('bad', 450, 670)]]);
    expect(r.status).toBe('error');
  });
});
