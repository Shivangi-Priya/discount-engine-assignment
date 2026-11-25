import { useState } from 'react';
import { HelpCircle, Loader2, Sparkles } from 'lucide-react';

const EXAMPLES = ['20% off for Natura Casa brand, stackable with other offers', 'Rs.100 flat discount on all Flipkart items', '10% off if cart value is more than Rs.5000'];

interface Props {
  loading: boolean;
  message: { kind: 'error' | 'ambiguous'; text: string; missing?: string[] } | null;
  onParse: (text: string) => void;
}
export default function RuleBuilder({ loading, message, onParse }: Props) {
  const [text, setText] = useState('');
  return (
    <div>
      <form onSubmit={e => { e.preventDefault(); if (text.trim()) onParse(text); }} className="flex flex-col gap-2 sm:flex-row">
        <input className="input" value={text} onChange={e => setText(e.target.value)} aria-label="Rule in plain English" placeholder='e.g. "10% off if cart value is more than Rs.5000"' />
        <button className="btn-primary shrink-0" disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Parse Rule
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map(x => <button key={x} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={() => setText(x)}>{x}</button>)}
      </div>
      {loading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-navy-700"><Loader2 className="h-4 w-4 animate-spin" />Parsing your rule locally…</p>}
      {message?.kind === 'ambiguous' && (
        <div role="status" className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-medium">Need a bit more detail</p><p>{message.text}</p>{!!message.missing?.length && <p className="mt-1 text-xs">Missing: {message.missing.join(', ')}</p>}<p className="mt-1 text-xs">No rule was created and your active rules are unchanged.</p></div>
        </div>
      )}
      {message?.kind === 'error' && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message.text} <span className="text-red-600">Your rules and cart are unchanged.</span></p>}
    </div>
  );
}
