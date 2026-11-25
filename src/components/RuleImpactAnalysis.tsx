import { describeRule } from '../core/explain';
import type { Impact } from '../core/impact';
import type { DiscountRule } from '../core/types';
import { formatINR } from '../utils/currency';

const ruleText = (r: DiscountRule | undefined) => (r ? `${describeRule(r)}${r.appliesTo ? ` ${r.appliesTo}` : ''}${r.minCartValue != null ? ` (min ${formatINR(r.minCartValue)})` : ''}${r.stackable ? ', stackable' : ''}` : '— (new rule)');

export default function RuleImpactAnalysis({ impact, previous, updated }: { impact: Impact; previous?: DiscountRule; updated: DiscountRule }) {
  const diff = impact.customerSavingsChange;
  return (
    <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm" data-testid="impact">
      <h4 className="mb-2 font-semibold text-navy-900">Rule impact analysis</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><p className="text-xs text-slate-500">Previous rule</p><p className="font-medium">{ruleText(previous)}</p></div>
        <div><p className="text-xs text-slate-500">Updated rule</p><p className="font-medium">{ruleText(updated)}</p></div>
        <div><p className="text-xs text-slate-500">Previous final cart price</p><p className="font-medium">{formatINR(impact.before.finalTotal)}</p></div>
        <div><p className="text-xs text-slate-500">New final cart price</p><p className="font-medium">{formatINR(impact.after.finalTotal)}</p></div>
      </div>
      <p className={`mt-3 font-semibold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-600' : 'text-slate-600'}`}>
        {diff === 0 ? 'No change in customer savings.' : `Customer savings ${diff > 0 ? 'increase' : 'decrease'} by ${formatINR(Math.abs(diff))}.`}
      </p>
      {impact.cartDiscountBefore !== impact.cartDiscountAfter && <p className="text-xs text-slate-600">Cart discount: {formatINR(impact.cartDiscountBefore)} → {formatINR(impact.cartDiscountAfter)}</p>}
      <div className="mt-2">
        <p className="text-xs text-slate-500">Products affected ({impact.affected.length})</p>
        {impact.affected.length === 0 ? <p className="text-slate-600">No item price changes{impact.cartDiscountBefore !== impact.cartDiscountAfter ? ' (cart-level change only)' : ''}.</p> : (
          <ul className="mt-1 space-y-0.5">{impact.affected.map(a => <li key={a.item.itemId}>{a.item.product}: {formatINR(a.beforeFinal)} → <b>{formatINR(a.afterFinal)}</b></li>)}</ul>
        )}
      </div>
    </div>
  );
}
