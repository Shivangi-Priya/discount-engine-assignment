import { describe, expect, it } from 'vitest';
import { evaluateCart } from '../src/core/engine';
import { buildReport, reportToCsv, reportToHtml } from '../src/utils/report';
import { goldenItems, goldenRules } from './fixtures';

describe('report', () => {
  const d = buildReport(evaluateCart(goldenItems, goldenRules), goldenRules, new Date('2026-01-01T10:00:00'));
  it('uses the real engine result', () => {
    expect(d.itemRows.map(r => r.finalPrice)).toEqual([1104, 629, 509, 2499, 382, 809]);
    expect(d.result.finalTotal).toBe(5339);
    expect(d.itemRows[0].winning).toContain('RULE-01');
    expect(d.itemRows[0].rejected).toContain('RULE-02');
    expect(d.itemRows[1].stacked).toContain('RULE-03');
  });
  it('CSV has all five sections and golden totals', () => {
    const csv = reportToCsv(d);
    for (const s of ['A. REPORT INFORMATION', 'B. ACTIVE DISCOUNT RULES', 'C. ITEM PRICING BREAKDOWN', 'D. CART SUMMARY', 'E. DECISION EXPLANATION']) expect(csv).toContain(s);
    expect(csv).toContain('OPPTRA DISCOUNT ENGINE - PRICING REPORT');
    expect(csv).toContain('Final payable amount,5339');
    expect(csv).toContain('RULE-02 rejected');
  });
  it('changes with the rules (never stale)', () => {
    const d2 = buildReport(evaluateCart(goldenItems, goldenRules.filter(r => r.ruleId !== 'RULE-04')), goldenRules.slice(0, 3));
    expect(d2.result.finalTotal).toBe(5932);
    expect(d2.ruleCount).toBe(3);
    expect(reportToCsv(d2)).toContain('Final payable amount,5932');
  });
  it('HTML is printable and escapes content', () => {
    const html = reportToHtml(d);
    expect(html).toContain('Rs.5,339');
    expect(html).toContain('@media print');
    expect(reportToHtml({ ...d, itemRows: [{ ...d.itemRows[0], product: '<b>x</b>' }] })).not.toContain('<b>x</b>');
  });
});
