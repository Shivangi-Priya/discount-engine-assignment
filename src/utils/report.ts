import Papa from 'papaparse';
import { describeRule, explainCartLines, explainDecisionLines } from '../core/explain';
import type { CartResult, DiscountRule } from '../core/types';
import { formatINR } from './currency';

export const REPORT_TITLE = 'OPPTRA DISCOUNT ENGINE - PRICING REPORT';

export interface ReportData {
  title: string;
  generatedAt: string;
  ruleCount: number;
  itemCount: number;
  rules: DiscountRule[];
  result: CartResult;
  itemRows: {
    itemId: string; product: string; brand: string; platform: string; basePrice: number;
    matching: string; winning: string; rejected: string; stacked: string; totalDiscount: number; finalPrice: number;
    explanation: string[];
  }[];
  cartLines: string[];
}

const ids = (rs: { ruleId: string }[]) => (rs.length ? rs.map(r => r.ruleId).join(', ') : 'None');

/** Always built from an evaluateCart() result computed from the latest rules and cart. */
export function buildReport(result: CartResult, rules: DiscountRule[], now: Date = new Date()): ReportData {
  return {
    title: REPORT_TITLE,
    generatedAt: now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }),
    ruleCount: rules.length, itemCount: result.items.length, rules, result,
    itemRows: result.items.map(r => {
      const winner = r.outcome.steps.find(s => s.role === 'winner');
      return {
        itemId: r.item.itemId, product: r.item.product, brand: r.item.brand, platform: r.item.platform, basePrice: r.item.basePrice,
        matching: ids(r.matchedRules),
        winning: winner ? `${winner.rule.ruleId} (${describeRule(winner.rule)}, saves ${formatINR(winner.saving)})` : 'None',
        rejected: r.outcome.rejected.length ? r.outcome.rejected.map(x => `${x.rule.ruleId} (would save ${formatINR(x.potentialSaving)})`).join('; ') : 'None',
        stacked: r.outcome.steps.filter(s => s.role === 'stacked').map(s => `${s.rule.ruleId} (-${formatINR(s.saving)})`).join('; ') || 'None',
        totalDiscount: r.item.basePrice - r.outcome.finalAmount, finalPrice: r.outcome.finalAmount,
        explanation: explainDecisionLines(r),
      };
    }),
    cartLines: explainCartLines(result),
  };
}

const cartRuleLabel = (d: ReportData) =>
  d.result.cartOutcome ? d.result.cartOutcome.steps.map(s => `${s.rule.ruleId} (${describeRule(s.rule)})`).join(' + ') : 'None applied';

export function reportToCsv(d: ReportData): string {
  const rows: (string | number)[][] = [
    [d.title], [],
    ['A. REPORT INFORMATION'], ['Generated', d.generatedAt], ['Active rules', d.ruleCount], ['Cart items', d.itemCount], [],
    ['B. ACTIVE DISCOUNT RULES'], ['Rule ID', 'Scope', 'Applies To', 'Type', 'Value', 'Stackable', 'Minimum Cart Value'],
    ...d.rules.map(r => [r.ruleId, r.scope, r.appliesTo ?? '', r.type, r.value, r.stackable ? 'Yes' : 'No', r.minCartValue ?? '']), [],
    ['C. ITEM PRICING BREAKDOWN'],
    ['Item ID', 'Product', 'Brand', 'Platform', 'Base Price', 'Matching Rules', 'Winning Rule', 'Rejected Rules', 'Stackable Discounts', 'Total Discount', 'Final Price'],
    ...d.itemRows.map(i => [i.itemId, i.product, i.brand, i.platform, i.basePrice, i.matching, i.winning, i.rejected, i.stacked, i.totalDiscount, i.finalPrice]), [],
    ['D. CART SUMMARY'],
    ['Original cart total', d.result.baseTotal], ['Item-level discounts', d.result.itemDiscount], ['Cart subtotal (after item discounts)', d.result.subtotal],
    ['Cart discount rule', cartRuleLabel(d)], ['Cart discount amount', d.result.cartDiscount],
    ['Total savings', d.result.totalSavings], ['Final payable amount', d.result.finalTotal], [],
    ['E. DECISION EXPLANATION'],
    ...d.itemRows.flatMap(i => i.explanation.map(line => [`${i.itemId} ${i.product}`, line])),
    ...d.cartLines.map(l => ['Cart', l]),
  ];
  return '\uFEFF' + Papa.unparse(rows as unknown[][]);
}

const esc = (s: string | number) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function reportToHtml(d: ReportData): string {
  const th = (cols: string[]) => `<tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const td = (cells: (string | number)[], right: number[] = []) => `<tr>${cells.map((c, i) => `<td${right.includes(i) ? ' class="r"' : ''}>${esc(c)}</td>`).join('')}</tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.title)}</title><style>
body{font:13px/1.45 Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:32px}
h1{font-size:20px;color:#0b1a3a;border-bottom:3px solid #f97316;padding-bottom:8px}h2{font-size:14px;color:#0b1a3a;margin:22px 0 8px}
table{border-collapse:collapse;width:100%;margin-bottom:6px}th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}
th{background:#eef2f9}td.r{text-align:right}.tot td{font-weight:700}.fin td{background:#e8f7ee;font-weight:700}ul{margin:4px 0 10px 18px;padding:0}
@media print{body{margin:12mm}}</style></head><body>
<h1>${esc(d.title)}</h1>
<h2>A. Report Information</h2><table>${td(['Generated', d.generatedAt])}${td(['Active rules', d.ruleCount])}${td(['Cart items', d.itemCount])}</table>
<h2>B. Active Discount Rules</h2><table>${th(['Rule ID', 'Scope', 'Applies To', 'Type', 'Value', 'Stackable', 'Min Cart Value'])}
${d.rules.map(r => td([r.ruleId, r.scope, r.appliesTo ?? '-', r.type, r.value, r.stackable ? 'Yes' : 'No', r.minCartValue ?? '-'])).join('')}</table>
<h2>C. Item Pricing Breakdown</h2><table>${th(['Product', 'Brand', 'Platform', 'Base', 'Matching', 'Winning', 'Rejected', 'Stackable', 'Discount', 'Final'])}
${d.itemRows.map(i => td([i.product, i.brand, i.platform, formatINR(i.basePrice), i.matching, i.winning, i.rejected, i.stacked, formatINR(i.totalDiscount), formatINR(i.finalPrice)], [3, 8, 9])).join('')}</table>
<h2>D. Cart Summary</h2><table>
${td(['Original cart total', formatINR(d.result.baseTotal)], [1])}${td(['Item-level discounts', '-' + formatINR(d.result.itemDiscount)], [1])}
${td(['Cart subtotal', formatINR(d.result.subtotal)], [1])}${td(['Cart discount rule', cartRuleLabel(d)])}${td(['Cart discount amount', '-' + formatINR(d.result.cartDiscount)], [1])}
<tr class="tot">${'<td>Total savings</td><td class="r">' + formatINR(d.result.totalSavings) + '</td>'}</tr>
<tr class="fin"><td>Final payable amount</td><td class="r">${formatINR(d.result.finalTotal)}</td></tr></table>
<h2>E. Decision Explanation</h2>
${d.itemRows.map(i => `<p><b>${esc(i.product)}</b> (${esc(i.itemId)})</p><ul>${i.explanation.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}
<p><b>Cart</b></p><ul>${d.cartLines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
</body></html>`;
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the printable report in a hidden iframe and calls print (Save as PDF). Returns false if blocked. */
export function printHtml(html: string): boolean {
  try {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const doc = f.contentDocument;
    if (!doc || !f.contentWindow) return false;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 2000); }, 250);
    return true;
  } catch { return false; }
}
