import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { Toast } from '../hooks/useDiscountEngine';

export default function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} role="status" className={`flex items-start gap-2 rounded-xl border bg-white p-3 text-sm shadow-lg ${t.kind === 'error' ? 'border-red-200' : t.kind === 'success' ? 'border-emerald-200' : 'border-slate-200'}`}>
          {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : t.kind === 'error' ? <XCircle className="mt-0.5 h-4 w-4 text-red-600" /> : <Info className="mt-0.5 h-4 w-4 text-navy-600" />}
          <p className="flex-1">{t.text}</p>
          <button aria-label="Dismiss" onClick={() => onDismiss(t.id)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>))}
    </div>
  );
}
