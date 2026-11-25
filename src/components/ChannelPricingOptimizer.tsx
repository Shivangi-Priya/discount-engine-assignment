import { useMemo, useState } from 'react';
import { ArrowRightLeft, TrendingUp } from 'lucide-react';
import type { ItemResult } from '../core/types';
import { optimizeChannelPrice, type PriceOptimization } from '../core/channelPricing';
import { formatINR } from '../utils/currency';

interface Props { items: ItemResult[]; }
const numberValue = (value: string, fallback: number) => value.trim() === '' ? fallback : Number(value);

export default function ChannelPricingOptimizer({ items }: Props) {
  const [itemId, setItemId] = useState('');
  const selected = items.find(x => x.item.itemId === itemId) ?? items[0];
  const [cost, setCost] = useState('700');
  const [minPrice, setMinPrice] = useState('800');
  const [maxPrice, setMaxPrice] = useState('1100');
  const [threshold, setThreshold] = useState('999');
  const [rate, setRate] = useState('10');
  const [belowRate, setBelowRate] = useState('0');
  const [otherFees, setOtherFees] = useState('0');

  const result = useMemo<{ value: PriceOptimization | null; error: string | null }>(() => {
    if (!selected) return { value: null, error: null };
    try {
      const value = optimizeChannelPrice({
        currentPrice: selected.outcome.finalAmount,
        productCost: numberValue(cost, 0),
        minPrice: numberValue(minPrice, 0),
        maxPrice: numberValue(maxPrice, 0),
        policy: {
          channel: selected.item.platform,
          threshold: numberValue(threshold, 0),
          rateAboveThreshold: numberValue(rate, 0),
          rateAtOrBelowThreshold: numberValue(belowRate, 0),
          otherVariableFees: numberValue(otherFees, 0),
        },
      });
      return { value, error: null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Could not optimize this price range.' };
    }
  }, [selected, cost, minPrice, maxPrice, threshold, rate, belowRate, otherFees]);

  const field = (label: string, value: string, set: (v: string) => void, min = '0') => (
    <label className="block"><span className="label">{label}</span>
      <input className="input" type="number" min={min} step="1" value={value} onChange={e => set(e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Compare whole-rupee prices and choose the price with the highest estimated profit per unit after the configured channel commission and other fees. Commission rules are editable assumptions, not live marketplace rates.</p>
      {!items.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Upload a cart or load sample data to optimize a product.</p> : <>
        <label className="block"><span className="label">Product / channel</span>
          <select className="input" value={selected?.item.itemId ?? ''} onChange={e => setItemId(e.target.value)}>
            {items.map(x => <option key={x.item.itemId} value={x.item.itemId}>{x.item.product} · {x.item.platform} · {formatINR(x.outcome.finalAmount)}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {field('Product cost (₹)', cost, setCost)}
          {field('Minimum selling price (₹)', minPrice, setMinPrice, '1')}
          {field('Maximum selling price (₹)', maxPrice, setMaxPrice, '1')}
          {field('Commission threshold (₹)', threshold, setThreshold)}
          {field('Commission above threshold (%)', rate, setRate)}
          {field('Commission at/below threshold (%)', belowRate, setBelowRate)}
          {field('Other fees per unit (₹)', otherFees, setOtherFees)}
        </div>
        {result.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{result.error}</p>}
        {result.value && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-navy-900"><TrendingUp className="h-5 w-5 text-emerald-600" /> Recommended channel price</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Recommended selling price</p><p className="text-2xl font-bold text-emerald-700">{formatINR(result.value.recommended.sellingPrice)}</p></div>
            <div><p className="text-xs text-slate-500">Estimated profit / unit</p><p className="text-2xl font-bold">{formatINR(result.value.recommended.profit)}</p></div>
            <div><p className="text-xs text-slate-500">Commission at recommended price</p><p className="text-2xl font-bold">{formatINR(result.value.recommended.commission)}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-200 pt-3 text-sm">
            <span>Current cart price profit: <b>{formatINR(result.value.current.profit)}</b></span>
            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
            <span>Profit difference: <b className={result.value.additionalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}>{result.value.additionalProfit >= 0 ? '+' : ''}{formatINR(result.value.additionalProfit)}</b></span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Optimization uses the selected product's current post-discount price as the comparison price. It does not predict demand, conversion or total sales volume.</p>
        </div>}
      </>}
    </div>
  );
}
