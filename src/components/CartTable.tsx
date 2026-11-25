import type { CartResult } from '../core/types';
import { formatINR } from '../utils/currency';

const STATUS = { max_discount: ['Applied', 'bg-emerald-50 text-emerald-700'], discount_applied: ['Applied', 'bg-emerald-50 text-emerald-700'], stacked: ['Stacked', 'bg-navy-50 text-navy-700'], no_offer: ['No Offer', 'bg-slate-100 text-slate-600'] } as const;

export default function CartTable({ result, generated }: { result: CartResult; generated: boolean }) {
  if (!result.items.length) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">The cart is empty. Upload a cart CSV/PDF or load the sample data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead><tr>{['Product', 'Brand', 'Platform', 'Base Price', 'Applied Rule', 'Discount', 'Final Price', 'Status'].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {result.items.map(r => {
            const rulesUsed = r.outcome.steps.map(s => s.rule.ruleId).join(' + ');
            const [label, cls] = STATUS[r.status];
            return (
              <tr key={r.item.itemId} className="align-top">
                <td className="td font-medium text-navy-900">{r.item.product}<div className="text-xs font-normal text-slate-400">{r.item.itemId}</div></td>
                <td className="td">{r.item.brand}</td><td className="td">{r.item.platform}</td>
                <td className="td">{formatINR(r.item.basePrice)}</td>
                {generated ? <>
                  <td className="td">{rulesUsed || '—'}<div className="max-w-xs text-xs text-slate-500">{r.reasoning}</div></td>
                  <td className="td text-emerald-700">{r.item.basePrice - r.outcome.finalAmount ? `-${formatINR(r.item.basePrice - r.outcome.finalAmount)}` : '—'}</td>
                  <td className="td font-semibold">{formatINR(r.outcome.finalAmount)}</td>
                  <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span></td>
                </> : <td className="td text-xs text-slate-400" colSpan={4}>Click “Generate Final Price” to calculate</td>}
              </tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}
