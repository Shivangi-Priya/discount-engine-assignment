import { Receipt } from 'lucide-react';
import type { CartResult } from '../core/types';
import { formatINR } from '../utils/currency';

interface Props { result: CartResult; generated: boolean; generatedAt: string | null; onGenerate: () => void; }
export default function CheckoutSummary({ result, generated, generatedAt, onGenerate }: Props) {
  const row = (k: string, v: string, cls = '') => <div className={`flex justify-between py-1.5 text-sm ${cls}`}><dt>{k}</dt><dd className="font-medium">{v}</dd></div>;
  return (
    <div>
      <button className="btn-accent w-full !py-3 text-base tracking-wide" onClick={onGenerate}><Receipt className="h-5 w-5" />GENERATE FINAL PRICE</button>
      {!generated ? <p className="mt-3 text-sm text-slate-500">Load rules and a cart, then generate the final price. It refreshes automatically whenever rules or the cart change.</p> : (
        <dl className="mt-3 divide-y divide-slate-100" data-testid="summary">
          {row('Original cart total', formatINR(result.baseTotal))}
          {row('Item-level discounts', `-${formatINR(result.itemDiscount)}`, 'text-emerald-700')}
          {result.cartOutcome && result.cartOfferText
            ? <div className="py-1.5 text-sm text-emerald-700"><div className="flex justify-between"><dt>Cart-level discount</dt><dd className="font-medium">-{formatINR(result.cartDiscount)}</dd></div><p className="text-xs text-slate-500">{result.cartOfferText}</p></div>
            : result.cartIneligible.length > 0 ? <div className="py-1.5 text-xs text-amber-700">Cart offer {result.cartIneligible.map(r => r.ruleId).join(', ')} not applied: cart {formatINR(result.subtotal)} is below the minimum.</div> : null}
          {row('Total savings', formatINR(result.totalSavings), 'text-emerald-700')}
          <div className="flex items-center justify-between pt-3"><dt className="font-semibold text-navy-900">Final payable price</dt><dd className="text-2xl font-bold text-navy-900" data-testid="final-total">{formatINR(result.finalTotal)}</dd></div>
          {generatedAt && <p className="pt-2 text-xs text-slate-400">Last generated {generatedAt}</p>}
        </dl>
      )}
    </div>
  );
}
