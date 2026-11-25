import { FileBarChart, Receipt, Save, X } from 'lucide-react';
import type { Engine } from '../hooks/useDiscountEngine';
import RuleImpactAnalysis from './RuleImpactAnalysis';

const TITLES = { edit: 'Edit rule', add: 'Add rule manually', ai: 'Review the locally parsed rule' } as const;

export default function RuleEditor({ e }: { e: Engine }) {
  const ed = e.editor!;
  const f = ed.form;
  const issues = e.draft && !e.draft.success ? e.draft.error.issues : [];
  const previous = e.rules.find(r => r.ruleId === ed.originalId);
  const valid = !!e.draft?.success && !e.idConflict;
  return (
    <div className="rounded-2xl border-2 border-accent-500/60 bg-accent-50/40 p-5" aria-label="Rule editor" data-testid="rule-editor">
      <h3 className="mb-1 text-base font-semibold text-navy-900">{TITLES[ed.mode]}</h3>
      {ed.mode === 'ai' && <p className="mb-3 text-xs text-slate-600">AI proposals are drafts. Check <b>Stackable</b> especially, then confirm. Prices are always computed by the pricing engine, never by the model.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className="label" htmlFor="re-id">Rule ID</label><input id="re-id" className="input" value={f.ruleId} onChange={ev => e.updateForm({ ruleId: ev.target.value })} /></div>
        <div><label className="label" htmlFor="re-scope">Scope</label>
          <select id="re-scope" className="input" value={f.scope} onChange={ev => e.updateForm({ scope: ev.target.value as typeof f.scope })}>
            <option value="platform">Platform</option><option value="brand">Brand</option><option value="cart">Cart</option></select></div>
        {f.scope !== 'cart' && <div><label className="label" htmlFor="re-applies">Applies To</label><input id="re-applies" className="input" value={f.appliesTo} onChange={ev => e.updateForm({ appliesTo: ev.target.value })} placeholder={f.scope === 'brand' ? 'Brand name' : 'Platform name'} /></div>}
        <div><label className="label" htmlFor="re-type">Discount Type</label>
          <select id="re-type" className="input" value={f.type} onChange={ev => e.updateForm({ type: ev.target.value as typeof f.type })}>
            <option value="percentage">Percentage (%)</option><option value="flat">Flat (Rs.)</option></select></div>
        <div><label className="label" htmlFor="re-value">Discount Value</label><input id="re-value" type="number" min="0" className="input" value={f.value} onChange={ev => e.updateForm({ value: ev.target.value })} /></div>
        {f.scope === 'cart' && <div><label className="label" htmlFor="re-min">Minimum Cart Value (Rs.)</label><input id="re-min" type="number" min="0" className="input" value={f.minCartValue} onChange={ev => e.updateForm({ minCartValue: ev.target.value })} /></div>}
        <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-500" checked={f.stackable} onChange={ev => e.updateForm({ stackable: ev.target.checked })} />Stackable with other offers</label>
      </div>
      {(issues.length > 0 || e.idConflict) && (
        <ul role="alert" className="mt-3 list-disc space-y-0.5 rounded-lg bg-red-50 p-3 pl-7 text-sm text-red-700">
          {issues.map((i, k) => <li key={k}>{i.message}</li>)}
          {e.idConflict && <li>Rule ID "{e.draft?.success ? e.draft.data.ruleId : ''}" already exists.</li>}
        </ul>
      )}
      {valid && e.impact && e.draft?.success && <div className="mt-3"><RuleImpactAnalysis impact={e.impact} previous={previous} updated={e.draft.data} /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!valid} onClick={() => e.saveEditor()}><Save className="h-4 w-4" />{ed.mode === 'edit' ? 'Confirm & Save' : 'Confirm & Add Rule'}</button>
        <button className="btn-accent" disabled={!valid} onClick={() => e.saveEditor('final')}><Receipt className="h-4 w-4" />Save & Generate Final Price</button>
        <button className="btn-ghost" disabled={!valid} onClick={() => e.saveEditor('report')}><FileBarChart className="h-4 w-4" />Save & Generate Report</button>
        <button className="btn-ghost" onClick={e.cancelEditor}><X className="h-4 w-4" />{ed.mode === 'ai' ? 'Discard' : 'Cancel'}</button>
      </div>
    </div>
  );
}
