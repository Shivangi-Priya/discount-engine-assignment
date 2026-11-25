import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CartResult, DiscountRule } from '../core/types';
import { formatINR } from '../utils/currency';

function statusOf(rule: DiscountRule, res: CartResult): { label: string; cls: string } {
  if (!res.items.length) return { label: 'Active', cls: 'bg-slate-100 text-slate-600' };
  const used = res.items.filter(i => i.outcome.steps.some(s => s.rule.ruleId === rule.ruleId)).length
    + (res.cartOutcome?.steps.some(s => s.rule.ruleId === rule.ruleId) ? 1 : 0);
  if (used) return { label: rule.scope === 'cart' ? 'Applied to cart' : `Applied · ${used} item${used > 1 ? 's' : ''}`, cls: 'bg-emerald-50 text-emerald-700' };
  if (rule.scope === 'cart') return { label: 'Below threshold', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Not used', cls: 'bg-slate-100 text-slate-600' };
}

interface Props { rules: DiscountRule[]; result: CartResult; onEdit: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void; }
export default function ActiveRulesPanel({ rules, result, onEdit, onDelete, onAdd }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-2 flex justify-end"><button className="btn-ghost" onClick={onAdd}><Plus className="h-4 w-4" />Add manually</button></div>
      {!rules.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No active rules. Upload a rules CSV, describe a rule in plain English, or add one manually. Without rules every item stays at its base price.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead><tr>{['Rule ID', 'Scope', 'Applies To', 'Type', 'Value', 'Stackable', 'Min Cart', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(r => { const st = statusOf(r, result); return (
                <tr key={r.ruleId}>
                  <td className="td font-medium text-navy-900">{r.ruleId}</td>
                  <td className="td capitalize">{r.scope}</td>
                  <td className="td">{r.appliesTo ?? '—'}</td>
                  <td className="td capitalize">{r.type}</td>
                  <td className="td">{r.type === 'percentage' ? `${r.value}%` : formatINR(r.value)}</td>
                  <td className="td">{r.stackable ? 'Yes' : 'No'}</td>
                  <td className="td">{r.minCartValue != null ? formatINR(r.minCartValue) : '—'}</td>
                  <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn-ghost !px-2 !py-1" aria-label={`Edit ${r.ruleId}`} onClick={() => onEdit(r.ruleId)}><Pencil className="h-3.5 w-3.5" />Edit</button>{' '}
                    {confirming === r.ruleId
                      ? <><button className="btn-danger !px-2 !py-1" aria-label={`Confirm delete ${r.ruleId}`} onClick={() => { onDelete(r.ruleId); setConfirming(null); }}>Confirm delete</button>{' '}<button className="btn-ghost !px-2 !py-1" onClick={() => setConfirming(null)}>Keep</button></>
                      : <button className="btn-danger !px-2 !py-1" aria-label={`Delete ${r.ruleId}`} onClick={() => setConfirming(r.ruleId)}><Trash2 className="h-3.5 w-3.5" />Delete</button>}
                  </td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
